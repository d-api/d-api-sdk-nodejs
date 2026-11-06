import type {
  CallEvent,
  CallMediaOptions,
  CallMediaTransport,
  CallRecording,
  CallTransportChange,
} from '../types/calls';
import { Emitter } from './emitter';
import { FRAME_SAMPLES, FrameAssembler, bytesToSamples, samplesToBytes, toSamples } from './pcm';
import { NodeWebRtcMedia, WebRtcSetupError, isNode, type IceServer, type WebRtcMedia } from './webrtc-node';
import { BrowserWebRtcMedia } from './webrtc-browser';
import { BrowserDeviceAudio } from './browser-audio';
import { resolveWebSocket, type WsCtor, type WsLike } from './ws';

export interface LiveCallEvents {
  /** Lifecycle event (`calling`, `ringing`, `accepted`, `connected`, ...). */
  event: CallEvent;
  /** 20 ms of the contact's audio: 320 samples, s16, 16 kHz, mono. */
  audio: Int16Array;
  /** The audio moved between WebSocket and WebRTC. */
  transport: CallTransportChange;
  /** The call's recording is ready (sent after the call ends). */
  recording: CallRecording;
  /** The call is over (`ended` or `not_answered`). */
  ended: CallEvent;
  error: Error;
  /** The media socket closed for good. */
  close: { code: number; reason: string };
}

const SIGNAL_TIMEOUT_MS = 8000;
// Back on WebRTC after a fallback: first retry soon, then back off.
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 30000;
// Reasons that won't change during the call: retrying would only repeat them.
const PERMANENT_FAILURES = new Set(['unavailable', 'missing_dependency', 'unsupported_runtime', 'invalid_offer']);
// Under the server's 20 s grace for a dropped socket.
const RECONNECT_BUDGET_MS = 18000;
const RECONNECT_MAX_DELAY_MS = 2000;
// Normal close, policy violation (auth): the server will not take the call back.
const FINAL_CLOSE_CODES = new Set([1000, 1008]);
// How long to wait for the server before giving up on hanging up an abandoned call.
const ABANDON_TIMEOUT_MS = 5000;

