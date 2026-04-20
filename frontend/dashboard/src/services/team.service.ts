import api from "./api"

export interface TeamMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: string
  joined_at: string
}

export interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  invite_url?: string
}

export interface CreateInvitationParams {
  email: string
  role: string
}

export interface InvitationPublic {
  email: string
  role: string
  tenant_name: string
  status: string
  expires_at: string
}

export const teamService = {
  async listMembers(): Promise<TeamMember[]> {
    const { data } = await api.get<TeamMember[]>("/api/v1/team_members")
    return data
  },

  async updateMemberRole(id: string, role: string): Promise<TeamMember> {
    const { data } = await api.patch<TeamMember>(`/api/v1/team_members/${id}`, { role })
    return data
  },

  async removeMember(id: string): Promise<void> {
    await api.delete(`/api/v1/team_members/${id}`)
  },

  async listInvitations(status?: string): Promise<Invitation[]> {
    const { data } = await api.get<Invitation[]>("/api/v1/invitations", {
      params: status ? { status } : undefined,
    })
    return data
  },

  async createInvitation(params: CreateInvitationParams): Promise<Invitation> {
    const { data } = await api.post<Invitation>("/api/v1/invitations", params)
    return data
  },

  async revokeInvitation(id: string): Promise<Invitation> {
    const { data } = await api.post<Invitation>(`/api/v1/invitations/${id}/revoke`)
    return data
  },

  async resendInvitation(id: string): Promise<Invitation> {
    const { data } = await api.post<Invitation>(`/api/v1/invitations/${id}/resend`)
    return data
  },

  async getInvitation(token: string): Promise<InvitationPublic> {
    const { data } = await api.get<InvitationPublic>(`/api/v1/invitations/${token}`)
    return data
  },

  async acceptInvitation(token: string, userParams: {
    first_name?: string
    last_name?: string
    password?: string
  }): Promise<{ user: { id: string; email: string }; tenant: { id: string; name: string }; membership: { role: string } }> {
    const { data } = await api.post(`/api/v1/invitations/${token}/accept`, userParams)
    return data
  },
}
