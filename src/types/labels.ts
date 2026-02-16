export interface Label {
  id: number;
  name: string;
  color: number;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncLabelsOptions {
  sessionId: string;
  async?: string;
}

export interface UpsertLabelOptions {
  sessionId: string;
  label_id: number;
  name?: string;
  color?: number;
  deleted?: boolean;
  async?: string;
}

export interface AttachLabelOptions {
  sessionId: string;
  phone: string;
  label_id: number;
  labeled?: boolean;
  async?: string;
}

export interface ListLabelsOptions {
  sessionId: string;
  includeDeleted?: boolean;
}

export interface ContactLabelsOptions {
  sessionId: string;
  phone: string;
  includeDeleted?: boolean;
}

export interface LabelResponse {
  success?: boolean;
  message?: string;
  labels?: Label[];
}
