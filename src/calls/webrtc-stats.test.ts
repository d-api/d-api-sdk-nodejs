import { afterEach, describe, expect, it, jest, spyOn } from 'bun:test';
import { LiveCall } from './live-call';
import { NodeWebRtcMedia, type WebRtcMedia } from './webrtc-node';
import { looksBluetooth, summarizeStats } from './webrtc-stats';

type Listener = (event: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

class Socket {
  static last: Socket;
  binaryType = 'blob';
  readyState = 0;
  sent: string[] = [];
  private listeners = new Map<string, Listener[]>();
  constructor(readonly url: string) {
    Socket.last = this;
    queueMicrotask(() => {
      this.readyState = 1;
      this.fire('open', {});
    });
  }
  addEventListener(type: string, l: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), l]);
  }
  send(data: string) {
    if (typeof data !== 'string') return;
    this.sent.push(data);
    const msg = JSON.parse(data);
    if (msg.type === 'webrtc.config') queueMicrotask(() => this.push({ type: 'webrtc.config', iceServers: [] }));
    if (msg.type === 'webrtc.offer') queueMicrotask(() => this.push({ type: 'webrtc.answer', sdp: 'v=0' }));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.fire('close', { code, reason: '' });
  }
  fire(type: string, event: unknown) {
    for (const l of this.listeners.get(type) ?? []) l(event);
  }
  push(msg: unknown) {
    this.fire('message', { data: JSON.stringify(msg) });
  }
  statsSent() {
    return this.sent.map((d) => JSON.parse(d)).filter((m) => m.type === 'webrtc.stats');
  }
}

const INBOUND = {
  id: 'in',
  type: 'inbound-rtp',
  kind: 'audio',
  totalSamplesReceived: 480000,
  concealedSamples: 9600,
  silentConcealedSamples: 4800,
  concealmentEvents: 12,
  insertedSamplesForDeceleration: 2400,
  removedSamplesForAcceleration: 1200,
  jitterBufferDelay: 40,
  jitterBufferEmittedCount: 500,
  packetsReceived: 500,
  packetsLost: 3,
  jitter: 0.0183,
};

describe('summarizeStats', () => {
  it('sums the incoming audio and takes the RTT of the selected pair', () => {
    const report = [
      INBOUND,
      { id: 'out', type: 'outbound-rtp', kind: 'audio', packetsSent: 1 },
      { id: 't', type: 'transport', selectedCandidatePairId: 'p2' },
      { id: 'p1', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: 0.9 },
      { id: 'p2', type: 'candidate-pair', currentRoundTripTime: 0.0421 },
    ];
    expect(summarizeStats(report)).toEqual({
      samplesReceived: 480000,
      concealedSamples: 9600,
      silentConcealedSamples: 4800,
      concealmentEvents: 12,
      insertedSamples: 2400,
      removedSamples: 1200,
      jitterBufferMs: 80,
      packetsReceived: 500,
      packetsLost: 3,
      jitterMs: 18.3,
      rttMs: 42.1,
    });
  });

  it('is null before any audio arrives and ignores garbage values', () => {
    expect(summarizeStats([{ id: 'x', type: 'outbound-rtp', kind: 'audio' }])).toBeNull();
    const odd = summarizeStats([{ ...INBOUND, packetsLost: -2, jitter: Number.NaN, jitterBufferEmittedCount: 0 }]);
    expect(odd).toMatchObject({ packetsLost: 0, jitterMs: 0, jitterBufferMs: 0 });
    expect(odd).not.toHaveProperty('rttMs');
  });
});

describe('looksBluetooth', () => {
  it('spots common headset labels', () => {
    expect(looksBluetooth('AirPods Pro')).toBe(true);
    expect(looksBluetooth('Headset (WH-1000XM4 Hands-Free AG Audio)')).toBe(true);
    expect(looksBluetooth('Fones de ouvido (Realtek(R) Audio)')).toBe(false);
    expect(looksBluetooth('MacBook Pro Microphone')).toBe(false);
  });
});

describe('LiveCall quality stats', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };

  function fakeMedia(stats?: () => Promise<unknown>): WebRtcMedia {
    return {
      createOffer: async () => 'v=0 offer',
      acceptAnswer: async () => undefined,
      waitConnected: async () => undefined,
      onDrop: () => undefined,
      write: () => undefined,
      close: () => undefined,
      ...(stats ? { stats: stats as WebRtcMedia['stats'] } : {}),
    };
  }

  async function onWebRtc(media: WebRtcMedia) {
    spyOn(NodeWebRtcMedia, 'create').mockResolvedValue(media as NodeWebRtcMedia);
    const call = await LiveCall.connect('C1', 'wss://api.test/voip/stream?callId=C1', { WebSocket: Socket, transport: 'webrtc' });
    jest.useFakeTimers();
    await flush();
    expect(call.transport).toBe('webrtc');
    return call;
  }

  it('sends the summary every 5 s while on WebRTC and stops when the call ends', async () => {
    const summary = summarizeStats([INBOUND]);
    await onWebRtc(fakeMedia(async () => summary));
    jest.advanceTimersByTime(5000);
    await flush();
    jest.advanceTimersByTime(5000);
    await flush();
    expect(Socket.last.statsSent()).toEqual([
      { type: 'webrtc.stats', stats: summary },
      { type: 'webrtc.stats', stats: summary },
    ]);

    Socket.last.push({ type: 'ended' });
    jest.advanceTimersByTime(20000);
    await flush();
    expect(Socket.last.statsSent()).toHaveLength(2);
  });

  it('keeps the call going when getStats fails or the transport has none', async () => {
    const call = await onWebRtc(fakeMedia(async () => {
      throw new Error('boom');
    }));
    jest.advanceTimersByTime(15000);
    await flush();
    expect(Socket.last.statsSent()).toHaveLength(0);
    expect(call.transport).toBe('webrtc');
    call.close();

    await onWebRtc(fakeMedia());
    jest.advanceTimersByTime(15000);
    await flush();
    expect(Socket.last.statsSent()).toHaveLength(0);
  });
});
