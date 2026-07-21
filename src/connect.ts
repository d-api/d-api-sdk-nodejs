// Browser-only helper: opens D-API's hosted Embedded Signup popup and resolves
// with the provisioned connection. The partner's domain is never registered with
// Meta — the hosted page (on connect.d-api.cloud, a D-API domain) runs the ES SDK
// and returns the result over a postMessage handshake.

export interface DApiConnectConfig {
  publishableKey: string;
  connectBaseUrl?: string; // default https://connect.d-api.cloud
}
export interface StartOptions {
  webhookUrl?: string;
  webhookMode?: 'normalized' | 'meta_passthrough';
}
export interface StartResult {
  connectionId: string;
  phoneNumber: string | null;
  status: string;
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
