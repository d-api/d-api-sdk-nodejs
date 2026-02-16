export type ConnectionMode = 'qr' | 'pair';
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'qr_ready' | 'pair_code_ready';

export interface WebhookEventConfig {
  enabled: boolean;
  webhookUrl?: string;
}

export interface WebhookConfig {
  enabled: boolean;
  type: string;
  events: Record<string, WebhookEventConfig>;
}

export interface RabbitMQEventConfig {
  enabled: boolean;
}

export interface RabbitMQConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  vhost?: string;
  exchange?: string;
  routingKey?: string;
  events?: Record<string, RabbitMQEventConfig>;
}

export interface CreateSessionOptions {
  sessionId: string;
  webhookUrl?: string;
  webhookConfig?: WebhookConfig;
  metadata?: Record<string, unknown>;
  provider?: 'whatsmeow';
  connectionMode?: ConnectionMode;
  pairPhone?: string;
  historySync?: boolean;
  ignoreGroups?: boolean;
  ignoreStatus?: boolean;
}

export interface Session {
  id: string;
  sessionId: string;
  status: SessionStatus;
  provider: string;
  webhookUrl?: string;
  webhookConfig?: WebhookConfig;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  name?: string;
  qrCode?: string;
  qrCodeImage?: string;
  qrCodeUpdatedAt?: string;
  pairCode?: string;
  pairPhone?: string;
  pairCodeUpdatedAt?: string;
  connectionMode?: ConnectionMode;
}

export interface SessionResponse {
  message: string;
  sessionId: string;
  provider: string;
  status?: SessionStatus;
  qrCode?: string;
  qrCodeImage?: string;
  pairCode?: string;
}

export interface QRCodeResponse {
  sessionId: string;
  status: SessionStatus;
  qrCode?: string;
  qrCodeImage?: string;
  qrCodeUpdatedAt?: string;
}

export interface PairCodeResponse {
  sessionId: string;
  status: SessionStatus;
  pairCode?: string;
  pairPhone?: string;
  pairCodeUpdatedAt?: string;
  connectionMode: ConnectionMode;
}

export interface UpdateWebhookOptions {
  webhookUrl: string;
}

export interface UpdateWebhookConfigOptions {
  enabled: boolean;
  type?: string;
  events?: Record<string, WebhookEventConfig>;
}

export interface UpdateRabbitMQConfigOptions extends Partial<RabbitMQConfig> {
  enabled: boolean;
}

export interface IgnoreSettingsOptions {
  ignoreGroups?: boolean;
  ignoreStatus?: boolean;
}

export interface CallSettingsOptions {
  rejectCalls?: boolean;
  rejectCallsMessage?: string;
}

export interface SessionLog {
  id: string;
  sessionId: string;
  level: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
