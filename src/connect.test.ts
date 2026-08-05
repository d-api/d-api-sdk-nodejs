import { describe, it, expect, afterEach, mock } from "bun:test";
import { DApiConnect, METADATA_MAX_BYTES } from "./connect";

afterEach(() => { (globalThis as any).window = undefined; });

// Fake window whose `open` returns a popup, and whose `__emit` simulates the
// hosted page posting a message (with a controllable origin + source).
function fakeWindow() {
  const listeners: Array<(e: any) => void> = [];
  const popup = { closed: false, close() { this.closed = true; }, postMessage() {} };
  (globalThis as any).window = {
    open: mock(() => popup),
    addEventListener: (t: string, cb: any) => { if (t === "message") listeners.push(cb); },
    removeEventListener: (t: string, cb: any) => {
      const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1);
    },
    setInterval: () => 0,
    clearInterval: () => {},
    __emit: (data: any, origin = "https://connect.d-api.cloud", source: any = popup) =>
      listeners.forEach((cb) => cb({ origin, source, data })),
  };
  return { popup, emit: (d: any, o?: string, s?: any) => (globalThis as any).window.__emit(d, o, s) };
}

describe("DApiConnect.start (hosted)", () => {
  it("opens the hosted popup and resolves with the postMessage result", async () => {
    const { emit } = fakeWindow();
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    const p = connect.start({ webhookUrl: "https://saas.test/hook" });
    emit({ type: "dapi-connect-ready" });
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "cloud-1", phoneNumber: "+55", status: "connecting" } });
    const res = await p;
    expect(res.connectionId).toBe("cloud-1");
    expect((globalThis as any).window.open).toHaveBeenCalled();
  });

  it("forwards webhookMode to the hosted page on init", async () => {
    const { popup, emit } = fakeWindow();
    const sent: any[] = [];
    popup.postMessage = (msg: any) => sent.push(msg);
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    const p = connect.start({ webhookUrl: "https://saas.test/hook", webhookMode: "meta_passthrough" });
    emit({ type: "dapi-connect-ready" });
    expect(sent[0]).toMatchObject({
      type: "dapi-connect-init",
      webhookUrl: "https://saas.test/hook",
      webhookMode: "meta_passthrough",
    });
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "cloud-1", phoneNumber: null, status: "connected" } });
    await p;
  });

  it("resolves with the Meta access token when the hosted page sends one", async () => {
    const { emit } = fakeWindow();
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    const p = connect.start();
    emit({ type: "dapi-connect-ready" });
    emit({
      type: "dapi-connect-result",
      ok: true,
      data: {
        connectionId: "cloud-1",
        phoneNumber: "+5511999999999",
        status: "connected",
        accessToken: "EAA-token",
        accessTokenKind: "long_lived",
        accessTokenExpiresAt: "2026-09-01T00:00:00.000Z",
      },
    });
    const res = await p;
    expect(res.accessToken).toBe("EAA-token");
    expect(res.accessTokenKind).toBe("long_lived");
    expect(res.accessTokenExpiresAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rejects when the hosted page returns an error", async () => {
    const { emit } = fakeWindow();
    const connect = new DApiConnect({ publishableKey: "pk" });
    const p = connect.start();
    emit({ type: "dapi-connect-ready" });
    emit({ type: "dapi-connect-result", ok: false, error: "Origin not allowed" });
    await expect(p).rejects.toThrow(/Origin not allowed/);
  });

  it("ignores messages from an unexpected origin", async () => {
    const { emit } = fakeWindow();
    const connect = new DApiConnect({ publishableKey: "pk" });
    const p = connect.start();
    emit({ type: "dapi-connect-ready" });
    // wrong origin — must be ignored:
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "EVIL" } }, "https://evil.com");
    // correct origin — resolves:
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "cloud-9", phoneNumber: null, status: "connecting" } });
    expect((await p).connectionId).toBe("cloud-9");
  });
});

describe("DApiConnect.start (metadata)", () => {
  it("forwards metadata to the hosted page on init", async () => {
    const { popup, emit } = fakeWindow();
    const sent: any[] = [];
    popup.postMessage = (msg: any) => sent.push(msg);
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    const p = connect.start({ metadata: { tenantId: "t-9" } });
    emit({ type: "dapi-connect-ready" });
    expect(sent[0]).toMatchObject({ type: "dapi-connect-init", metadata: { tenantId: "t-9" } });
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "cloud-1", phoneNumber: null, status: "connected" } });
    await p;
  });

  // Integrações em 1.2.0 e anteriores não passam metadata: o init segue igual.
  it("omits metadata when the caller passes none", async () => {
    const { popup, emit } = fakeWindow();
    const sent: any[] = [];
    popup.postMessage = (msg: any) => sent.push(msg);
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    const p = connect.start({ webhookUrl: "https://saas.test/hook" });
    emit({ type: "dapi-connect-ready" });
    expect(sent[0].metadata).toBeUndefined();
    emit({ type: "dapi-connect-result", ok: true, data: { connectionId: "cloud-1", phoneNumber: null, status: "connected" } });
    await p;
  });

  it("throws before opening the popup when metadata is invalid or too big", () => {
    fakeWindow();
    const connect = new DApiConnect({ publishableKey: "pk_live_x" });
    expect(() => connect.start({ metadata: ["a"] as any })).toThrow(/objeto JSON/);
    expect(() =>
      connect.start({ metadata: { blob: "x".repeat(METADATA_MAX_BYTES) } })
    ).toThrow(/limite/);
    expect((globalThis as any).window.open).not.toHaveBeenCalled();
  });
});