type SignalType = 'webrtc.config' | 'webrtc.answer';
interface Pending {
  resolve: (msg: Record<string, unknown>) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function isBrowser(): boolean {
  return !isNode() && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

function withQuery(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

/**
 * Hang up a call we can't take, best-effort and bounded: never throws. Without
 * `resume`, so the server ends it on close. It waits for the first event: the
 * server ignores frames until it has authorized the socket.
 */
function abandonCall(wsUrl: string, WebSocketImpl: WsCtor): Promise<void> {
  return new Promise((resolve) => {
    let ws: WsLike;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      clearTimeout(timer);
      try {
        ws?.close(1000, 'client_abandon');
      } catch {
        // already closed
      }
      resolve();
    };
    try {
      ws = new WebSocketImpl(wsUrl);
    } catch {
      resolve();
      return;
    }
    timer = setTimeout(finish, ABANDON_TIMEOUT_MS);
    ws.addEventListener('message', (event: { data: unknown }) => {
      if (typeof event.data !== 'string') return;
      try {
        ws.send(JSON.stringify({ type: 'hangup' }));
      } finally {
        finish();
      }
    });
    ws.addEventListener('error', finish);
    ws.addEventListener('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * A WhatsApp call's real-time audio. The WebSocket always carries the control
 * (events, mute, hangup). The audio rides it too, unless `transport: 'webrtc'`
 * moves it to a WebRTC peer, with the WebSocket as the fallback. The API is the
 * same either way: `on('audio')` to listen, `sendAudio()` to speak.
 */
export class LiveCall extends Emitter<LiveCallEvents> {
  private ws: WsLike | null = null;
  private media: CallMediaTransport = 'websocket';
  private rtc: WebRtcMedia | null = null;
  private device: BrowserDeviceAudio | null = null;
  /** The other side answered; device audio holds the mic until then. */
  private answered = false;
  private retryDelay = RETRY_MIN_MS;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** The caller was already told the call is on the WebSocket and why. */
  private fallbackReported = false;
  private readonly uplink: FrameAssembler;
  private readonly pending = new Map<SignalType, Pending>();
  private ended = false;
  private muted = false;
  private closedByUs = false;
  private droppedAt: number | null = null;
  private readonly opts: Required<Pick<CallMediaOptions, 'transport' | 'fallback' | 'webrtcConnectTimeoutMs' | 'resume' | 'audio'>>;

  private constructor(
    readonly callId: string,
    private readonly url: string,
    private readonly WebSocketImpl: WsCtor,
    options: CallMediaOptions
  ) {
    super();
    this.opts = {
      transport: options.transport ?? 'websocket',
      fallback: options.fallback ?? true,
      webrtcConnectTimeoutMs: options.webrtcConnectTimeoutMs ?? 10000,
      resume: options.resume ?? true,
      audio: options.audio ?? (isBrowser() ? 'device' : 'pcm'),
    };
    this.uplink = new FrameAssembler((frame) => this.sendFrame(frame));
  }

  /** Open the media socket of a call placed with `calls.stream()` / `calls.accept()`. */
  static async connect(callId: string, wsUrl: string, options: CallMediaOptions = {}): Promise<LiveCall> {
    const WebSocketImpl = await resolveWebSocket(options.WebSocket);
    const url = options.resume === false ? wsUrl : withQuery(wsUrl, 'resume', '1');
    const call = new LiveCall(callId, url, WebSocketImpl, options);
    if (call.opts.audio === 'device') {
      // Asks for the microphone before dialling the media: a refusal fails here, not mid-call.
      try {
        call.device = await BrowserDeviceAudio.open((frame) => call.onMicFrame(frame), {
          microphoneDeviceId: options.microphoneDeviceId,
          speakerDeviceId: options.speakerDeviceId,
          workletUrl: options.workletUrl,
        });
      } catch (err) {
        // The call is already ringing on the other side; without this it rings on with nobody here.
        await abandonCall(wsUrl, WebSocketImpl);
        throw err;
      }
    }
    try {
      await call.open();
    } catch (err) {
      call.closeDevice();
      throw err;
    }
    if (call.opts.transport === 'webrtc') void call.upgradeToWebRtc();
    return call;
  }

  /** Where the audio is flowing right now. */
  get transport(): CallMediaTransport {
    return this.media;
  }

  /**
   * Send your audio: s16 PCM, 16 kHz, mono, as samples or raw little-endian
   * bytes, in chunks of any size. Feed it at real-time pace.
   *
   * Audio sent before the other side answers (`accepted`) is dropped: the call
   * buffers it and it would play late for the rest of the call.
   */
  sendAudio(audio: Int16Array | ArrayBuffer | ArrayBufferView): void {
    if (this.ended || !this.answered) return;
    this.uplink.push(toSamples(audio));
  }

  /**
   * Stop (or resume) sending your audio. It is also enforced here, not only by
   * the server: live phone calls mute on the client side.
   */
  mute(muted: boolean): void {
    this.muted = muted;
    this.device?.setMuted(muted);
    this.sendControl({ type: 'mute', muted });
  }

  /** End the call. `ended` and `close` follow. */
  hangup(): void {
    this.sendControl({ type: 'hangup' });
  }

  /** Close the media (ends the call too). */
  close(): void {
    this.closedByUs = true;
    this.stopRetry();
    this.teardownRtc();
    this.closeDevice();
    this.ws?.close(1000, 'client_close');
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new this.WebSocketImpl(this.url);
      ws.binaryType = 'arraybuffer';
      let opened = false;
      ws.addEventListener('open', () => {
        opened = true;
        this.ws = ws;
        this.droppedAt = null;
        if (this.media === 'webrtc') this.sendControl({ type: 'media', transport: 'webrtc' });
        resolve();
      });
      ws.addEventListener('message', (event: { data: unknown }) => this.onMessage(event.data));
      ws.addEventListener('error', () => {
        if (!opened) reject(new Error('Could not open the call media socket'));
      });
      ws.addEventListener('close', (event: { code: number; reason: string }) => {
        if (!opened) return;
        void this.onClose(ws, event.code, event.reason);
      });
    });
  }

  private onMessage(data: unknown): void {
    if (typeof data !== 'string') {
      if (this.media !== 'websocket') return;
      const frame = bytesToSamples(data as ArrayBuffer);
      this.device?.play(frame);
      this.emit('audio', frame);
      return;
    }
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(msg.type ?? '');
    switch (type) {
      case 'webrtc.config':
      case 'webrtc.answer':
        this.settle(type, msg);
        return;
      case 'webrtc.error':
        this.failPending(new WebRtcSetupError(String(msg.code ?? 'webrtc_error'), `WebRTC refused: ${String(msg.code)}`));
        return;
      case 'recording':
        this.emit('recording', { url: String(msg.url ?? ''), files: msg.files as Record<string, string> | undefined });
        return;
      case 'error':
        this.emit('error', new Error(`${String(msg.code ?? 'error')}: ${String(msg.msg ?? '')}`));
        return;
    }
    const event = msg as CallEvent;
    if (type === 'accepted' || type === 'connected') this.answered = true;
    this.emit('event', event);
    if (type === 'ended' || type === 'not_answered') {
      this.ended = true;
      this.stopRetry();
      this.teardownRtc();
      this.closeDevice();
      this.emit('ended', event);
    }
  }

  private async onClose(ws: WsLike, code: number, reason: string): Promise<void> {
    if (this.ws !== ws) return;
    this.ws = null;
    const resumable = this.opts.resume && !this.ended && !this.closedByUs && !FINAL_CLOSE_CODES.has(code);
    if (resumable && (await this.reconnect())) return;
    this.stopRetry();
    this.teardownRtc();
    this.closeDevice();
    this.failPending(new Error('media socket closed'));
    this.emit('close', { code, reason });
  }

  /** The server parks a dropped call for ~20 s; retry within that window. */
  private async reconnect(): Promise<boolean> {
    this.droppedAt ??= Date.now();
    for (let attempt = 0; Date.now() - this.droppedAt < RECONNECT_BUDGET_MS; attempt++) {
      await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** attempt, RECONNECT_MAX_DELAY_MS)));
      if (this.closedByUs) return false;
      try {
        await this.open();
        return true;
      } catch {
        // keep trying until the budget runs out
      }
    }
    return false;
  }

  private async upgradeToWebRtc(): Promise<void> {
    try {
      const config = await this.signal('webrtc.config', { type: 'webrtc.config' });
      const iceServers = (config.iceServers as IceServer[]) ?? [];
      const rtc: WebRtcMedia = this.device
        ? await BrowserWebRtcMedia.create(iceServers, this.device.microphone, this.device.speakerDeviceId)
        : await NodeWebRtcMedia.create(iceServers, (frame) => {
            if (this.media === 'webrtc') this.emit('audio', frame);
          });
      this.rtc = rtc;
      const answer = await this.signal('webrtc.answer', { type: 'webrtc.offer', sdp: await rtc.createOffer() });
      await rtc.acceptAnswer(String(answer.sdp));
      await rtc.waitConnected(this.opts.webrtcConnectTimeoutMs);
      if (this.ended || this.rtc !== rtc) return;

      rtc.onDrop((why) => this.fallBack(why));
      this.retryDelay = RETRY_MIN_MS;
      this.fallbackReported = false;
      this.media = 'webrtc';
      this.sendControl({ type: 'media', transport: 'webrtc' });
      this.emit('transport', { transport: 'webrtc' });
    } catch (err) {
      this.fallBack(err instanceof WebRtcSetupError ? err.reason : 'webrtc_error', err as Error);
    }
  }

  private fallBack(reason: string, cause?: Error): void {
    if (this.ended) return;
    const wasOnWebRtc = this.media === 'webrtc';
    this.teardownRtc();
    this.media = 'websocket';
    if (wasOnWebRtc) this.sendControl({ type: 'media', transport: 'websocket' });
    // A failed retry while already on the WebSocket changes nothing for the caller.
    if (wasOnWebRtc || !this.fallbackReported) {
      this.fallbackReported = true;
      this.emit('transport', { transport: 'websocket', reason });
    }
    if (!this.opts.fallback) {
      this.emit('error', cause ?? new Error(`WebRTC unavailable: ${reason}`));
      this.close();
      return;
    }
    if (!PERMANENT_FAILURES.has(reason)) this.scheduleRetry();
  }

  /** Try WebRTC again in the background; the call keeps flowing on the WebSocket meanwhile. */
  private scheduleRetry(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.ended || this.closedByUs || this.media === 'webrtc') return;
      void this.upgradeToWebRtc();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, RETRY_MAX_MS);
  }

  /** Device mode: the mic goes out only once the other side answered (as in the doc's flow). */
  private onMicFrame(frame: Int16Array): void {
    if (this.answered && !this.ended) this.sendFrame(frame);
  }

  private closeDevice(): void {
    this.device?.close();
    this.device = null;
  }

  private stopRetry(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  private teardownRtc(): void {
    this.rtc?.close();
    this.rtc = null;
  }

  private signal(type: SignalType, request: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(type);
        reject(new WebRtcSetupError('signal_timeout', `no ${type} from the server`));
      }, SIGNAL_TIMEOUT_MS);
      this.pending.set(type, { resolve, reject, timer });
      this.sendControl(request);
    });
  }

  private settle(type: SignalType, msg: Record<string, unknown>): void {
    const p = this.pending.get(type);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(type);
    p.resolve(msg);
  }

  private failPending(err: Error): void {
    for (const [type, p] of this.pending) {
      clearTimeout(p.timer);
      this.pending.delete(type);
      p.reject(err);
    }
  }

  private sendFrame(frame: Int16Array): void {
    if (this.muted) return;
    if (this.media === 'webrtc' && this.rtc) {
      this.rtc.write(frame);
      return;
    }
    if (this.ws?.readyState === 1 && frame.length === FRAME_SAMPLES) this.ws.send(samplesToBytes(frame));
  }

  private sendControl(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }
}
