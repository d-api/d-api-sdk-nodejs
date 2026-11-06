// The call's audio contract: s16le PCM, 16 kHz, mono, 20 ms frames (320 samples).
export const SAMPLE_RATE = 16000;
export const FRAME_SAMPLES = 320;

/** Collects samples of any chunk size and hands out whole 20 ms frames. */
export class FrameAssembler {
  private buf = new Int16Array(FRAME_SAMPLES * 4);
  private len = 0;

  constructor(private readonly onFrame: (frame: Int16Array) => void) {}

  push(samples: Int16Array): void {
    if (this.len + samples.length > this.buf.length) {
      const grown = new Int16Array(Math.max(this.buf.length * 2, this.len + samples.length));
      grown.set(this.buf.subarray(0, this.len));
      this.buf = grown;
    }
    this.buf.set(samples, this.len);
    this.len += samples.length;

    let off = 0;
    while (this.len - off >= FRAME_SAMPLES) {
      this.onFrame(this.buf.slice(off, off + FRAME_SAMPLES));
      off += FRAME_SAMPLES;
    }
    this.buf.copyWithin(0, off, this.len);
    this.len -= off;
  }
}

/** View raw s16le bytes (a WS binary frame, a Buffer) as samples, copying when misaligned. */
export function bytesToSamples(bytes: ArrayBuffer | ArrayBufferView): Int16Array {
  const view = bytes instanceof ArrayBuffer
    ? new Uint8Array(bytes)
    : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const even = view.byteLength - (view.byteLength % 2);
  if (view.byteOffset % 2 === 0) return new Int16Array(view.buffer, view.byteOffset, even / 2);
  return new Int16Array(view.slice(0, even).buffer);
}

export function samplesToBytes(samples: Int16Array): Uint8Array {
  return new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
}

/** Accept the caller's audio as samples or raw s16le bytes. */
export function toSamples(audio: Int16Array | ArrayBuffer | ArrayBufferView): Int16Array {
  return audio instanceof Int16Array ? audio : bytesToSamples(audio);
}

/**
 * Converts what WebRTC hands back (48 kHz from the Opus decoder, maybe stereo)
 * to 16 kHz mono. The far end encodes from 16 kHz audio, so nothing above
 * 8 kHz is there to alias: averaging each group of samples is enough, and the
 * running sum carries across chunks so chunk edges leave no artifact.
 */
export class Downsampler {
  private readonly ratio: number;
  private sum = 0;
  private count = 0;
  private phase = 0;

  constructor(fromRate: number) {
    this.ratio = fromRate / SAMPLE_RATE;
  }

  process(samples: Int16Array, channels: number): Int16Array {
    const mono = channels === 1 ? samples : downmix(samples, channels);
    if (this.ratio === 1) return mono;
    return Number.isInteger(this.ratio) ? this.decimate(mono) : this.pick(mono);
  }

  private decimate(mono: Int16Array): Int16Array {
    const out = new Int16Array(Math.ceil((mono.length + this.count) / this.ratio));
    let n = 0;
    for (const s of mono) {
      this.sum += s;
      if (++this.count === this.ratio) {
        out[n++] = Math.round(this.sum / this.ratio);
        this.sum = 0;
        this.count = 0;
      }
    }
    return out.subarray(0, n);
  }

  /** Non-integer ratios (unusual rates): nearest sample, phase kept across chunks. */
  private pick(mono: Int16Array): Int16Array {
    const out = new Int16Array(Math.ceil(mono.length / this.ratio) + 1);
    let n = 0;
    for (; this.phase < mono.length; this.phase += this.ratio) out[n++] = mono[Math.floor(this.phase)];
    this.phase -= mono.length;
    return out.subarray(0, n);
  }
}

function downmix(samples: Int16Array, channels: number): Int16Array {
  const out = new Int16Array(Math.floor(samples.length / channels));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[i * channels + c];
    out[i] = Math.round(sum / channels);
  }
  return out;
}

export interface SinkChunk {
  samples: Int16Array;
  sampleRate: number;
  channelCount: number;
}

/**
 * Turns the chunks a WebRTC audio sink delivers into 20 ms, 16 kHz mono frames.
 * The sink starts at a placeholder rate and switches to the decoder's (48 kHz)
 * once remote audio flows, so the converter follows the rate of each chunk.
 */
export function createSinkFramer(onFrame: (frame: Int16Array) => void): (chunk: SinkChunk) => void {
  const frames = new FrameAssembler(onFrame);
  let rate = 0;
  let resampler = new Downsampler(SAMPLE_RATE);
  return (chunk) => {
    if (chunk.sampleRate !== rate) {
      rate = chunk.sampleRate;
      resampler = new Downsampler(rate);
    }
    frames.push(resampler.process(chunk.samples, chunk.channelCount));
  };
}
