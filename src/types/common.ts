export interface ContextInfo {
  stanzaId?: string;
  participant?: string;
  mentionedJid?: string[];
  quotedMessage?: {
    conversation?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BaseMessageOptions {
  sessionId: string;
  to: string;
  contextInfo?: ContextInfo;
  mentionAll?: boolean;
  async?: string;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export type SortOrder = 'asc' | 'desc';
