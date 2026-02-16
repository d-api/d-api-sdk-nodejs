import type { DApiClient } from '../client';
import type { DownloadMediaOptions, MediaDownloadResponse } from '../types';

export class MediaModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * Download media (image, video, audio, document) using media info
   * If base64 is true, returns data as base64. Otherwise uploads to S3 and returns media_url.
   */
  async download(options: DownloadMediaOptions): Promise<MediaDownloadResponse> {
    return this.client.post<MediaDownloadResponse>('/api/v1/media/download', options as unknown as Record<string, unknown>);
  }
}
