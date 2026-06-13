import type { DApiClient } from '../client';
import type {
  VoiceCallOptions,
  VoiceCallResponse,
  VoiceBulkOptions,
  VoiceBulkResponse,
} from '../types';

/**
 * Voice / URA module — trigger phone calls (single or bulk) that play an audio
 * file or run an IVR flow. Call-lifecycle events (started/answered/dtmf/ended)
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

  /** Launch a bulk voice campaign (many numbers, optionally scheduled). */
  async bulk(options: VoiceBulkOptions): Promise<VoiceBulkResponse> {
    return this.client.post<VoiceBulkResponse>(
      '/api/v1/voice/bulk',
      options as unknown as Record<string, unknown>
    );
  }
}
