import { afterEach, describe, expect, it } from 'bun:test';
import { DApiClient } from '../client';
import { CallsModule } from '../modules/calls';
import type { IncomingCall } from './incoming';

type Listener = (event: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

class FakeEventsSocket {
  static all: FakeEventsSocket[] = [];
  binaryType = 'blob';
  readyState = 1;
  private listeners = new Map<string, Listener[]>();
  constructor(readonly url: string) {
    FakeEventsSocket.all.push(this);
  }
  addEventListener(type: string, l: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), l]);
  }
  send() {}
  close(code = 1000) {
    this.readyState = 3;
    for (const l of this.listeners.get('close') ?? []) l({ code });
  }
  push(msg: unknown) {
    for (const l of this.listeners.get('message') ?? []) l({ data: JSON.stringify(msg) });
  }
}

const realSetTimeout = globalThis.setTimeout;
const realFetch = globalThis.fetch;
afterEach(() => {
  FakeEventsSocket.all = [];
  globalThis.setTimeout = realSetTimeout;
  globalThis.fetch = realFetch;
});

function calls() {
  return new CallsModule(new DApiClient({ apiKey: 'key|7', baseUrl: 'https://api.test' }));
}

describe('calls.listen', () => {
  it('subscribes with the API key and hands out ringing calls', async () => {
    const incoming = await calls().listen({ sessionIds: ['s1', 's2'], WebSocket: FakeEventsSocket });
    const url = new URL(FakeEventsSocket.all[0].url);
    expect(url.protocol).toBe('wss:');
    expect(url.pathname).toBe('/voip/events');
    expect(url.searchParams.get('sessions')).toBe('s1,s2');
    expect(url.searchParams.get('token')).toBe('key|7');

    const rang: IncomingCall[] = [];
    const withdrawn: string[] = [];
    incoming.on('call', (c) => rang.push(c));
    incoming.on('withdrawn', (e) => withdrawn.push(e.type));
    FakeEventsSocket.all[0].push({ type: 'call.offer', sessionId: 's1', callId: 'C9', from: '5511999', timestamp: 1 });
    FakeEventsSocket.all[0].push({ type: 'call.ended', sessionId: 's1', callId: 'C9', timestamp: 2 });

    expect(rang.map((c) => [c.sessionId, c.callId, c.from])).toEqual([['s1', 'C9', '5511999']]);
    expect(withdrawn).toEqual(['call.ended']);
    incoming.close();
  });

  it('rejects through the API with the caller number', async () => {
    const posted: unknown[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(init.body as string));
      return Response.json({ success: true });
    }) as unknown as typeof fetch;
    const incoming = await calls().listen({ sessionIds: ['s1'], WebSocket: FakeEventsSocket });
    let offer: IncomingCall | undefined;
    incoming.on('call', (c) => (offer = c));
    FakeEventsSocket.all[0].push({ type: 'call.offer', sessionId: 's1', callId: 'C9', from: '5511999', timestamp: 1 });
    await offer!.reject();
    expect(posted).toEqual([{ sessionId: 's1', callId: 'C9', from: '5511999' }]);
  });

  it('reconnects after a drop, but not after the server refused it', async () => {
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout;
    const incoming = await calls().listen({ sessionIds: ['s1'], WebSocket: FakeEventsSocket });
    FakeEventsSocket.all[0].close(1006);
    expect(FakeEventsSocket.all).toHaveLength(2);
    FakeEventsSocket.all[1].close(1008); // unauthorized
    expect(FakeEventsSocket.all).toHaveLength(2);
    incoming.close();
  });
});

describe('voice.live', () => {
  it('starts a live phone call and opens the same LiveCall media', async () => {
    const { VoiceModule } = await import('../modules/voice');
    const posted: Array<{ url: string; body: unknown }> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      posted.push({ url: String(url), body: JSON.parse(init.body as string) });
      return Response.json({ success: true, callId: 'L1', wsUrl: 'wss://api.test/voip/stream?callId=L1&token=t', token: 't' });
    }) as unknown as typeof fetch;
    const voice = new VoiceModule(new DApiClient({ apiKey: 'k', baseUrl: 'https://api.test' }));
    const call = await voice.live({ to: '5511999999999' }, { WebSocket: FakeOpenSocket });
    expect(posted).toEqual([{ url: 'https://api.test/api/v1/voice/live/start', body: { to: '5511999999999' } }]);
    expect(call.callId).toBe('L1');
    expect(call.transport).toBe('websocket');
  });
});

class FakeOpenSocket extends FakeEventsSocket {
  constructor(url: string) {
    super(url);
    queueMicrotask(() => {
      for (const l of (this as unknown as { listeners: Map<string, Listener[]> }).listeners.get('open') ?? []) l({});
    });
  }
}
