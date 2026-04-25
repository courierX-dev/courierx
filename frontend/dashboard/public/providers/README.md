# Provider Icons

Static brand SVGs for use outside the React tree (email templates, OG images,
public marketing pages). The dashboard does **not** read from this folder —
`src/components/ui/provider-icon.tsx` inlines the brand path data so it can
recolor based on connection status (`active` / `inactive` / `error`).

Files here mirror the inline data and are sourced from
[simple-icons](https://simpleicons.org) (Postmark crafted manually since it
isn't in the simple-icons set):

- `sendgrid.svg` — `#1A82E2`
- `mailgun.svg`  — `#F06B66`
- `ses.svg`      — `#FF9900`
- `postmark.svg` — `#FFDE00`
- `resend.svg`   — `#000000`

SMTP has no brand — the `ProviderIcon` component falls back to a Lucide
`Server` icon and is not represented here.

When updating a brand mark, update **both** the SVG file here and the inline
`paths` entry in `BRAND` inside `provider-icon.tsx`.
