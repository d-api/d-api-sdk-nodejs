import type { DApiClient } from '../client';
import type {
  CreateSessionOptions,
  Session,
  SessionResponse,
  QRCodeResponse,
  PairCodeResponse,
  UpdateWebhookOptions,
  UpdateWebhookConfigOptions,
  UpdateRabbitMQConfigOptions,
  IgnoreSettingsOptions,
  CallSettingsOptions,
  SessionLog,
  ApiResponse,
} from '../types';

export class SessionsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Create or start a WhatsApp session
   */
  async create(options: CreateSessionOptions): Promise<SessionResponse> {
    return this.client.post<SessionResponse>('/api/v1/sessions', options as unknown as Record<string, unknown>);
  }

  /**
   * List all sessions
   */
  async list(): Promise<Session[]> {
    return this.client.get<Session[]>('/api/v1/sessions');
  }

  /**
   * Get session details
   */
  async get(sessionId: string): Promise<Session> {
    return this.client.get<Session>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<ApiResponse> {
    return this.client.delete<ApiResponse>(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * Reconnect a session (restarts the pod)
   */
  async connect(sessionId: string): Promise<SessionResponse> {
    return this.client.get<SessionResponse>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/connect`);
  }

  /**
   * Disconnect a session without deleting it
   */
  async disconnect(sessionId: string): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/disconnect`);
  }

  /**
   * Get QR code for a session
   * @param sessionId - Session identifier
   * @param asImage - If true, returns the QR code as a PNG image URL
   */
  async getQRCode(sessionId: string, asImage?: boolean): Promise<QRCodeResponse> {
    const query = asImage ? { image: '1' } : undefined;
    return this.client.get<QRCodeResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/qr`,
      query
    );
  }

  /**
   * Get pair code for a session (phone number pairing)
   */
  async getPairCode(sessionId: string): Promise<PairCodeResponse> {
    return this.client.get<PairCodeResponse>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/pair-code`);
  }

  /**
   * Update webhook URL for a session
   */
  async updateWebhook(sessionId: string, options: UpdateWebhookOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/webhook`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Update webhook configuration for a session
   */
  async updateWebhookConfig(sessionId: string, options: UpdateWebhookConfigOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/webhook-config`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Update RabbitMQ configuration for a session
   */
  async updateRabbitMQConfig(sessionId: string, options: UpdateRabbitMQConfigOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/rabbitmq-config`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Update message filtering settings (ignore groups/status)
   */
  async updateIgnoreSettings(sessionId: string, options: IgnoreSettingsOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/ignore-settings`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Update call settings (reject calls, auto-reply message)
   */
  async updateCallSettings(sessionId: string, options: CallSettingsOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/call-settings`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Get session logs
   */
  async getLogs(sessionId: string): Promise<SessionLog[]> {
    return this.client.get<SessionLog[]>(`/api/v1/sessions/${encodeURIComponent(sessionId)}/logs`);
  }
}
