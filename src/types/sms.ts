// SMS types.

export interface SendSmsOptions {
  /** Destination phone number (E.164 or local; the API normalizes it). */
  to: string;
  /** Message body. Counted into segments for billing. */
  text: string;
  /** sms_routes name (e.g. OTP/Marketing). Drives the price category. */
  route?: string;
  /** Alpha-tag / sender id override. */
  sender?: string;
}

export interface SendSmsResponse {
  success: boolean;
  /** Our message id; correlates delivery webhooks (sms.delivered/…). */
  messageId: string;
  gatewayMessageId: string | null;
  segments: number;
  status: string;
  costMicroReais: number;
}
