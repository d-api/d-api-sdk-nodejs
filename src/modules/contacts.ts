import type { DApiClient } from '../client';
import type {
  Contact,
  ContactInfo,
  CheckNumberResult,
  GetContactOptions,
  GetAvatarOptions,
  CheckNumbersOptions,
  GetUserInfoOptions,
  UpdateBlocklistOptions,
  BlocklistResponse,
  AvatarResponse,
} from '../types';

export class ContactsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * List all contacts from WhatsApp address book
   */
  async list(options: GetContactOptions): Promise<Contact[]> {
    const { sessionId, async: asyncParam } = options;
    return this.client.get<Contact[]>('/api/v1/contacts/', {
      sessionId,
      async: asyncParam,
    });
  }

  /**
   * Get detailed information about a specific contact
   */
  async get(phone: string, options: GetContactOptions): Promise<ContactInfo> {
    const { sessionId, async: asyncParam } = options;
    return this.client.get<ContactInfo>(`/api/v1/contacts/${encodeURIComponent(phone)}`, {
      sessionId,
      async: asyncParam,
    });
  }

  /**
   * Get contact avatar
   * @param phone - Phone number
   * @param options - Options including sessionId, preview mode, and force refresh
   */
  async getAvatar(phone: string, options: GetAvatarOptions): Promise<AvatarResponse> {
    const { sessionId, preview, force, async: asyncParam } = options;
    return this.client.get<AvatarResponse>(`/api/v1/contacts/${encodeURIComponent(phone)}/avatar`, {
      sessionId,
      preview,
      force,
      async: asyncParam,
    });
  }

  /**
   * Check if phone numbers are registered on WhatsApp
   */
  async checkNumbers(options: CheckNumbersOptions): Promise<CheckNumberResult[]> {
    return this.client.post<CheckNumberResult[]>('/api/v1/contacts/check', options as unknown as Record<string, unknown>);
  }

  /**
   * Get user information (alternative method)
   */
  async getUserInfo(options: GetUserInfoOptions): Promise<ContactInfo> {
    return this.client.post<ContactInfo>('/api/v1/contacts/getuser', options as unknown as Record<string, unknown>);
  }

  /**
   * Get blocked contacts list
   */
  async getBlocklist(sessionId: string, asyncParam?: string): Promise<BlocklistResponse> {
    return this.client.get<BlocklistResponse>('/api/v1/contacts/blocklist', {
      sessionId,
      async: asyncParam,
    });
  }

  /**
   * Block or unblock a contact
   */
  async updateBlocklist(options: UpdateBlocklistOptions): Promise<BlocklistResponse> {
    return this.client.post<BlocklistResponse>('/api/v1/contacts/blocklist', options as unknown as Record<string, unknown>);
  }
}
