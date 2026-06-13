import type { DApiClient } from '../client';
import type {
  SendSmsOptions,
  SendSmsResponse,
  SendBulkSmsOptions,
  SendBulkSmsResponse,
} from '../types';

/**
 * SMS module — send SMS (single or bulk). Billed charge-on-accept. Delivery
 * events (sms.delivered/undelivered/…) are delivered to the account SMS webhook
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

  /** Send the same SMS to many numbers in one call. */
  async bulk(options: SendBulkSmsOptions): Promise<SendBulkSmsResponse> {
    return this.client.post<SendBulkSmsResponse>(
      '/api/v1/sms/bulk',
      options as unknown as Record<string, unknown>
    );
  }
}
