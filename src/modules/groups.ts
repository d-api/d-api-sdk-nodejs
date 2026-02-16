import type { DApiClient } from '../client';
import type {
  Group,
  ListGroupsOptions,
  GetGroupInfoOptions,
  CreateGroupOptions,
  ManageParticipantsOptions,
  JoinLeaveGroupOptions,
  SetGroupDescriptionOptions,
  SetGroupNameOptions,
  SetGroupPictureOptions,
  SetGroupSettingsOptions,
  ApproveRejectRequestsOptions,
  GroupResponse,
  ApiResponse,
} from '../types';

export class GroupsModule {
  constructor(private readonly client: DApiClient) {}

  /**
   * List all WhatsApp groups for a session
   */
  async list(options: ListGroupsOptions): Promise<Group[]> {
    const { sessionId, participants, timeout, async: asyncParam } = options;
    return this.client.get<Group[]>('/api/v1/groups/list', {
      sessionId,
      participants: participants ? 'true' : undefined,
      timeout: timeout?.toString(),
      async: asyncParam,
    });
  }

  /**
   * Get detailed information about a specific group
   */
  async getInfo(groupId: string, options: GetGroupInfoOptions): Promise<Group> {
    const { sessionId, async: asyncParam } = options;
    return this.client.get<Group>(`/api/v1/groups/${encodeURIComponent(groupId)}/info`, {
      sessionId,
      async: asyncParam,
    });
  }

  /**
   * Create a new WhatsApp group with participants and advanced settings
   */
  async create(options: CreateGroupOptions): Promise<GroupResponse> {
    return this.client.post<GroupResponse>('/api/v1/groups/create', options as unknown as Record<string, unknown>);
  }

  /**
   * Manage group participants (add, remove, promote, demote)
   */
  async manageParticipants(groupId: string, options: ManageParticipantsOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/participants`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Join a group using group ID
   */
  async join(groupId: string, options: JoinLeaveGroupOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/join`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Leave a group
   */
  async leave(groupId: string, options: JoinLeaveGroupOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/leave`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Get group invite link
   */
  async getInviteLink(groupId: string, sessionId: string, asyncParam?: string): Promise<GroupResponse> {
    return this.client.get<GroupResponse>(`/api/v1/groups/${encodeURIComponent(groupId)}/invite`, {
      sessionId,
      async: asyncParam,
    });
  }

  /**
   * Revoke group invite link (generates a new one)
   */
  async revokeInviteLink(groupId: string, options: JoinLeaveGroupOptions): Promise<GroupResponse> {
    return this.client.post<GroupResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/invite/revoke`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Set group description/topic
   */
  async setDescription(groupId: string, options: SetGroupDescriptionOptions): Promise<ApiResponse> {
    return this.client.put<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/description`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Set group name (subject)
   */
  async setName(groupId: string, options: SetGroupNameOptions): Promise<ApiResponse> {
    return this.client.put<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/name`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Set group profile picture (accepts base64 or URL)
   */
  async setPicture(groupId: string, options: SetGroupPictureOptions): Promise<ApiResponse> {
    return this.client.put<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/profile-picture`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Set group privacy settings (announce, locked, joinApproval, memberAddMode)
   */
  async setSettings(groupId: string, options: SetGroupSettingsOptions): Promise<ApiResponse> {
    return this.client.put<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/settings`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Approve join requests
   */
  async approveJoinRequests(groupId: string, options: ApproveRejectRequestsOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/join-requests/approve`,
      options as unknown as Record<string, unknown>
    );
  }

  /**
   * Reject join requests
   */
  async rejectJoinRequests(groupId: string, options: ApproveRejectRequestsOptions): Promise<ApiResponse> {
    return this.client.post<ApiResponse>(
      `/api/v1/groups/${encodeURIComponent(groupId)}/join-requests/reject`,
      options as unknown as Record<string, unknown>
    );
  }
}
