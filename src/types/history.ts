export interface FullSyncOptions {
  sessionId: string;
  async?: string;
}

export interface OnDemandSyncOptions {
  sessionId: string;
  count?: number;
  async?: string;
}

export interface HistoryResponse {
  success?: boolean;
  message?: string;
  status?: string;
}
