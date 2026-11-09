/**
 * What the browser itself says about the audio it played, summed over the call.
 * The gateway only sees RTCP (loss, jitter); concealment and time-stretching
 * are what the seller actually hears as "choppy", and only the browser knows them.
 */
export interface CallClientStats {
  samplesReceived: number;
  /** Samples the browser made up to cover missing audio (includes silent ones). */
  concealedSamples: number;
  silentConcealedSamples: number;
  concealmentEvents: number;
  /** Samples added (slowing down) or removed (speeding up) by the jitter buffer. */
  insertedSamples: number;
  removedSamples: number;
  /** Average time a sample waited in the jitter buffer. */
  jitterBufferMs: number;
  packetsReceived: number;
  packetsLost: number;
  jitterMs: number;
  rttMs?: number;
  /** Microphone or speaker looks like a Bluetooth headset (from its label, which never leaves the browser). */
  bluetooth?: boolean;
}

type Stat = Record<string, unknown> & { type?: string; id?: string };

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const ms = (seconds: unknown): number => Math.round(num(seconds) * 1000 * 10) / 10;

function selectedPair(stats: Stat[]): Stat | undefined {
  const byId = new Map(stats.map((s) => [s.id, s]));
  const transport = stats.find((s) => s.type === 'transport' && s.selectedCandidatePairId);
  const fromTransport = transport ? byId.get(transport.selectedCandidatePairId as string) : undefined;
  return fromTransport ?? stats.find((s) => s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded');
}

/** Summarize a `getStats()` report; null when there is no incoming audio yet. */
export function summarizeStats(report: Iterable<Stat>): CallClientStats | null {
  const stats = [...report];
  const inbound = stats.find((s) => s.type === 'inbound-rtp' && (s.kind ?? s.mediaType) === 'audio');
  if (!inbound) return null;
  const emitted = num(inbound.jitterBufferEmittedCount);
  const summary: CallClientStats = {
    samplesReceived: num(inbound.totalSamplesReceived),
    concealedSamples: num(inbound.concealedSamples),
    silentConcealedSamples: num(inbound.silentConcealedSamples),
    concealmentEvents: num(inbound.concealmentEvents),
    insertedSamples: num(inbound.insertedSamplesForDeceleration),
    removedSamples: num(inbound.removedSamplesForAcceleration),
    jitterBufferMs: emitted > 0 ? ms(num(inbound.jitterBufferDelay) / emitted) : 0,
    packetsReceived: num(inbound.packetsReceived),
    packetsLost: num(inbound.packetsLost),
    jitterMs: ms(inbound.jitter),
  };
  const rtt = selectedPair(stats)?.currentRoundTripTime;
  if (typeof rtt === 'number') summary.rttMs = ms(rtt);
  return summary;
}

const BLUETOOTH_LABEL = /bluetooth|airpods|hands-?free|\bbuds\b|headset \(|wh-1000|jabra|bose/i;

export function looksBluetooth(label: string): boolean {
  return BLUETOOTH_LABEL.test(label);
}

/** Best effort: labels are empty without permission, and some browsers don't list outputs. */
export async function usesBluetooth(microphone: MediaStream, speakerDeviceId?: string): Promise<boolean | undefined> {
  const labels = microphone.getAudioTracks().map((t) => t.label);
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const output = devices.find((d) => d.kind === 'audiooutput' && d.deviceId === (speakerDeviceId ?? 'default'));
    if (output) labels.push(output.label);
  } catch {
    // microphone label only
  }
  const known = labels.filter(Boolean);
  return known.length > 0 ? known.some(looksBluetooth) : undefined;
}
