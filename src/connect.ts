// Browser-only helper: opens D-API's hosted Embedded Signup popup and resolves
// with the provisioned connection. The partner's domain is never registered with
// Meta — the hosted page (on connect.d-api.cloud, a D-API domain) runs the ES SDK
// and returns the result over a postMessage handshake.

export interface DApiConnectConfig {
  publishableKey: string;
  connectBaseUrl?: string; // default https://connect.d-api.cloud
}
export interface StartOptions {
  /** "standard" (default) creates/onboards a new number; "coexistence" keeps the
   *  WhatsApp Business App on the same number (requires the customer to scan a QR). */
  mode?: 'standard' | 'coexistence';
  /** Where this connection's events are delivered. */
  webhookUrl?: string;
  /** Shape of those events: "normalized" (default) sends D-API's canonical event
   *  format — the same payloads as an unofficial connection, so one handler serves
   *  both. "meta_passthrough" forwards Meta's raw Cloud API webhook body untouched,
   *  for callers who already parse Meta's format. */
  webhookMode?: 'normalized' | 'meta_passthrough';
  /**
   * Free-form JSON of your own (typically `{ tenantId }`), stored with the
   * connection and echoed back in the `session.created` webhook. It is what
   * lets your backend match the new connection to the account that started the
   * flow — useful because on MOBILE the popup opens as a tab with no usable
   * `window.opener`, so the postMessage this promise waits on never arrives and
   * the webhook is your only notification.
   *
   * It rides in the URL of Meta's authorize page, so it is capped:
   * {@link METADATA_MAX_BYTES} bytes of serialized JSON. Bigger throws, right
   * here, before any window is opened.
   */
  metadata?: Record<string, unknown>;
}

/** Max size, in bytes of serialized JSON, of {@link StartOptions.metadata}. */
export const METADATA_MAX_BYTES = 512;

/** Bytes of a string as UTF-8, without depending on Buffer (browser build). */
function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Fail fast, in the partner's own code, on metadata that the hosted page would
 * reject after the popup is already open — where the error is invisible to them.
 */
function assertValidMetadata(metadata: unknown): void {
  if (metadata === undefined || metadata === null) return;
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('metadata deve ser um objeto JSON');
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new Error('metadata deve ser serializável em JSON');
  }
  if (utf8Bytes(serialized) > METADATA_MAX_BYTES) {
    throw new Error(`metadata acima do limite de ${METADATA_MAX_BYTES} bytes serializados`);
  }
}

/** What kind of Meta token `accessToken` is:
 *  - `permanent`   — never expires (System User / business integration token)
 *  - `long_lived`  — the ~60-day token an Embedded Signup produces
 *  - `short_lived` — a ~1h code-exchange token
 *  - `unknown`     — Meta's /debug_token could not be reached */
export type AccessTokenKind = 'permanent' | 'long_lived' | 'short_lived' | 'unknown';

export interface StartResult {
  connectionId: string;
  phoneNumber: string | null;
  status: string;
  /** The connection's Meta access token, decrypted. SECRET — it can send messages
   *  and manage the WABA. Send it to your backend; never log it or persist it in
   *  the browser. Absent when the hosted page couldn't produce one. */
  accessToken?: string;
  accessTokenKind?: AccessTokenKind;
  /** pt-BR one-liner describing the token (safe to show in a UI). */
  accessTokenLabel?: string;
  /** ISO-8601 expiry, or null when the token never expires. */
  accessTokenExpiresAt?: string | null;
}

const CONNECT_ORIGIN_DEFAULT = 'https://connect.d-api.cloud';

export class DApiConnect {
  private readonly publishableKey: string;
  private readonly connectOrigin: string;

  constructor(config: DApiConnectConfig) {
    if (typeof window === 'undefined') throw new Error('DApiConnect is browser-only');
    if (!config.publishableKey) throw new Error('DApiConnect requires a publishableKey');
    this.publishableKey = config.publishableKey;
    this.connectOrigin = (config.connectBaseUrl ?? CONNECT_ORIGIN_DEFAULT).replace(/\/$/, '');
  }

  /**
   * Open the hosted Embedded Signup popup and resolve once the connection is
   * provisioned. The result carries the connection's Meta access token — treat
   * it as a secret (see {@link StartResult.accessToken}).
   *
   * The same result is ALSO delivered as a `session.created` webhook to the
   * `webhookUrl` of the connection, always — you don't opt in. On mobile the
   * popup opens as a tab whose `window.opener` we cannot reach, so this promise
   * may reject with "Conexão cancelada" even though the connection exists; the
   * webhook is what tells you it did. Pass {@link StartOptions.metadata} to
   * correlate it with your own account.
   */
  start(options: StartOptions = {}): Promise<StartResult> {
    assertValidMetadata(options.metadata);
    const popup = window.open(`${this.connectOrigin}/connect`, 'dapi-connect', 'width=600,height=760');
    if (!popup) {
      return Promise.reject(new Error('Popup bloqueado — permita popups para conectar.'));
    }

    return new Promise<StartResult>((resolve, reject) => {
      let settled = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        window.clearInterval(poll);
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        fn();
      };

      const onMessage = (e: MessageEvent) => {
        // Only trust our hosted page.
        if (e.origin !== this.connectOrigin || e.source !== popup) return;
        const msg = e.data as { type?: string; ok?: boolean; data?: StartResult; error?: string };
        if (msg?.type === 'dapi-connect-ready') {
          popup.postMessage(
            {
              type: 'dapi-connect-init',
              pk: this.publishableKey,
              mode: options.mode ?? 'standard',
              webhookUrl: options.webhookUrl,
              webhookMode: options.webhookMode,
              metadata: options.metadata,
            },
            this.connectOrigin
          );
        } else if (msg?.type === 'dapi-connect-result') {
          finish(() => (msg.ok && msg.data ? resolve(msg.data) : reject(new Error(msg.error || 'Onboarding falhou'))));
        }
      };

      const poll = window.setInterval(() => {
        if (popup.closed && !settled) finish(() => reject(new Error('Conexão cancelada (popup fechado).')));
      }, 500);

      window.addEventListener('message', onMessage);
    });
  }
}
