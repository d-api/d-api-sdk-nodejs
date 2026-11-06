import type { DApiClient } from '../client';
import type { CallMediaOptions, StreamCallResponse } from '../types';
import { LiveCall } from '../calls/live-call';
import type {
  VoiceLiveCallOptions,
  VoiceCallOptions,
  VoiceCallResponse,
  VoiceBulkOptions,
  VoiceBulkResponse,
} from '../types';

/**
 * Voice / URA module — trigger phone calls (single or bulk) that play an audio
 * file or run an IVR flow, or a live call with real-time audio (`live()`). Call-lifecycle events (started/answered/dtmf/ended)
 * are delivered to the account voice webhook configured via
 * `accountWebhooks.set('voice', ...)`.
 */
export class VoiceModule {
  constructor(private readonly client: DApiClient) {}

  /** Trigger a single URA call (audio or IVR flow). */
  async call(options: VoiceCallOptions): Promise<VoiceCallResponse> {
    return this.client.post<VoiceCallResponse>(
      '/api/v1/voice/call',
      options as unknown as Record<string, unknown>
    );
  }

  /** Start a live phone call in stream mode. Returns the media socket handle. */
  async liveStart(options: VoiceLiveCallOptions): Promise<StreamCallResponse> {
    return this.client.post<StreamCallResponse>(
      '/api/v1/voice/live/start',
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Start a live phone call and open its media: the same `LiveCall` as a
   * WhatsApp call, so `on('audio')`, `sendAudio()`, `hangup()` and
   * `{ transport: 'webrtc' }` work the same way.
   */
  async live(options: VoiceLiveCallOptions, media?: CallMediaOptions): Promise<LiveCall> {
    const handle = await this.liveStart(options);
    return LiveCall.connect(handle.callId, handle.wsUrl, media);
  }

  /** Launch a bulk voice campaign (many numbers, optionally scheduled). */
  async bulk(options: VoiceBulkOptions): Promise<VoiceBulkResponse> {
    return this.client.post<VoiceBulkResponse>(
      '/api/v1/voice/bulk',
      options as unknown as Record<string, unknown>
    );
  }
}
