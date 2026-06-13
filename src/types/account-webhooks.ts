// Account-level webhook config (voice/SMS) for SaaS integrations.

export type AccountWebhookChannel = 'voice' | 'sms';

export interface AccountWebhookConfig {
  channel: AccountWebhookChannel;
  url: string | null;
  /** Whether a signing secret is set (the secret itself is never returned). */
  hasSecret: boolean;
  /** Allow-list of event names; empty = all events of the channel. */
  events: string[];
  enabled: boolean;
}

export interface SetAccountWebhookOptions {
  url?: string | null;
  /** Plaintext secret to set; omit to keep the current one, null to clear it. */
  secret?: string | null;
  events?: string[];
  enabled?: boolean;
}

/** Voice/URA call-lifecycle event names delivered to the voice webhook. */
export const VOICE_WEBHOOK_EVENTS = [
  'call.started',
  'call.answered',
  'call.dtmf',
  'call.ended',
] as const;

/** SMS delivery event names delivered to the SMS webhook. */
export const SMS_WEBHOOK_EVENTS = [
  'sms.sent',
  'sms.delivered',
  'sms.undelivered',
  'sms.failed',
  'sms.expired',
] as const;
