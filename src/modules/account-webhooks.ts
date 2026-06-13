import type { DApiClient } from '../client';
import type {
  AccountWebhookChannel,
  AccountWebhookConfig,
  SetAccountWebhookOptions,
} from '../types';

/**
 * Account-level webhooks for the voice/SMS APIs. Configure one webhook URL per
 * channel; events for all of the account's calls/SMS are delivered there,
 * HMAC-signed with the channel's secret (`X-DAPI-Signature` header).
 */
export class AccountWebhooksModule {
  constructor(private readonly client: DApiClient) {}

  /** List the voice + SMS webhook config for the account. */
  async list(): Promise<{ success: boolean; webhooks: AccountWebhookConfig[] }> {
    return this.client.get<{ success: boolean; webhooks: AccountWebhookConfig[] }>(
      '/api/v1/account/webhooks'
    );
  }

  /** Set (create/update) the webhook config for one channel. */
  async set(
    channel: AccountWebhookChannel,
    options: SetAccountWebhookOptions
  ): Promise<{ success: boolean; config: AccountWebhookConfig }> {
    return this.client.put<{ success: boolean; config: AccountWebhookConfig }>(
      `/api/v1/account/webhooks/${encodeURIComponent(channel)}`,
      options as unknown as Record<string, unknown>
    );
  }
}
