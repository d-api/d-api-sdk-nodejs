export type DisappearingMessagesTimer = '24h' | '7d' | '90d' | 'off';
export type ParticipantAction = 'add' | 'remove' | 'promote' | 'demote';
export type MemberAddMode = 'all' | 'admin';

export interface GroupParticipant {
  jid: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  description?: string;
  owner?: string;
  creation?: number;
  participants?: GroupParticipant[];
  announce?: boolean;
  locked?: boolean;
  ephemeralDuration?: number;
  memberAddMode?: MemberAddMode;
  joinApprovalMode?: boolean;
  inviteLink?: string;
}

export interface ListGroupsOptions {
  sessionId: string;
  participants?: boolean;
  timeout?: number;
  async?: string;
}

export interface GetGroupInfoOptions {
  sessionId: string;
  async?: string;
}

export interface CreateGroupOptions {
  sessionId: string;
  name: string;
  participants: string[];
  async?: string;
  admin_only_messages?: boolean;
  lock_settings?: boolean;
  admin_approval?: boolean;
  admin_add_only?: boolean;
  description?: string;
  picture?: string;
  disappearing_messages?: DisappearingMessagesTimer;
}

export interface ManageParticipantsOptions {
  sessionId: string;
  participants: string[];
  action: ParticipantAction;
  async?: string;
}

export interface JoinLeaveGroupOptions {
  sessionId: string;
  async?: string;
}

export interface SetGroupDescriptionOptions {
  sessionId: string;
  description: string;
  async?: string;
}

export interface SetGroupNameOptions {
  sessionId: string;
  name: string;
  async?: string;
}

export interface SetGroupPictureOptions {
  sessionId: string;
  photo: string;
  async?: string;
}

export interface SetGroupSettingsOptions {
  sessionId: string;
  announce?: boolean;
  locked?: boolean;
  joinApproval?: boolean;
  memberAddMode?: MemberAddMode;
  async?: string;
}

export interface ApproveRejectRequestsOptions {
  sessionId: string;
  participants: string[];
  async?: string;
}

export interface GroupResponse {
  success?: boolean;
  message?: string;
  groupId?: string;
  inviteLink?: string;
}
