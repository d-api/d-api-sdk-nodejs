export interface WsLike {
  binaryType: string;
  readyState: number;
  send(data: string | ArrayBufferView | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: (event: any) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export type WsCtor = new (url: string) => WsLike;

/** The global WebSocket (browsers, Node 22+), else the `ws` package, else what the caller passed. */
export async function resolveWebSocket(custom: unknown): Promise<WsCtor> {
  if (custom) return custom as WsCtor;
  const global = (globalThis as { WebSocket?: unknown }).WebSocket;
  if (global) return global as WsCtor;
  const specifier: string = 'ws';
  try {
    const mod = await import(specifier);
    return (mod.default ?? mod.WebSocket ?? mod) as WsCtor;
  } catch {
    throw new Error('No WebSocket available: use Node 22+, install "ws", or pass options.WebSocket');
  }
}
