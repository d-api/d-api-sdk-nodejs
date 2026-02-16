import type { DApiClient } from '../client';
import type {
  Label,
  SyncLabelsOptions,
  UpsertLabelOptions,
  AttachLabelOptions,
  ListLabelsOptions,
  ContactLabelsOptions,
  LabelResponse,
} from '../types';

export class LabelsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Trigger a full sync of labels
   */
  async sync(options: SyncLabelsOptions): Promise<LabelResponse> {
    return this.client.post<LabelResponse>('/api/v1/labels/sync', options as unknown as Record<string, unknown>);
  }

  /**
   * Create or update a label
   */
  async upsert(options: UpsertLabelOptions): Promise<LabelResponse> {
    return this.client.post<LabelResponse>('/api/v1/labels/upsert', options as unknown as Record<string, unknown>);
  }

  /**
   * Attach or detach a label from a chat
   */
  async attach(options: AttachLabelOptions): Promise<LabelResponse> {
    return this.client.post<LabelResponse>('/api/v1/labels/attach', options as unknown as Record<string, unknown>);
  }

  /**
   * List all labels for a session
   */
  async list(options: ListLabelsOptions): Promise<Label[]> {
    const { sessionId, includeDeleted } = options;
    return this.client.get<Label[]>('/api/v1/labels/list', {
      sessionId,
      includeDeleted: includeDeleted !== undefined ? String(includeDeleted) : undefined,
    });
  }

  /**
   * List labels attached to a specific contact
   */
  async getContactLabels(options: ContactLabelsOptions): Promise<Label[]> {
    const { sessionId, phone, includeDeleted } = options;
    return this.client.get<Label[]>('/api/v1/labels/contact-labels', {
      sessionId,
      phone,
      includeDeleted: includeDeleted !== undefined ? String(includeDeleted) : undefined,
    });
  }
}
