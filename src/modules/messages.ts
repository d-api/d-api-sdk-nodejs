import type { DApiClient } from '../client';
import type {
  SendTextOptions,
  SendImageOptions,
  SendVideoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendStickerOptions,
  SendLocationOptions,
  SendContactOptions,
  SendPollOptions,
  SendReactionOptions,
  SendAlbumOptions,
  EditMessageOptions,
  MessageResponse,
} from '../types';

export class MessagesModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Send a text message
   */
  async sendText(options: SendTextOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/text', options as unknown as Record<string, unknown>);
  }

  /**
   * Send an image message with optional caption
   */
  async sendImage(options: SendImageOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/image', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a video message with optional caption, video note (ptv), or GIF playback
   */
  async sendVideo(options: SendVideoOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/video', options as unknown as Record<string, unknown>);
  }

  /**
   * Send an audio message or voice note (ptt)
   */
  async sendAudio(options: SendAudioOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/audio', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a document (PDF, DOC, etc.)
   */
  async sendDocument(options: SendDocumentOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/document', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a sticker
   */
  async sendSticker(options: SendStickerOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/sticker', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a location with GPS coordinates
   */
  async sendLocation(options: SendLocationOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/location', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a contact card
   */
  async sendContact(options: SendContactOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/contact', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a poll with question and options
   */
  async sendPoll(options: SendPollOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/poll', options as unknown as Record<string, unknown>);
  }

  /**
   * Send a reaction emoji to a specific message
   */
  async sendReaction(options: SendReactionOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/reaction', options as unknown as Record<string, unknown>);
  }

  /**
   * Send an album with multiple images/videos
   */
  async sendAlbum(options: SendAlbumOptions): Promise<MessageResponse> {
    return this.client.post<MessageResponse>('/api/v1/messages/send/album', options as unknown as Record<string, unknown>);
  }

  /**
   * Edit a message text
   */
  async edit(messageId: string, options: EditMessageOptions): Promise<MessageResponse> {
    return this.client.put<MessageResponse>(
      `/api/v1/messages/${encodeURIComponent(messageId)}`,
      options as unknown as Record<string, unknown>
    );
  }
}
