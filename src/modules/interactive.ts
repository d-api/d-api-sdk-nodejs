import type { DApiClient } from '../client';
import type {
  SendListOptions,
  SendCarouselOptions,
  SendTemplateOptions,
  SendNativeFlowOptions,
  SendPixOptions,
  InteractiveResponse,
} from '../types';

export class InteractiveModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Send an interactive list message
   */
  async sendList(options: SendListOptions): Promise<InteractiveResponse> {
    return this.client.post<InteractiveResponse>('/api/v1/interactive/send/list', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a carousel message with multiple cards (max 10 cards, 2 buttons per card)
   */
  async sendCarousel(options: SendCarouselOptions): Promise<InteractiveResponse> {
    return this.client.post<InteractiveResponse>('/api/v1/interactive/send/carousel', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a template message with CTA buttons (URL and Call)
   */
  async sendTemplate(options: SendTemplateOptions): Promise<InteractiveResponse> {
    return this.client.post<InteractiveResponse>('/api/v1/interactive/send/template', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a NativeFlow message with interactive buttons (MOBILE ONLY)
   * Supports: quick_reply, url, call, copy buttons
   */
  async sendNativeFlow(options: SendNativeFlowOptions): Promise<InteractiveResponse> {
    return this.client.post<InteractiveResponse>('/api/v1/interactive/send/nativeflow', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a message with PIX copy button (with optional amount)
   */
  async sendPix(options: SendPixOptions): Promise<InteractiveResponse> {
    return this.client.post<InteractiveResponse>('/api/v1/interactive/send/pix', options as unknown as Record<string, unknown>);
  }
}
