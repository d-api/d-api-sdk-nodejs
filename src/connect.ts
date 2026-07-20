// Browser-only Embedded Signup helper for SaaS integrators.
//
//   const connect = new DApiConnect({ publishableKey, appId, configId });
//   const { connectionId } = await connect.start({ webhookUrl });
//
// Opens Meta Embedded Signup via the FB JS SDK (D-API's config_id), then POSTs
// the OAuth code to the publishable-key onboard endpoint. The key never grants
// data access.

export interface DApiConnectConfig {
  publishableKey: string;
  appId: string; // D-API's public Meta App ID
  configId: string; // D-API's Login-for-Business config_id
  apiBaseUrl?: string; // default https://api.d-api.cloud
  sdkVersion?: string; // default v25.0
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

interface FbLike {
  init(p: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }): void;
  login(cb: (r: { authResponse?: { code?: string } | null }) => void, o?: Record<string, unknown>): void;
}

export class DApiConnect {
  private readonly cfg: Required<Omit<DApiConnectConfig, 'publishableKey'>> & { publishableKey: string };

  constructor(config: DApiConnectConfig) {
    if (typeof window === 'undefined') {
      throw new Error('DApiConnect is browser-only');
    }
    if (!config.publishableKey || !config.appId || !config.configId) {
      throw new Error('DApiConnect requires publishableKey, appId and configId');
    }
    this.cfg = {
      publishableKey: config.publishableKey,
      appId: config.appId,
      configId: config.configId,
      apiBaseUrl: (config.apiBaseUrl ?? 'https://api.d-api.cloud').replace(/\/$/, ''),
      sdkVersion: config.sdkVersion ?? 'v25.0',
    };
  }

  async start(options: StartOptions = {}): Promise<StartResult> {
    const code = await this.openEmbeddedSignup();

    const res = await fetch(`${this.cfg.apiBaseUrl}/api/v1/connections/cloud-api/provider-onboard`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-dapi-publishable-key': this.cfg.publishableKey,
      },
      body: JSON.stringify({
        code,
        webhookUrl: options.webhookUrl,
        webhookMode: options.webhookMode,
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { success: true; data: StartResult }
      | { success: false; error?: string }
      | null;

    if (!res.ok || !json || json.success !== true) {
      throw new Error((json && 'error' in json && json.error) || `Onboard failed (${res.status})`);
    }

    return json.data;
  }

  private async openEmbeddedSignup(): Promise<string> {
    const FB = await this.loadSdk();

    return new Promise<string>((resolve, reject) => {
      FB.login(
        (r) => {
          const code = r?.authResponse?.code;
          if (code) {
            resolve(code);
          } else {
            reject(new Error('Conexão cancelada antes de concluir.'));
          }
        },
        {
          config_id: this.cfg.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: '3' },
        }
      );
    });
  }

  private loadSdk(): Promise<FbLike> {
    const w = window as unknown as { FB?: FbLike; fbAsyncInit?: () => void };

    if (w.FB) {
      return Promise.resolve(w.FB);
    }

    return new Promise<FbLike>((resolve, reject) => {
      w.fbAsyncInit = () => {
        w.FB!.init({ appId: this.cfg.appId, version: this.cfg.sdkVersion, cookie: true, xfbml: false });
        resolve(w.FB!);
      };

      const id = 'facebook-jssdk';
      if (document.getElementById(id)) {
        return; // fbAsyncInit will still fire
      }

      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';
      s.onerror = () => reject(new Error('Não foi possível carregar o SDK da Meta (verifique bloqueadores)'));
      document.body.appendChild(s);
    });
  }
}
