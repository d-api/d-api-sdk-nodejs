import type { DApiClient } from '../client';
import type { FullSyncOptions, OnDemandSyncOptions, HistoryResponse } from '../types';

export class HistoryModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Trigger a full history sync
   */
  async fullSync(options: FullSyncOptions): Promise<HistoryResponse> {
    const { sessionId, async: asyncParam } = options;
    return this.client.post<HistoryResponse>(
      '/api/v1/history/full-sync',
      { sessionId },
      { async: asyncParam }
    );
  }

  /**
   * Trigger an on-demand history sync
   * @param options - Options including sessionId, count (default 50), and async
   */
  async onDemandSync(options: OnDemandSyncOptions): Promise<HistoryResponse> {
    const { sessionId, count, async: asyncParam } = options;
    return this.client.post<HistoryResponse>(
      '/api/v1/history/on-demand',
      { sessionId },
      { count: count?.toString(), async: asyncParam }
    );
  }
}
