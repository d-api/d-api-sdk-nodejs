import { createSinkFramer } from './pcm';

// Loaded only when a call asks for WebRTC, so the SDK never requires it.
const WRTC_MODULE = '@roamhq/wrtc';
const GATHER_TIMEOUT_MS = 3000;
// libwebrtc's audio source takes exactly 10 ms per push.
const PUSH_SAMPLES = 160;

export class WebRtcSetupError extends Error {
  constructor(readonly reason: string, message: string) {
    super(message);
    this.name = 'WebRtcSetupError';
  }
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * `disconnected` often heals by itself (a Wi-Fi blip), so it gets a short grace;
 * past it the audio is already gone and waiting for `failed` (up to ~30 s in
 * browsers) only stretches the silence before the WebSocket takes over.
 */
export const DISCONNECT_GRACE_MS = 2000;

export function dropDecision(state: string): 'now' | 'soon' | 'no' {
  if (state === 'failed' || state === 'closed') return 'now';
  return state === 'disconnected' ? 'soon' : 'no';
}

/** The audio half of a call over WebRTC; signalling is LiveCall's. */
export interface WebRtcMedia {
  createOffer(): Promise<string>;
  acceptAnswer(sdp: string): Promise<void>;
  waitConnected(timeoutMs: number): Promise<void>;
  onDrop(listener: (reason: string) => void): void;
  write(frame: Int16Array): void;
  close(): void;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- @roamhq/wrtc ships no types */
interface Wrtc {
  RTCPeerConnection: new (config: { iceServers: IceServer[] }) => any;
  nonstandard: { RTCAudioSource: new () => any; RTCAudioSink: new (track: any) => any };
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

async function loadWrtc(): Promise<Wrtc> {
  if (!isNode()) {
    // The PCM-in/PCM-out WebRTC transport is Node's; browsers keep the WebSocket.
    throw new WebRtcSetupError('unsupported_runtime', 'transport "webrtc" is available on Node only');
  }
  const specifier: string = WRTC_MODULE;
  try {
    const mod = await import(specifier);
    return (mod.default ?? mod) as Wrtc;
  } catch {
    throw new WebRtcSetupError(
      'missing_dependency',
      `transport "webrtc" on Node needs the optional package ${WRTC_MODULE} (npm install ${WRTC_MODULE})`
    );
  }
}

/**
 * The audio half of a call over WebRTC on Node: a peer whose outgoing track is
 * fed with the caller's PCM and whose incoming track is turned back into
 * 20 ms, 16 kHz frames. Signalling is done by the caller (LiveCall).
 */
export class NodeWebRtcMedia implements WebRtcMedia {
  private sink: any = null;
  private dropListener: ((reason: string) => void) | null = null;
  private dropTimer: ReturnType<typeof setTimeout> | undefined;

  private constructor(
    private readonly pc: any,
    private readonly source: any,
    private readonly track: any
  ) {}

  static async create(iceServers: IceServer[], onAudio: (frame: Int16Array) => void): Promise<NodeWebRtcMedia> {
    const wrtc = await loadWrtc();
    const pc = new wrtc.RTCPeerConnection({ iceServers });
    const source = new wrtc.nonstandard.RTCAudioSource();
    const track = source.createTrack();
    pc.addTrack(track);

    const media = new NodeWebRtcMedia(pc, source, track);
    pc.ontrack = (event: { track: any }) => media.attachSink(wrtc, event.track, onAudio);
    pc.onconnectionstatechange = () => media.watchDrop(pc.connectionState as string);
    return media;
  }

  private attachSink(wrtc: Wrtc, track: any, onAudio: (frame: Int16Array) => void): void {
    if (this.sink || track.kind !== 'audio') return;
    this.sink = new wrtc.nonstandard.RTCAudioSink(track);
    this.sink.ondata = createSinkFramer(onAudio);
  }

  /** Full offer, candidates included: the gateway does not take trickle ICE. */
  async createOffer(): Promise<string> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.gathered();
    return this.pc.localDescription.sdp as string;
  }

  private gathered(): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, GATHER_TIMEOUT_MS); // answer with what was found
      this.pc.onicegatheringstatechange = () => {
        if (this.pc.iceGatheringState !== 'complete') return;
        clearTimeout(timer);
        resolve();
      };
    });
  }

  async acceptAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
  }

  waitConnected(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new WebRtcSetupError('ice_timeout', 'WebRTC did not connect in time')), timeoutMs);
      const check = () => {
        const state = this.pc.connectionState as string;
        if (state === 'connected') {
          clearTimeout(timer);
          resolve();
        } else if (state === 'failed' || state === 'closed') {
          clearTimeout(timer);
          reject(new WebRtcSetupError(`webrtc_${state}`, `WebRTC ${state}`));
        }
      };
      const previous = this.pc.onconnectionstatechange;
      this.pc.onconnectionstatechange = () => {
        previous?.();
        check();
      };
      check();
    });
  }

  /** Called once if the peer fails after it connected. */
  onDrop(listener: (reason: string) => void): void {
    this.dropListener = listener;
  }

  private watchDrop(state: string): void {
    const drop = dropDecision(state);
    clearTimeout(this.dropTimer);
    if (drop === 'now') this.dropListener?.(`webrtc_${state}`);
    else if (drop === 'soon') this.dropTimer = setTimeout(() => this.dropListener?.('webrtc_disconnected'), DISCONNECT_GRACE_MS);
  }

  /** One 20 ms frame of the caller's audio. */
  write(frame: Int16Array): void {
    for (let off = 0; off + PUSH_SAMPLES <= frame.length; off += PUSH_SAMPLES) {
      this.source.onData({
        samples: frame.slice(off, off + PUSH_SAMPLES),
        sampleRate: 16000,
        bitsPerSample: 16,
        channelCount: 1,
        numberOfFrames: PUSH_SAMPLES,
      });
    }
  }

  close(): void {
    this.dropListener = null;
    clearTimeout(this.dropTimer);
    this.sink?.stop();
    this.track.stop();
    this.pc.close();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
