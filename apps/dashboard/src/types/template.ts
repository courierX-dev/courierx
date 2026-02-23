export interface Template {
  id: string
  name: string
  subject: string
  html_body: string
  text_body?: string
  variables: string[]
  created_at: string
  updated_at: string
}
