import { afterEach, describe, expect, it, jest, spyOn } from 'bun:test';
import { LiveCall } from './live-call';
import { BrowserDeviceAudio } from './browser-audio';
import { dropDecision } from './webrtc-node';
import { Downsampler, FRAME_SAMPLES, FrameAssembler, bytesToSamples, createSinkFramer } from './pcm';

type Listener = (event: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Plays the backend's /voip/stream side of the socket. */
class FakeServerSocket {
  static last: FakeServerSocket | null = null;
  binaryType = 'blob';
  readyState = 0;
  sent: Array<string | Uint8Array> = [];
  private listeners = new Map<string, Listener[]>();
  onControl: (msg: Record<string, unknown>, socket: FakeServerSocket) => void = () => {};

  constructor(readonly url: string) {
    FakeServerSocket.last = this;
    queueMicrotask(() => {
      if (this.readyState !== 0) return; // closed before it opened
      this.readyState = 1;
      this.fire('open', {});
    });
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  send(data: string | Uint8Array) {
    this.sent.push(typeof data === 'string' ? data : new Uint8Array(data));
    if (typeof data === 'string') this.onControl(JSON.parse(data), this);
  }
  close(code = 1000, reason = '') {
    this.readyState = 3;
    this.fire('close', { code, reason });
  }
  fire(type: string, event: unknown) {
    for (const l of this.listeners.get(type) ?? []) l(event);
  }
  pushText(msg: unknown) {
    this.fire('message', { data: JSON.stringify(msg) });
  }
  pushAudio(samples: Int16Array) {
    this.fire('message', { data: samples.buffer.slice(0) });
  }
  controls() {
    return this.sent.filter((d): d is string => typeof d === 'string').map((d) => JSON.parse(d));
  }
  binaries() {
    return this.sent.filter((d): d is Uint8Array => typeof d !== 'string');
  }
}

const WS_URL = 'wss://api.test/voip/stream?callId=C1&token=t';
const tick = () => new Promise((r) => setTimeout(r, 0));

function waitFor<T>(call: LiveCall, event: 'transport' | 'ended' | 'error'): Promise<T> {
  return new Promise((resolve) => call.on(event, resolve as never));
}

describe('pcm', () => {
  it('assembles chunks of any size into 20 ms frames', () => {
    const frames: Int16Array[] = [];
    const a = new FrameAssembler((f) => frames.push(f));
    a.push(new Int16Array(100).fill(1));
    a.push(new Int16Array(600).fill(2));
    expect(frames).toHaveLength(2);
    expect(frames.every((f) => f.length === FRAME_SAMPLES)).toBe(true);
    a.push(new Int16Array(FRAME_SAMPLES - 60));
    expect(frames).toHaveLength(3);
  });

  it('reads misaligned byte views', () => {
    const bytes = new Uint8Array(5);
    new DataView(bytes.buffer).setInt16(1, -2, true);
    expect(Array.from(bytesToSamples(bytes.subarray(1)))).toEqual([-2, 0]);
  });

  it('turns 48 kHz stereo chunks into 16 kHz mono without losing samples at chunk edges', () => {
    const ds = new Downsampler(48000);
    let total = 0;
    for (let i = 0; i < 100; i++) total += ds.process(new Int16Array(480 * 2).fill(300), 2).length; // 10 ms stereo
    expect(total).toBe(16000);
    expect(ds.process(new Int16Array(480 * 2).fill(300), 2)[0]).toBe(300);
  });
});

describe('audio before the answer', () => {
  // Bug: audio sent while ringing is buffered by the call (up to 1 s, never
  // caught up), so the contact heard everything ~1 s late.
  it('is dropped until the call is accepted', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket });
    const server = FakeServerSocket.last!;
    call.sendAudio(new Int16Array(FRAME_SAMPLES * 5));
    expect(server.binaries()).toHaveLength(0);
    server.pushText({ type: 'ringing' });
    call.sendAudio(new Int16Array(FRAME_SAMPLES));
    expect(server.binaries()).toHaveLength(0);
    server.pushText({ type: 'connected' });
    call.sendAudio(new Int16Array(FRAME_SAMPLES));
    expect(server.binaries()).toHaveLength(1);
  });
});

