import type { IceServer, WebRtcMedia } from './webrtc-node';
import { DISCONNECT_GRACE_MS, WebRtcSetupError, dropDecision } from './webrtc-node';
import { routeToSpeaker } from './browser-audio';

const GATHER_TIMEOUT_MS = 3000;

/**
 * WebRTC audio in the browser: the microphone goes out as a native track and the
 * other side plays through an audio element. The browser does the echo
 * cancellation, jitter buffer and packet-loss concealment.
 */
export class BrowserWebRtcMedia implements WebRtcMedia {
  private dropListener: ((reason: string) => void) | null = null;
  private dropTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly speaker: HTMLAudioElement;

  private constructor(private readonly pc: RTCPeerConnection) {
    this.speaker = new Audio();
    this.speaker.autoplay = true;
  }

  static async create(iceServers: IceServer[], microphone: MediaStream, speakerDeviceId?: string): Promise<BrowserWebRtcMedia> {
    const pc = new RTCPeerConnection({ iceServers });
    const media = new BrowserWebRtcMedia(pc);
    await routeToSpeaker(media.speaker as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }, speakerDeviceId);
    for (const track of microphone.getAudioTracks()) pc.addTrack(track, microphone);
    pc.ontrack = (event) => {
      media.speaker.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void media.speaker.play().catch(() => undefined);
    };
    pc.addEventListener('connectionstatechange', () => media.watchDrop(pc.connectionState));
    return media;
  }

  async createOffer(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await this.gathered();
    return this.pc.localDescription?.sdp ?? '';
  }

  private gathered(): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, GATHER_TIMEOUT_MS);
      this.pc.addEventListener('icegatheringstatechange', () => {
        if (this.pc.iceGatheringState !== 'complete') return;
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async acceptAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
  }

  waitConnected(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new WebRtcSetupError('ice_timeout', 'WebRTC did not connect in time')), timeoutMs);
      const check = () => {
        const state = this.pc.connectionState;
        if (state === 'connected') {
          clearTimeout(timer);
          resolve();
        } else if (state === 'failed' || state === 'closed') {
          clearTimeout(timer);
          reject(new WebRtcSetupError(`webrtc_${state}`, `WebRTC ${state}`));
        }
      };
      this.pc.addEventListener('connectionstatechange', check);
      check();
    });
  }

  onDrop(listener: (reason: string) => void): void {
    this.dropListener = listener;
  }

  private watchDrop(state: string): void {
    const drop = dropDecision(state);
    clearTimeout(this.dropTimer);
    if (drop === 'now') this.dropListener?.(`webrtc_${state}`);
    else if (drop === 'soon') this.dropTimer = setTimeout(() => this.dropListener?.('webrtc_disconnected'), DISCONNECT_GRACE_MS);
  }

  /** The microphone track carries the audio; nothing to push by hand. */
  write(): void {}

  close(): void {
    this.dropListener = null;
    clearTimeout(this.dropTimer);
    this.speaker.srcObject = null;
    this.pc.close();
  }
}
