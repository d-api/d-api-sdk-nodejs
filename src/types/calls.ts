// WhatsApp live calls (stream mode): the call's audio flows in real time
// between your code and the WhatsApp contact.

export type CallMediaTransport = 'websocket' | 'webrtc';

export interface StreamCallOptions {
  sessionId: string;
  /** Destination number (DDI + DDD + number). */
  phone?: string;
  /** Alternative to `phone`: a WhatsApp identifier (JID/LID). */
  identifier?: string;
}

export interface AcceptCallOptions {
  sessionId: string;
  /** callId from the incoming call event. */
  callId: string;
  from?: string;
}

/** Handle to a call's media socket, returned by `calls.stream()` / `calls.accept()`. */
export interface StreamCallResponse {
  success: boolean;
  sessionId: string;
  callId: string;
  wsUrl: string;
  token: string;
  data?: unknown;
}

export interface CallMediaOptions {
  /**
   * Where the audio flows. `websocket` (default) is the existing path.
   * `webrtc` moves only the audio to WebRTC (UDP, Opus with FEC) and keeps the
   * WebSocket for control; on Node it needs the optional `@roamhq/wrtc` package.
   * If WebRTC can't be set up, the call stays on the WebSocket (see `fallback`).
   */
  transport?: CallMediaTransport;
  /** Stay on the WebSocket when WebRTC fails instead of failing the call. Default true. */
  fallback?: boolean;
  /** How long WebRTC may take to connect before falling back. Default 20000 ms. */
  webrtcConnectTimeoutMs?: number;
  /** Reconnect-friendly socket: a dropped socket parks the call for a few seconds. Default true. */
  resume?: boolean;
  /** WebSocket implementation for runtimes without a global one (Node < 22): pass `ws`. */
  WebSocket?: unknown;
  /**
   * `device`: the SDK uses the microphone and the speaker itself (browser only).
   * `pcm`: you get the audio with `on('audio')` and send yours with `sendAudio()`.
   * Default: `device` in the browser, `pcm` on Node.
   */
  audio?: 'device' | 'pcm';
  /** Browser, `audio: 'device'`: microphone to use (a `deviceId` from `enumerateDevices`). Default: the system's. */
  microphoneDeviceId?: string;
  /** Browser, `audio: 'device'`: speaker to use (a `deviceId`, where the browser supports `setSinkId`). Default: the system's. */
  speakerDeviceId?: string;
  /**
   * Browser, `audio: 'device'`: URL of the audio worklet module. By default the
   * SDK loads its own from a `blob:` URL, which a strict CSP (e.g. Chrome
   * extensions) refuses; host the worklet and point here instead.
   */
  workletUrl?: string;
}

/** Lifecycle event of the call, as sent by D-API (`calling`, `ringing`, `accepted`, `ended`, ...). */
export interface CallEvent {
  type: string;
  reason?: string;
  [key: string]: unknown;
}

export interface CallTransportChange {
  transport: CallMediaTransport;
  /** Why the call is on this transport (set when WebRTC was not used or dropped). */
  reason?: string;
}

export interface CallRecording {
  url: string;
  files?: Record<string, string>;
}

export interface RejectCallOptions {
  sessionId: string;
  callId: string;
  /** Caller number, from the incoming call event. */
  from: string;
}

export interface ListenCallsOptions {
  /** Connections to watch for incoming calls (up to 20 per listener). */
  sessionIds: string[];
  /** WebSocket implementation for runtimes without a global one (Node < 22): pass `ws`. */
  WebSocket?: unknown;
}

/** An incoming call event as D-API delivers it. */
export interface IncomingCallEvent {
  type: 'call.offer' | 'call.accepted' | 'call.ended' | 'call.rejected';
  sessionId: string;
  callId: string;
  /** Caller number (resolved from LID when needed). */
  from?: string;
  callCreator?: string;
  timestamp: number;
}
