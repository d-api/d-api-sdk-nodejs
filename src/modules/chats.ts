import type { DApiClient } from '../client';
import type {
  Chat,
  ChatMessage,
  ListChatsOptions,
  ListMessagesOptions,
  SendPresenceOptions,
  MarkAsReadOptions,
  DeleteMessageOptions,
  ChatResponse,
  PaginatedResponse,
} from '../types';

export class ChatsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * List chats for a session with optional search and pagination
   */
  async list(options: ListChatsOptions): Promise<PaginatedResponse<Chat>> {
    const { sessionId, search, sort_field, sort_order, limit, page, includeEmpty } = options;
    return this.client.get<PaginatedResponse<Chat>>('/api/v1/chats/', {
      sessionId,
      search,
      sort_field,
      sort_order,
      limit: limit?.toString(),
      page: page?.toString(),
      includeEmpty: includeEmpty !== undefined ? String(includeEmpty) : undefined,
    });
  }

  /**
   * Get details of a specific chat
   */
  async get(chatId: string, sessionId: string): Promise<Chat> {
    return this.client.get<Chat>(`/api/v1/chats/${encodeURIComponent(chatId)}`, {
      sessionId,
    });
  }

  /**
   * List messages in a chat with optional search and pagination
   */
  async listMessages(chatId: string, options: ListMessagesOptions): Promise<PaginatedResponse<ChatMessage>> {
    const { sessionId, search, sort_field, sort_order, limit, page } = options;
    return this.client.get<PaginatedResponse<ChatMessage>>(`/api/v1/chats/${encodeURIComponent(chatId)}/messages`, {
      sessionId,
      search,
      sort_field,
      sort_order,
      limit: limit?.toString(),
      page: page?.toString(),
    });
  }

  /**
   * Send presence status (available, unavailable, typing, recording, paused)
   */
  async sendPresence(options: SendPresenceOptions): Promise<ChatResponse> {
    return this.client.post<ChatResponse>('/api/v1/chats/presence', options as unknown as Record<string, unknown>);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(options: MarkAsReadOptions): Promise<ChatResponse> {
    return this.client.post<ChatResponse>('/api/v1/chats/read', options as unknown as Record<string, unknown>);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, options: DeleteMessageOptions): Promise<ChatResponse> {
    return this.client.delete<ChatResponse>(
      `/api/v1/chats/messages/${encodeURIComponent(messageId)}`,
      options as unknown as Record<string, unknown>
    );
  }
}
