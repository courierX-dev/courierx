import api from "./api"

export type McpPermission =
  | "read_only"
  | "send_email"
  | "manage_providers"
  | "manage_suppressions"
  | "full_access"

export const MCP_PERMISSIONS: { value: McpPermission; label: string; description: string }[] = [
  { value: "read_only",            label: "Read only",            description: "List emails, domains, providers, templates" },
  { value: "send_email",           label: "Send emails",          description: "Send transactional emails" },
  { value: "manage_suppressions",  label: "Manage suppressions",  description: "Add or remove suppressed addresses" },
  { value: "manage_providers",     label: "Manage providers",     description: "Modify provider connections" },
  { value: "full_access",          label: "Full access",          description: "All permissions above" },
]

export interface McpConnection {
  id: string
  name: string
  description: string | null
  client_id: string
  status: "connected" | "disconnected" | "error"
  permissions: McpPermission[]
  total_emails_sent: number
  last_used_at: string | null
  created_at: string
}

export interface CreatedMcpConnection extends McpConnection {
  client_secret: string
}

export interface CreateMcpConnectionRequest {
  name: string
  description?: string
  permissions: McpPermission[]
  allowed_from_emails?: string[]
  max_emails_per_run?: number
}

export const mcpService = {
  async list(): Promise<McpConnection[]> {
    const { data } = await api.get<McpConnection[]>("/api/v1/mcp_connections")
    return data
  },
  async create(params: CreateMcpConnectionRequest): Promise<CreatedMcpConnection> {
    const { data } = await api.post<CreatedMcpConnection>("/api/v1/mcp_connections", params)
    return data
  },
  async update(id: string, params: Partial<CreateMcpConnectionRequest> & { status?: string }): Promise<McpConnection> {
    const { data } = await api.patch<McpConnection>(`/api/v1/mcp_connections/${id}`, params)
    return data
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/mcp_connections/${id}`)
  },
}
