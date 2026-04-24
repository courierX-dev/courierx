# Provider Icons

Drop custom provider SVGs here. Filenames must match `ProviderType` values:

- `sendgrid.svg`
- `mailgun.svg`
- `ses.svg`
- `postmark.svg`
- `resend.svg`

SMTP has no brand — the `ProviderIcon` component falls back to a Lucide `Server` icon.

Guidelines:
- Square viewBox, ideally 24×24 or 48×48
- Single-color or full-brand both work; component does not recolor
- Keep files small (<5KB). Inline paths, no embedded bitmaps.

Consumed by `src/components/ui/provider-icon.tsx`. Missing/broken files fall
back to a Lucide `Mail` icon automatically.
