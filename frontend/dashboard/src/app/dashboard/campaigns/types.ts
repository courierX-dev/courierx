export interface CampaignGroup {
  subject: string
  totalSent: number
  delivered: number
  bounced: number
  failed: number
  openRate: number
  status: string
  lastActivity: string
  recipients: string[]
  tags: string[]
  sampleEmailId: string
  fromEmail: string
  provider: string | null
  providerDisplayName: string | null
}
