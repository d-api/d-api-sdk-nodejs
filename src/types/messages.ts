import type { BaseMessageOptions } from './common';

export interface SendTextOptions extends BaseMessageOptions {
  text: string;
}

export interface SendImageOptions extends BaseMessageOptions {
  image: string;
  caption?: string;
}

export interface SendVideoOptions extends BaseMessageOptions {
  video: string;
  caption?: string;
  ptv?: boolean;
  gifPlayback?: boolean;
}

export interface SendAudioOptions extends BaseMessageOptions {
  audio: string;
  ptt?: boolean;
}

export interface SendDocumentOptions extends BaseMessageOptions {
  document: string;
  mimetype?: string;
  fileName?: string;
}

export interface SendStickerOptions extends BaseMessageOptions {
  sticker: string;
}

export interface SendLocationOptions extends BaseMessageOptions {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface SendContactOptions extends BaseMessageOptions {
  contactName: string;
  contactPhone: string;
}

export interface SendPollOptions extends Omit<BaseMessageOptions, 'contextInfo'> {
  question: string;
  options: string[];
  multipleAnswers?: boolean;
}

export interface SendReactionOptions {
  sessionId: string;
  to: string;
  messageId: string;
  emoji: string;
  async?: string;
}

export interface AlbumMediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface SendAlbumOptions extends Omit<BaseMessageOptions, 'contextInfo'> {
  media: AlbumMediaItem[];
  caption?: string;
}

export interface EditMessageOptions {
  sessionId: string;
  to: string;
  text: string;
}

export interface MessageResponse {
  success?: boolean;
  message?: string;
  messageId?: string;
  timestamp?: number;
  status?: string;
}
