// Voice / URA (phone call) types.

export interface VoiceCallOptions {
  /** Destination phone number (E.164 or local; the API normalizes it). */
  to: string;
  /** Play a single audio file. Mutually exclusive with `flowId`. */
  audioUrl?: string;
  /** Run an IVR flow (with DTMF menus). Mutually exclusive with `audioUrl`. */
  flowId?: string;
  /** Carrier trunk to dial through (optional). */
  trunk?: string;
  /** Caller ID override (optional). */
  from?: string;
  /** Estimated audio length (seconds), used to size the credit reservation. */
  audioSecs?: number;
  /** Max dial attempts (optional). */
  maxAttempts?: number;
  /** Friendly name for reporting (optional). */
  name?: string;
}

export interface VoiceCallResponse {
  success: boolean;
  /** Identifier for this call. Webhook events for it carry it as `callId`. */
  callId: string;
  reservedMicroReais: number;
  tier: number;
}

export interface VoiceBulkRecipient {
  phone: string;
  /** Per-call variables for IVR `{{input.*}}` templating. */
  variables?: Record<string, unknown>;
}

export interface VoiceBulkOptions {
  audioUrl?: string;
  flowId?: string;
  /** Plain list of numbers. Provide exactly one of `numbers` or `recipients`. */
  numbers?: string[];
  /** Numbers with per-call variables. Provide exactly one of `numbers` or `recipients`. */
  recipients?: VoiceBulkRecipient[];
  trunk?: string;
  from?: string;
  audioSecs?: number;
  maxAttempts?: number;
  name?: string;
  /** ISO timestamp; when in the future, the campaign is scheduled. */
  scheduledAt?: string;
}

export interface VoiceBulkResponse {
  success: boolean;
  bulkId: string;
  dialed: number;
  skipped: number;
  reservedMicroReais: number;
  tier: number;
  scheduled?: boolean;
  scheduledAt?: string;
}