describe('createSinkFramer', () => {
  // Bug: the converter was fixed to the first chunk's rate (a 16 kHz placeholder),
  // so the 48 kHz audio that followed came out as 3x too many frames.
  it('follows the sink switching from its placeholder rate to 48 kHz', () => {
    const frames: Int16Array[] = [];
    const push = createSinkFramer((f) => frames.push(f));
    push({ samples: new Int16Array(160), sampleRate: 16000, channelCount: 1 });
    for (let i = 0; i < 100; i++) push({ samples: new Int16Array(480).fill(100), sampleRate: 48000, channelCount: 1 });
    // 10 ms + 1 s of audio = 16160 samples = 50 full frames at 16 kHz
    expect(frames).toHaveLength(50);
    expect(frames[49][0]).toBe(100);
  });
});

describe('microphone refused', () => {
  // Bug: the mic was asked before the socket opened, so a refusal threw and the
  // placed call kept ringing the contact with nobody on our side to hang up.
  afterEach(() => jest.restoreAllMocks());

  function refuseMic() {
    const denied = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    spyOn(BrowserDeviceAudio, 'open').mockRejectedValue(denied);
  }

  it('hangs up the placed call once the server is ready, then fails with the mic error', async () => {
    refuseMic();
    FakeServerSocket.last = null;
    const connecting = LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, audio: 'device' });
    await tick();
    const server = FakeServerSocket.last!;
    expect(new URL(server.url).searchParams.get('resume')).toBeNull();
    expect(server.controls()).toEqual([]); // nothing before the server is ready
    server.pushText({ type: 'calling' });

    await expect(connecting).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(server.controls()).toEqual([{ type: 'hangup' }]);
    expect(server.readyState).toBe(3);
  });

  it('gives up on a silent server instead of hanging', async () => {
    refuseMic();
    jest.useFakeTimers();
    try {
      const connecting = LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, audio: 'device' });
      const outcome = connecting.catch((err: Error) => err.name);
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(5000);
      expect(await outcome).toBe('NotAllowedError');
      expect(FakeServerSocket.last!.readyState).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('LiveCall over WebSocket (default)', () => {
  it('streams audio both ways and reports the call lifecycle', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket });
    const server = FakeServerSocket.last!;
    expect(new URL(server.url).searchParams.get('resume')).toBe('1');
    expect(call.transport).toBe('websocket');

    const heard: Int16Array[] = [];
    const events: string[] = [];
    call.on('audio', (f) => heard.push(f));
    call.on('event', (e) => events.push(e.type));

    server.pushAudio(new Int16Array(FRAME_SAMPLES).fill(7));
    call.sendAudio(new Int16Array(FRAME_SAMPLES)); // ringing: dropped
    server.pushText({ type: 'accepted' });
    call.sendAudio(new Int16Array(FRAME_SAMPLES * 2 + 10));

    expect(heard[0][0]).toBe(7);
    expect(server.binaries().map((b) => b.byteLength)).toEqual([640, 640]);

    const ended = waitFor<{ type: string }>(call, 'ended');
    server.pushText({ type: 'ended', reason: 'peer' });
    expect((await ended).type).toBe('ended');
    expect(events).toEqual(['accepted', 'ended']);
  });

  it('sends mute and hangup as control messages', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket });
    call.mute(true);
    call.hangup();
    expect(FakeServerSocket.last!.controls()).toEqual([{ type: 'mute', muted: true }, { type: 'hangup' }]);
  });

  // Live phone calls mute on the client only: the server ignores the control there.
  it('stops sending audio while muted', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket });
    FakeServerSocket.last!.pushText({ type: 'accepted' });
    call.mute(true);
    call.sendAudio(new Int16Array(FRAME_SAMPLES));
    expect(FakeServerSocket.last!.binaries()).toHaveLength(0);
    call.mute(false);
    call.sendAudio(new Int16Array(FRAME_SAMPLES));
    expect(FakeServerSocket.last!.binaries()).toHaveLength(1);
  });
});

