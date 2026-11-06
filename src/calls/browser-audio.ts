import { FRAME_SAMPLES } from './pcm';

// The doc's reference worklet (Float32 ⇄ Int16 at 16 kHz), with a sturdier
// playout: it re-buffers only after a real gap, not on a single missing sample,
// and trims latency when a burst piles up.
const WORKLET_SOURCE = `
const FRAME = ${FRAME_SAMPLES};
const PREBUFFER = 2400;   // 150 ms before playing
const REBUFFER_GAP = 1600; // re-buffer only after 100 ms without audio
const MAX_LATENCY = 8000;  // 500 ms: drop the oldest audio past this
class VoipIO extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ring = new Float32Array(16000 * 2);
    this.wr = 0; this.rd = 0; this.filled = 0;
    this.primed = false; this.starved = 0;
    this.acc = new Float32Array(FRAME); this.accLen = 0;
    this.port.onmessage = (e) => {
      if (e.data?.kind !== 'in') return;
      const i16 = new Int16Array(e.data.pcm);
      for (let i = 0; i < i16.length; i++) {
        this.ring[this.wr] = i16[i] / 32768;
        this.wr = (this.wr + 1) % this.ring.length;
        if (this.filled < this.ring.length) this.filled++; else this.rd = (this.rd + 1) % this.ring.length;
      }
      if (this.filled > MAX_LATENCY) {
        const drop = this.filled - PREBUFFER;
        this.rd = (this.rd + drop) % this.ring.length;
        this.filled -= drop;
      }
    };
  }
  process(inputs, outputs) {
    const mic = inputs[0]?.[0];
    if (mic) {
      for (let i = 0; i < mic.length; i++) {
        this.acc[this.accLen++] = mic[i];
        if (this.accLen === FRAME) {
          const i16 = new Int16Array(FRAME);
          for (let k = 0; k < FRAME; k++) { const v = Math.max(-1, Math.min(1, this.acc[k])); i16[k] = v * 32767; }
          this.port.postMessage({ kind: 'out', pcm: i16.buffer }, [i16.buffer]);
          this.accLen = 0;
        }
      }
    }
    const out = outputs[0][0];
    if (!this.primed && this.filled >= PREBUFFER) { this.primed = true; this.starved = 0; }
    for (let i = 0; i < out.length; i++) {
      if (this.primed && this.filled > 0) {
        out[i] = this.ring[this.rd];
        this.rd = (this.rd + 1) % this.ring.length;
        this.filled--;
        this.starved = 0;
      } else {
        out[i] = 0;
        if (this.primed && ++this.starved >= REBUFFER_GAP) this.primed = false;
      }
    }
    return true;
  }
}
registerProcessor('voip-io', VoipIO);
`;

export interface DeviceAudioOptions {
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
  workletUrl?: string;
}

interface AudioContextWithSink extends AudioContext {
  setSinkId?: (id: string) => Promise<void>;
}

/** Best effort: an unsupported browser or an unplugged device keeps the default output. */
export async function routeToSpeaker(target: { setSinkId?: (id: string) => Promise<void> }, deviceId?: string): Promise<void> {
  if (!deviceId || !target.setSinkId) return;
  try {
    await target.setSinkId(deviceId);
  } catch {
    // keep the default output
  }
}

/**
 * Microphone and speaker for a call in the browser, in the call's PCM format.
 * The microphone stream is shared with the WebRTC transport, so muting it
 * silences the call whichever transport carries the audio.
 */
export class BrowserDeviceAudio {
  private constructor(
    private readonly ctx: AudioContext,
    private readonly node: AudioWorkletNode,
    readonly microphone: MediaStream,
    private readonly speaker?: string
  ) {}

  static async open(onMicFrame: (frame: Int16Array) => void, options: DeviceAudioOptions = {}): Promise<BrowserDeviceAudio> {
    const microphone = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: options.microphoneDeviceId ? { exact: options.microphoneDeviceId } : undefined,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const ctx = new AudioContext({ sampleRate: 16000 }) as AudioContextWithSink;
    await routeToSpeaker(ctx, options.speakerDeviceId);
    try {
      await loadWorklet(ctx, options.workletUrl);
    } catch (err) {
      for (const track of microphone.getTracks()) track.stop();
      void ctx.close();
      throw err;
    }
    const node = new AudioWorkletNode(ctx, 'voip-io', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    ctx.createMediaStreamSource(microphone).connect(node);
    node.connect(ctx.destination);
    node.port.onmessage = (e: MessageEvent<{ kind: string; pcm: ArrayBuffer }>) => {
      if (e.data?.kind === 'out') onMicFrame(new Int16Array(e.data.pcm));
    };
    await ctx.resume(); // created inside the user's click, so the browser allows it
    return new BrowserDeviceAudio(ctx, node, microphone, options.speakerDeviceId);
  }

  /** The speaker chosen for the call, for the WebRTC audio element to follow. */
  get speakerDeviceId(): string | undefined {
    return this.speaker;
  }

  /** Queue 20 ms of the other side's audio for the speaker. */
  play(frame: Int16Array): void {
    const copy = frame.slice();
    this.node.port.postMessage({ kind: 'in', pcm: copy.buffer }, [copy.buffer]);
  }

  setMuted(muted: boolean): void {
    for (const track of this.microphone.getAudioTracks()) track.enabled = !muted;
  }

  close(): void {
    for (const track of this.microphone.getTracks()) track.stop();
    this.node.disconnect();
    void this.ctx.close();
  }
}

async function loadWorklet(ctx: AudioContext, workletUrl?: string): Promise<void> {
  if (workletUrl) {
    await ctx.audioWorklet.addModule(workletUrl);
    return;
  }
  const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
