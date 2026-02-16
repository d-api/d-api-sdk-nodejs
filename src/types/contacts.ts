export type BlockAction = 'block' | 'unblock';

export interface Contact {
  jid: string;
  phone: string;
  name?: string;
  pushName?: string;
  businessName?: string;
  isBlocked?: boolean;
  isContact?: boolean;
  avatar?: string;
}

export interface ContactInfo {
  jid: string;
  phone: string;
  name?: string;
  pushName?: string;
  businessName?: string;
  status?: string;
  avatar?: string;
  isOnWhatsApp?: boolean;
  verifiedLevel?: number;
}

export interface CheckNumberResult {
  phone: string;
  jid?: string;
  isOnWhatsApp: boolean;
}

export interface GetContactOptions {
  sessionId: string;
  async?: string;
}

export interface GetAvatarOptions {
  sessionId: string;
  preview?: string;
  force?: string;
  async?: string;
}

export interface CheckNumbersOptions {
  sessionId: string;
  numbers: string[];
  async?: string;
}

export interface GetUserInfoOptions {
  sessionId: string;
  phone: string;
  async?: string;
}

export interface UpdateBlocklistOptions {
  sessionId: string;
  phone: string;
  action: BlockAction;
  async?: string;
}

export interface BlocklistEntry {
  jid: string;
  phone: string;
}

export interface BlocklistResponse {
  blocklist: BlocklistEntry[];
}

export interface AvatarResponse {
  avatar?: string;
  previewAvatar?: string;
}