describe('LiveCall asking for WebRTC', () => {
  it('stays on the WebSocket, audio untouched, when the server has no WebRTC', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, transport: 'webrtc' });
    const server = FakeServerSocket.last!;
    const change = waitFor<{ transport: string; reason?: string }>(call, 'transport');
    await tick();
    expect(server.controls()[0]).toEqual({ type: 'webrtc.config' });
    server.pushText({ type: 'webrtc.error', code: 'unavailable' });

    expect(await change).toEqual({ transport: 'websocket', reason: 'unavailable' });
    server.pushText({ type: 'accepted' });
    call.sendAudio(new Int16Array(FRAME_SAMPLES));
    expect(server.binaries()).toHaveLength(1);
    expect(server.controls().some((c) => c.type === 'media')).toBe(false);
  });

  it('falls back when the optional WebRTC package is not installed', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, transport: 'webrtc' });
    const change = waitFor<{ transport: string; reason?: string }>(call, 'transport');
    await tick();
    FakeServerSocket.last!.pushText({ type: 'webrtc.config', iceServers: [] });
    // @roamhq/wrtc is an optional peer, not installed in this repo.
    expect(await change).toEqual({ transport: 'websocket', reason: 'missing_dependency' });
  });

  it('with fallback off, fails the call instead of staying on the WebSocket', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, transport: 'webrtc', fallback: false });
    const server = FakeServerSocket.last!;
    const failed = waitFor<Error>(call, 'error');
    await tick();
    server.pushText({ type: 'webrtc.error', code: 'at_capacity' });
    expect((await failed).message).toContain('at_capacity');
    expect(server.readyState).toBe(3);
  });
});

describe('WebRTC drops and retries', () => {
  it('treats a lasting disconnect as a drop, not only failed', () => {
    expect(dropDecision('failed')).toBe('now');
    expect(dropDecision('closed')).toBe('now');
    expect(dropDecision('disconnected')).toBe('soon');
    expect(dropDecision('connected')).toBe('no');
  });

  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  it('retries WebRTC after a transient failure, reporting the fallback once', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, transport: 'webrtc' });
    jest.useFakeTimers();
    try {
      const server = FakeServerSocket.last!;
      let configs = 0;
      server.onControl = (msg, s) => {
        if (msg.type !== 'webrtc.config') return;
        configs++;
        queueMicrotask(() => s.pushText({ type: 'webrtc.error', code: 'gateway_error' }));
      };
      const changes: unknown[] = [];
      call.on('transport', (t) => changes.push(t));
      await flush();
      server.pushText({ type: 'webrtc.error', code: 'gateway_error' }); // answers the first config
      await flush();

      jest.advanceTimersByTime(1999);
      await flush();
      expect(configs).toBe(0); // the first config went out before onControl was set
      jest.advanceTimersByTime(1);
      await flush();
      expect(configs).toBe(1); // retried after 2 s
      jest.advanceTimersByTime(4000);
      await flush();
      expect(configs).toBe(2); // then after 4 s
      expect(changes).toEqual([{ transport: 'websocket', reason: 'gateway_error' }]);
      call.close();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not retry when the server has no WebRTC', async () => {
    const call = await LiveCall.connect('C1', WS_URL, { WebSocket: FakeServerSocket, transport: 'webrtc' });
    jest.useFakeTimers();
    try {
      const server = FakeServerSocket.last!;
      await flush();
      server.pushText({ type: 'webrtc.error', code: 'unavailable' });
      await flush();
      jest.advanceTimersByTime(120000);
      await flush();
      expect(server.controls().filter((c) => c.type === 'webrtc.config')).toHaveLength(1);
      call.close();
    } finally {
      jest.useRealTimers();
    }
  });
});
