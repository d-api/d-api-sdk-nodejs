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
   */
  start(options: StartOptions = {}): Promise<StartResult> {
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
