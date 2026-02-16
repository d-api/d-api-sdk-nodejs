import type { DApiClient } from '../client';
import type {
  Integration,
  CreateIntegrationOptions,
  UpdateIntegrationOptions,
  TestS3ConnectionOptions,
  TestRabbitMQConnectionOptions,
  IntegrationResponse,
  ConnectionTestResponse,
} from '../types';

export class IntegrationsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * List all integrations
   */
  async list(): Promise<Integration[]> {
    return this.client.get<Integration[]>('/api/v1/integrations');
  }

  /**
   * Get a specific integration
   */
  async get(id: string): Promise<Integration> {
    return this.client.get<Integration>(`/api/v1/integrations/${encodeURIComponent(id)}`);
  }

  /**
   * Create a new integration (S3)
   */
  async create(options: CreateIntegrationOptions): Promise<IntegrationResponse> {
    return this.client.post<IntegrationResponse>('/api/v1/integrations', options as unknown as Record<string, unknown>);
  }

  /**
   * Update an existing integration
   */
  async update(id: string, options: UpdateIntegrationOptions): Promise<IntegrationResponse> {
    return this.client.patch<IntegrationResponse>(
      `/api/v1/integrations/${encodeURIComponent(id)}`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Delete an integration
   */
  async delete(id: string): Promise<IntegrationResponse> {
    return this.client.delete<IntegrationResponse>(`/api/v1/integrations/${encodeURIComponent(id)}`);
  }

  /**
   * Test S3/MinIO connection
   */
  async testS3Connection(options: TestS3ConnectionOptions): Promise<ConnectionTestResponse> {
    return this.client.post<ConnectionTestResponse>('/api/v1/integrations/test-s3', options as unknown as Record<string, unknown>);
  }

  /**
   * Test RabbitMQ connection
   */
  async testRabbitMQConnection(options: TestRabbitMQConnectionOptions): Promise<ConnectionTestResponse> {
    return this.client.post<ConnectionTestResponse>('/api/v1/rabbitmq/test-connection', options as unknown as Record<string, unknown>);
  }
}
