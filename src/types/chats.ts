import type { PaginationParams, SortOrder } from './common';

export type ChatSortField = 'id' | 'last_message_timestamp' | 'chat_name' | 'unread_count' | 'created_at' | 'updated_at';
export type MessageSortField = 'timestamp' | 'id';
export type PresenceType = 'available' | 'unavailable' | 'typing' | 'recording' | 'paused';

export interface Chat {
  id: string;
  jid: string;
  name?: string;
  phone?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessageTimestamp?: number;
  lastMessage?: string;
  archived?: boolean;
  pinned?: boolean;
  muted?: boolean;
  muteExpiration?: number;
}

export interface ChatMessage {
  id: string;
  messageId: string;
  chatId: string;
  fromMe: boolean;
  sender?: string;
  senderName?: string;
  timestamp: number;
  type: string;
  content?: string;
  mediaUrl?: string;
  mediaKey?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  quotedMessageId?: string;
  quotedMessage?: Record<string, unknown>;
  isForwarded?: boolean;
  mentionedJids?: string[];
  reactions?: Array<{
    key: string;
    count: number;
    users: string[];
  }>;
}

export interface ListChatsOptions extends PaginationParams {
  sessionId: string;
  search?: string;
  sort_field?: ChatSortField;
  sort_order?: SortOrder;
  includeEmpty?: boolean;
}

export interface ListMessagesOptions extends PaginationParams {
  sessionId: string;
  search?: string;
  sort_field?: MessageSortField;
  sort_order?: SortOrder;
}

export interface SendPresenceOptions {
  sessionId: string;
  to?: string;
  presence: PresenceType;
  durationMs?: number;
  async?: string;
}

export interface MarkAsReadOptions {
  sessionId: string;
  to: string;
  messageIds: string[];
  participant?: string;
  async?: string;
}

export interface DeleteMessageOptions {
  sessionId: string;
  to: string;
  forEveryone?: boolean;
  sender?: string;
  async?: string;
}

export interface ChatResponse {
  success?: boolean;
  message?: string;
}
