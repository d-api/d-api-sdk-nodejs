import { DApiClient, type DApiClientConfig } from './client';
import {
  SessionsModule,
  MessagesModule,
  InteractiveModule,
  GroupsModule,
  ChatsModule,
  ContactsModule,
  LabelsModule,
  MediaModule,
  HistoryModule,
  IntegrationsModule,
} from './modules';

export interface DApiConfig extends DApiClientConfig {}

/**
 * D-API SDK - Complete WhatsApp integration library
 *
 * @example
 * ```typescript
 * import { DApi } from 'd-api-lib';
 *
 * const dapi = new DApi({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.d-api.cloud', // optional, default
 * });
 *
 * // Create a session
 * const session = await dapi.sessions.create({
 *   sessionId: 'my-session',
 *   connectionMode: 'qr',
 * });
 *
 * // Send a message
 * await dapi.messages.sendText({
 *   sessionId: 'my-session',
 *   to: '5511999999999',
 *   text: 'Hello from D-API!',
 * });
 * ```
 */
export class DApi {
  private readonly client: DApiClient;

  /**
   * Sessions module - Manage WhatsApp sessions
   */
  public readonly sessions: SessionsModule;

  /**
   * Messages module - Send messages (text, image, video, audio, etc.)
   */
  public readonly messages: MessagesModule;

  /**
   * Interactive module - Send interactive messages (lists, carousels, templates, PIX)
   */
  public readonly interactive: InteractiveModule;

  /**
   * Groups module - Manage WhatsApp groups
   */
  public readonly groups: GroupsModule;

  /**
   * Chats module - Manage chats and messages
   */
  public readonly chats: ChatsModule;

  /**
   * Contacts module - Manage contacts and blocklist
   */
  public readonly contacts: ContactsModule;

  /**
   * Labels module - Manage WhatsApp labels
   */
  public readonly labels: LabelsModule;

  /**
   * Media module - Download and manage media files
   */
  public readonly media: MediaModule;

  /**
   * History module - Sync message history
   */
  public readonly history: HistoryModule;

  /**
   * Integrations module - Manage S3 and RabbitMQ integrations
   */
  public readonly integrations: IntegrationsModule;

  constructor(config: DApiConfig) {
    this.client = new DApiClient(config);

    this.sessions = new SessionsModule(this.client);
    this.messages = new MessagesModule(this.client);
    this.interactive = new InteractiveModule(this.client);
    this.groups = new GroupsModule(this.client);
    this.chats = new ChatsModule(this.client);
    this.contacts = new ContactsModule(this.client);
    this.labels = new LabelsModule(this.client);
    this.media = new MediaModule(this.client);
    this.history = new HistoryModule(this.client);
    this.integrations = new IntegrationsModule(this.client);
  }

  /**
   * Get API health status
   */
  async getHealth(): Promise<{ status: string }> {
    return this.client.get<{ status: string }>('/health');
  }

  /**
   * Get API information
   */
  async getInfo(): Promise<{ version: string; name: string }> {
    return this.client.get<{ version: string; name: string }>('/');
  }
}
