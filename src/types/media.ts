export interface DownloadMediaOptions {
  sessionId: string;
  url?: string;
  direct_path?: string;
  media_key: string;
  mimetype: string;
  file_enc_sha256?: string;
  file_sha256?: string;
  file_length?: number;
  async?: string;
  base64?: boolean;
}

export interface MediaDownloadResponse {
  success?: boolean;
  message?: string;
  media_url?: string;
  base64?: string;
  mimetype?: string;
  fileName?: string;
}
