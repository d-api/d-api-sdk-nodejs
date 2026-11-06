import type { DApiClient } from '../client';
import type {
  AcceptCallOptions,
  CallMediaOptions,
  ListenCallsOptions,
  RejectCallOptions,
  StreamCallOptions,
  StreamCallResponse,
} from '../types';
import { LiveCall } from '../calls/live-call';
import { IncomingCalls } from '../calls/incoming';

/**
 * WhatsApp live calls: place or answer a call and talk in real time.
 *
 * @example
 * ```typescript
 * const call = await dapi.calls.start({ sessionId, phone: '5511999999999' });
 * call.on('audio', (frame) => speaker.write(frame));   // 16 kHz s16 mono, 20 ms
 * mic.on('data', (chunk) => call.sendAudio(chunk));
 * call.on('ended', () => console.log('done'));
 *
 * // Same code over WebRTC (UDP, Opus with FEC); falls back to the WebSocket on its own:
 * const call = await dapi.calls.start({ sessionId, phone }, { transport: 'webrtc' });
 *
 * // Incoming calls:
 * const incoming = await dapi.calls.listen({ sessionIds: [sessionId] });
 * incoming.on('call', async (offer) => {
 *   const call = await offer.answer({ transport: 'webrtc' });
 *   call.on('audio', (frame) => bot.hear(frame));
 * });
 * ```
 */
export class CallsModule {
  constructor(private readonly client: DApiClient) {}

  /** Place an outbound call in stream mode. Returns the media socket handle. */
  async stream(options: StreamCallOptions): Promise<StreamCallResponse> {
    return this.client.post<StreamCallResponse>('/api/v1/calls/stream', options as unknown as Record<string, unknown>);
  }

  /** Answer an incoming call in stream mode. Returns the media socket handle. */
  async accept(options: AcceptCallOptions): Promise<StreamCallResponse> {
    return this.client.post<StreamCallResponse>('/api/v1/calls/accept', options as unknown as Record<string, unknown>);
  }

  /** Reject an incoming call. */
  async reject(options: RejectCallOptions): Promise<unknown> {
    return this.client.post('/api/v1/calls/reject', options as unknown as Record<string, unknown>);
  }

  /**
   * Watch connections for incoming calls. Each `call` event comes with
   * `answer()` / `reject()`; the subscription reconnects on its own.
   */
  async listen(options: ListenCallsOptions): Promise<IncomingCalls> {
    const url = this.client.socketUrl('/voip/events', { sessions: options.sessionIds.join(',') });
    return IncomingCalls.open(
      url,
      {
        answer: (event, media) => this.answer({ sessionId: event.sessionId, callId: event.callId, from: event.from }, media),
        reject: async (event) => {
          await this.reject({ sessionId: event.sessionId, callId: event.callId, from: event.from ?? '' });
        },
      },
      options.WebSocket
    );
  }

  /** Open the media of a call you placed or answered (e.g. with `stream()`/`accept()`). */
  async connect(handle: Pick<StreamCallResponse, 'callId' | 'wsUrl'>, media?: CallMediaOptions): Promise<LiveCall> {
    return LiveCall.connect(handle.callId, handle.wsUrl, media);
  }

  /** Place an outbound call and open its media. */
  async start(options: StreamCallOptions, media?: CallMediaOptions): Promise<LiveCall> {
    return this.connect(await this.stream(options), media);
  }

  /** Answer an incoming call and open its media. */
  async answer(options: AcceptCallOptions, media?: CallMediaOptions): Promise<LiveCall> {
    return this.connect(await this.accept(options), media);
  }
}
