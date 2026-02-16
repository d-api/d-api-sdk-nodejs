export type IntegrationType = 'S3';

export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
  sslEnabled?: boolean;
}

export interface Integration {
  id: string;
  integrationName: string;
  integrationType: IntegrationType;
  config: S3Config;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationOptions {
  integrationName: string;
  integrationType: IntegrationType;
  config: S3Config;
}

export interface UpdateIntegrationOptions {
  integrationName?: string;
  config?: Partial<S3Config>;
  isActive?: boolean;
}

export interface TestS3ConnectionOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
  sslEnabled?: boolean;
}

export interface TestRabbitMQConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
  ssl?: boolean;
}

export interface IntegrationResponse {
  success?: boolean;
  message?: string;
  integration?: Integration;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
}
