import { describe, it, expect, afterEach } from "bun:test";
import { DApiConnect } from "./connect";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as any).window = undefined;
});

function fakeWindow(code: string | null) {
  (globalThis as any).window = {
    FB: {
      init() {},
      login(cb: (r: any) => void) {
        cb({ authResponse: code ? { code } : null });
      },
    },
    location: { hostname: "saas.test" },
  };
}

describe("DApiConnect.start", () => {
  it("opens ES, posts the code + webhook, resolves connectionId", async () => {
    fakeWindow("CODE123");
    let captured: any = null;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = { url, init };
      return new Response(
        JSON.stringify({
          success: true,
          data: { connectionId: "cloud-1", phoneNumber: "+55", status: "connecting" },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const connect = new DApiConnect({
      publishableKey: "pk_live_x",
      appId: "APP",
      configId: "CFG",
      apiBaseUrl: "https://api.d-api.cloud",
    });
    const res = await connect.start({ webhookUrl: "https://saas.test/hook" });

    expect(res.connectionId).toBe("cloud-1");
    expect(captured.url).toBe(
      "https://api.d-api.cloud/api/v1/connections/cloud-api/provider-onboard"
    );
    expect(captured.init.headers["x-dapi-publishable-key"]).toBe("pk_live_x");
    const body = JSON.parse(captured.init.body);
    expect(body.code).toBe("CODE123");
    expect(body.webhookUrl).toBe("https://saas.test/hook");
  });

  it("rejects when the user closes the popup (no code)", async () => {
    fakeWindow(null);
    const connect = new DApiConnect({ publishableKey: "pk", appId: "A", configId: "C" });
    await expect(connect.start()).rejects.toThrow(/cancel|closed|não/i);
  });

  it("rejects on a non-success API response", async () => {
    fakeWindow("CODE");
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, error: "Origin not allowed" }), {
        status: 403,
      })) as typeof fetch;
    const connect = new DApiConnect({ publishableKey: "pk", appId: "A", configId: "C" });
    await expect(connect.start()).rejects.toThrow(/Origin not allowed/);
  });
});
