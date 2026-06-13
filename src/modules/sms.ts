import type { DApiClient } from '../client';
import type { SendSmsOptions, SendSmsResponse } from '../types';

/**
 * SMS module — send a single SMS. Billed charge-on-accept. Delivery events
 * (sms.delivered/undelivered/…) are delivered to the account SMS webhook
 * configured via `accountWebhooks.set('sms', ...)`.
 */
export class SmsModule {
  constructor(private readonly client: DApiClient) {}

  /** Send one SMS to a single number. */
  async send(options: SendSmsOptions): Promise<SendSmsResponse> {
    return this.client.post<SendSmsResponse>(
      '/api/v1/sms/send',
      options as unknown as Record<string, unknown>
    );
  }
}
