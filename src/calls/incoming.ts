import type { CallMediaOptions, IncomingCallEvent } from '../types/calls';
import { Emitter } from './emitter';
import type { LiveCall } from './live-call';
import { resolveWebSocket, type WsCtor, type WsLike } from './ws';

/** A ringing call. Answer it, reject it, or let it go (it is withdrawn on its own). */
export interface IncomingCall {
  sessionId: string;
  callId: string;
  from?: string;
  timestamp: number;
  answer(media?: CallMediaOptions): Promise<LiveCall>;
  reject(): Promise<void>;
}

export interface IncomingCallsEvents {
  /** A call is ringing on one of the watched connections. */
  call: IncomingCall;
  /** A ringing call is gone before you answered: the caller hung up, or it was taken on another device. */
  withdrawn: IncomingCallEvent;
  /** Subscribed (again, after a reconnect). */
  ready: { sessionIds: string[]; rejected: string[] };
  error: Error;
}

export interface IncomingCallActions {
  answer(event: IncomingCallEvent, media?: CallMediaOptions): Promise<LiveCall>;
  reject(event: IncomingCallEvent): Promise<void>;
}

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
// Refused for good (auth, bad request): retrying only hammers the API.
const FINAL_CLOSE_CODES = new Set([1000, 1008]);
const WITHDRAWN = new Set(['call.accepted', 'call.ended', 'call.rejected']);

/**
 * Watches connections for incoming WhatsApp calls over `/voip/events` and keeps
 * the subscription alive across drops. Offers arrive live only: an offer that
 * rang while the socket was down is not replayed (it would be stale).
 */
export class IncomingCalls extends Emitter<IncomingCallsEvents> {
  private ws: WsLike | null = null;
  private closed = false;
  private delay = MIN_RECONNECT_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor(
    private readonly url: string,
    private readonly WebSocketImpl: WsCtor,
    private readonly actions: IncomingCallActions
  ) {
    super();
  }

  static async open(url: string, actions: IncomingCallActions, WebSocketImpl?: unknown): Promise<IncomingCalls> {
    const listener = new IncomingCalls(url, await resolveWebSocket(WebSocketImpl), actions);
    listener.connect();
    return listener;
  }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close(1000, 'client_close');
  }

  private connect(): void {
    const ws = new this.WebSocketImpl(this.url);
    this.ws = ws;
    ws.addEventListener('message', (event: { data: unknown }) => {
      if (typeof event.data === 'string') this.onMessage(event.data);
    });
    ws.addEventListener('close', (event: { code: number }) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.closed || FINAL_CLOSE_CODES.has(event.code)) return;
      this.timer = setTimeout(() => this.connect(), this.delay);
      this.delay = Math.min(this.delay * 2, MAX_RECONNECT_MS);
    });
  }

  private onMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.type === 'subscribed') {
      this.delay = MIN_RECONNECT_MS;
      this.emit('ready', { sessionIds: (msg.sessions as string[]) ?? [], rejected: (msg.rejected as string[]) ?? [] });
      return;
    }
    if (msg.type === 'error') {
      this.emit('error', new Error(`${String(msg.code)}: ${String(msg.msg ?? '')}`));
      return;
    }
    const event = msg as unknown as IncomingCallEvent;
    if (event.type === 'call.offer') this.emit('call', this.toIncoming(event));
    else if (WITHDRAWN.has(event.type)) this.emit('withdrawn', event);
  }

  private toIncoming(event: IncomingCallEvent): IncomingCall {
    return {
      sessionId: event.sessionId,
      callId: event.callId,
      from: event.from,
      timestamp: event.timestamp,
      answer: (media) => this.actions.answer(event, media),
      reject: () => this.actions.reject(event),
    };
  }
}
