import { describe, it, expect, afterEach, mock } from "bun:test";
import { DApiConnect } from "./connect";

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
