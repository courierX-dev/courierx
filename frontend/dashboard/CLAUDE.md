# CourierX Frontend — Claude Code Context

## Location
`frontend/dashboard/` — Next.js 14 App Router dashboard for the CourierX platform.

> Do NOT touch `marketing/CourierX/` or `marketing/CourierX-docs/` — separate apps.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix primitives) + custom components in `src/components/ui/` |
| Server state | TanStack Query v5 (`@tanstack/react-query`) |
| Client state | Zustand v5 |
| Forms | React Hook Form v7 + Zod v4 |
| Charts | Recharts v3 |
| HTTP | Axios (via `src/services/api.ts`) |
| Toasts | Sonner |
| Icons | Lucide React |
| Themes | next-themes (dark/light) |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Root redirect
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── verify/page.tsx
│   ├── onboarding/
│   │   ├── workspace/page.tsx
│   │   └── project/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard shell (sidebar + topbar)
│   │   ├── page.tsx            # Redirect → /dashboard/overview
│   │   ├── overview/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── logs/page.tsx
│   │   ├── routing/page.tsx
│   │   ├── domains/page.tsx
│   │   ├── webhooks/page.tsx
│   │   ├── suppressions/page.tsx
│   │   ├── api-keys/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── compliance/page.tsx
│   │   ├── profile/page.tsx
│   │   └── settings/page.tsx
│   └── admin/
│       ├── page.tsx
│       ├── store.ts
│       └── tenants/
│           ├── page.tsx
│           └── [id]/page.tsx
├── components/
│   ├── ui/                     # Base design system (shadcn + custom)
│   ├── dashboard/              # Feature-specific components
│   ├── layout/                 # Shell components (sidebar, header, topbar)
│   └── providers/              # React context / query providers
├── hooks/                      # Custom hooks (create if missing)
│   ├── use-auth.ts
│   └── use-[feature].ts        # One hook file per feature domain
├── services/                   # Axios service layer — one file per domain
│   ├── api.ts                  # Axios instance, interceptors, base URL
│   ├── auth.service.ts
│   ├── providers.service.ts
│   ├── api-keys.service.ts
│   ├── dashboard.service.ts
│   ├── domains.service.ts
│   ├── emails.service.ts
│   ├── suppressions.service.ts
│   └── webhooks.service.ts
├── stores/                     # Zustand stores (create if missing)
│   ├── auth.store.ts           # Auth state, current tenant/project
│   └── ui.store.ts             # Sidebar open state, modals, etc.
├── types/                      # Global TypeScript types
│   ├── api-key.ts
│   ├── auth.ts
│   ├── metrics.ts
│   ├── provider.ts
│   └── template.ts
├── lib/
│   ├── utils.ts                # cn(), formatting helpers
│   └── mock-data.ts            # Temporary — replace with real API calls
└── middleware.ts               # Route protection
```

---

## API Integration

### Base Config (`src/services/api.ts`)
- Rails Control Plane runs at `http://localhost:4000` in development
- All requests use Bearer token from auth store
- Auth header: `Authorization: Bearer <jwt_token>`
- API key auth header: `X-API-Key: cxk_*`

### Auth Flow
1. `POST /api/v1/auth/login` → returns JWT
2. Store JWT in Zustand auth store + localStorage
3. Axios interceptor attaches token to every request
4. `middleware.ts` redirects unauthenticated users to `/login`
5. On 401 response → clear store → redirect to `/login`

### Key API Endpoints (Rails Control Plane)
```
POST   /api/v1/auth/login
POST   /api/v1/auth/signup
POST   /api/v1/auth/verify

GET    /api/v1/provider_connections
POST   /api/v1/provider_connections
DELETE /api/v1/provider_connections/:id

GET    /api/v1/routing_rules
POST   /api/v1/routing_rules
PATCH  /api/v1/routing_rules/:id
DELETE /api/v1/routing_rules/:id

GET    /api/v1/api_keys
POST   /api/v1/api_keys
DELETE /api/v1/api_keys/:id

GET    /api/v1/domains
POST   /api/v1/domains
DELETE /api/v1/domains/:id

GET    /api/v1/webhooks
POST   /api/v1/webhooks
PATCH  /api/v1/webhooks/:id
DELETE /api/v1/webhooks/:id

GET    /api/v1/suppressions
POST   /api/v1/suppressions
DELETE /api/v1/suppressions/:id

GET    /api/v1/emails/logs
GET    /api/v1/dashboard/metrics
GET    /api/v1/dashboard/analytics
```

---

## State Management Rules

### TanStack Query — server state only
Use for ALL data fetched from the Rails API. Do not use `useEffect` + `useState` for API calls.

```ts
// Pattern: one query hook per resource in src/hooks/
export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => providersService.getAll(),
  })
}

export function useCreateProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: providersService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  })
}
```

### Zustand — client/UI state only
Use for: auth session, current tenant context, sidebar open/closed, modal state.
Do NOT use Zustand for data that comes from the API.

```ts
// src/stores/auth.store.ts
interface AuthStore {
  token: string | null
  tenant: Tenant | null
  setToken: (token: string) => void
  logout: () => void
}
```

---

## Component Conventions

### File structure within a page
```
dashboard/routing/
├── page.tsx                    # Page shell — layout, headings, data fetch trigger
├── routing-rules-table.tsx     # Feature component
├── create-rule-dialog.tsx      # Dialog/modal for creation
└── use-routing.ts              # Local hook if needed (or in src/hooks/)
```

### shadcn usage
- Import from `@/components/ui/` — never directly from radix
- Extend shadcn components in `src/components/ui/` rather than overriding inline
- Use `cn()` from `src/lib/utils.ts` for conditional classnames — always

### Custom UI components already in place
- `badge.tsx` — status/mode indicators
- `status-badge.tsx` — provider/delivery status
- `mode-badge.tsx` — live/test mode
- `dot-indicator.tsx` — active/inactive dot
- `trust-score.tsx` — provider reliability score
- Extend these before creating new variants

---

## Design System

### Aesthetic
Developer-tool. Dark-first. Inspired by Linear, Resend, Railway.
Dense, precise, utilitarian — never decorative or marketing-site-like.

### Theme
- Dark mode is default
- Use `next-themes` for toggle — never hardcode colors
- All colors via CSS variables (`--background`, `--foreground`, `--muted`, etc.)
- Tailwind classes only — no inline styles

### Typography
- UI labels, nav, buttons: clean sans (system or configured font)
- All technical values (API keys, IDs, email addresses, log lines, tokens): `font-mono`
- Never render `cxk_*` keys or UUIDs in a sans font

### Spacing & Density
- Dashboard pages: compact, data-dense
- Forms/onboarding: more breathable, wider max-width
- Table rows: tight padding — these are power-user views

### Motion
- Subtle only: skeleton loaders on data fetch, smooth dialog open/close
- No decorative animation — this is a tool, not a marketing site
- Use `tw-animate-css` utilities where needed

---

## BYOK (Bring Your Own Keys) — Priority Feature

This is Wave's ownership area. The BYOK flow connects tenant-owned provider credentials.

### Providers supported
`sendgrid` | `mailgun` | `ses` | `postmark` | `resend` | `smtp`

### Per-provider credential fields
| Provider | Fields |
|---|---|
| SendGrid | `api_key` |
| Mailgun | `api_key`, `smtp_host` (sending domain), `region` (us/eu) |
| SES | `api_key` (access key ID), `secret` (secret access key), `region` (AWS region) |
| Postmark | `api_key` |
| Resend | `api_key` |
| SMTP | `smtp_host`, `smtp_port`, `api_key` (username), `secret` (password) |

### Missing page
`/dashboard/providers` does not exist yet — needs to be created.
This is the BYOK management screen: list connections, add new, delete, show status.

---

## Pages — Status & Notes

| Route | Status | Notes |
|---|---|---|
| `/login` | exists | verify it calls `auth.service.ts` correctly |
| `/signup` | exists | — |
| `/verify` | exists | email verification flow |
| `/onboarding/workspace` | exists | first-time setup |
| `/onboarding/project` | exists | — |
| `/dashboard/overview` | exists | uses mock data — wire to `dashboard.service.ts` |
| `/dashboard/analytics` | exists | uses mock data — wire to real API |
| `/dashboard/logs` | exists | wire to `emails.service.ts` logs endpoint |
| `/dashboard/routing` | exists | wire to routing rules API |
| `/dashboard/domains` | exists | wire to `domains.service.ts` |
| `/dashboard/webhooks` | exists | wire to `webhooks.service.ts` |
| `/dashboard/suppressions` | exists | wire to `suppressions.service.ts` |
| `/dashboard/api-keys` | exists | wire to `api-keys.service.ts` |
| `/dashboard/billing` | exists | Paddle integration (future) |
| `/dashboard/compliance` | exists | — |
| `/dashboard/profile` | exists | — |
| `/dashboard/settings` | exists | — |
| `/dashboard/providers` | **MISSING** | BYOK screen — needs to be built |
| `/admin` | exists | internal admin panel |
| `/admin/tenants` | exists | — |

---

## UI States — Required for Every Screen

Every page and data-driven component MUST handle all of the following states. Never ship a screen that only handles the happy path.

---

### 1. Loading State
Use skeleton loaders — never spinners for page-level content.

```tsx
// Table skeleton
if (isLoading) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  )
}
```

Rules:
- Tables → skeleton rows matching expected row height
- Stat cards → skeleton matching card dimensions
- Forms in dialogs → skeleton inputs while data loads (edit flows)
- Charts → fixed-height skeleton block, not a spinner
- Inline mutations (delete, toggle) → disable the trigger element + show a subtle spinner on it only

---

### 2. Empty State
Every list, table, and data view needs an empty state. Empty states are NOT just "No data found." — they should be contextual and actionable.

```tsx
// Pattern
if (!isLoading && data?.length === 0) {
  return <EmptyState ... />
}
```

Per-screen empty state copy and CTA:

| Screen | Heading | Subtext | CTA |
|---|---|---|---|
| Providers | No providers connected | Connect a provider to start sending emails | Connect provider |
| Routing rules | No routing rules | Rules define how emails are routed across providers | Create rule |
| API keys | No API keys | Generate a key to authenticate server-side requests | Generate key |
| Domains | No domains | Add a sending domain to improve deliverability | Add domain |
| Webhooks | No webhooks | Receive delivery events in your own systems | Add webhook |
| Suppressions | No suppressions | Suppressed addresses are excluded from all sends | Add suppression |
| Logs | No logs yet | Email delivery logs will appear here once you start sending | — |
| Analytics | No data yet | Analytics will populate as emails are sent | — |

Empty state component structure:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="mb-4 h-10 w-10 text-muted-foreground" />
  <h3 className="text-sm font-medium">{heading}</h3>
  <p className="mt-1 text-sm text-muted-foreground max-w-xs">{subtext}</p>
  {cta && <Button className="mt-4" size="sm" onClick={cta.onClick}>{cta.label}</Button>}
</div>
```

---

### 3. Error State
When a query fails, show an inline error — not a toast, not a blank screen.

```tsx
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
      <h3 className="text-sm font-medium">Failed to load</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {error?.message ?? 'Something went wrong. Please try again.'}
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
        Retry
      </Button>
    </div>
  )
}
```

Rules:
- Always include a **Retry** button that calls `refetch()`
- Show the actual error message if it's user-readable; fallback to generic copy otherwise
- Never show raw stack traces or Rails error payloads to the user
- Network errors (`ERR_CONNECTION_REFUSED`) → show "Could not reach server"

---

### 4. Mutation Feedback States

Every create / update / delete action needs all four states handled:

| State | Behaviour |
|---|---|
| **Idle** | Normal button label |
| **Pending** | Button disabled + spinner + "Saving…" / "Deleting…" label |
| **Success** | Sonner toast ("Provider connected", "Rule created", etc.) + query invalidation |
| **Error** | Sonner toast with error message + button re-enabled |

```tsx
<Button disabled={isPending} onClick={handleSubmit}>
  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save'}
</Button>
```

---

### 5. Confirmation State (Destructive Actions)

All delete / disconnect / revoke actions require a confirmation dialog before executing.

```tsx
// Pattern — use shadcn AlertDialog, not a basic Dialog
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "{rule.name}". This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-destructive">
        {isPending ? 'Deleting…' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Never delete/revoke/disconnect on a single click.

---

### 6. Disabled / Locked State

Some features are gated (billing tier, setup incomplete, etc.).

```tsx
// Visually indicate unavailability without hiding the feature
<Button disabled title="Upgrade to Pro to use this feature">
  Connect provider
</Button>
// Or show a lock badge on the nav item
```

Rules:
- Show the feature exists but indicate why it's unavailable
- Never silently hide features — always explain the condition

---

### 7. First-Run / Onboarding Nudge State

For screens where the empty state is also the very first experience (providers, routing rules, API keys), the empty state should guide the user toward completing setup, not just show a blank state.

- Providers empty → nudge to connect at least one provider before sending works
- Routing rules empty → nudge to create a rule if providers are connected
- API keys empty → nudge to generate a key to start integrating

Link these nudges where appropriate: e.g. empty providers screen links to the docs or the connect dialog directly.

---

### State Priority Order

When multiple states could apply, render in this order:
1. Loading (skeleton)
2. Error (inline error + retry)
3. Empty (empty state + CTA)
4. Data (happy path)

---

## When Adding a New Feature

1. Define or update types in `src/types/`
2. Add/update service method in `src/services/`
3. Create query/mutation hooks in `src/hooks/`
4. Build UI components in `src/components/dashboard/` or co-located in page folder
5. Wire page in `src/app/dashboard/[feature]/page.tsx`
6. Invalidate relevant query keys on mutations

## When Wiring an Existing Mock Page to Real API

1. Check `src/lib/mock-data.ts` for the shape being used
2. Match that shape in the corresponding service + type files
3. Replace mock import with a `useQuery` hook
4. Add loading skeleton + error state
5. Remove mock usage once confirmed working

---

## Environment Variables

Create `frontend/dashboard/.env.local` — never commit this file.

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:4000   # Rails Control Plane base URL

# Optional / future
NEXT_PUBLIC_APP_ENV=development             # development | staging | production
NEXT_PUBLIC_POSTHOG_KEY=                   # analytics (future)
```

Rules:
- `NEXT_PUBLIC_API_URL` is the only place the API base URL lives — import it in `src/services/api.ts` only
- Never reference `localhost:4000` directly anywhere else in the codebase
- All public env vars must be prefixed `NEXT_PUBLIC_` to be available client-side

---

## API Response Shape Contract

Rails returns JSON without an envelope wrapper by default. Assume these shapes until confirmed otherwise:

```ts
// List response (arrays returned directly)
GET /api/v1/routing_rules → RoutingRule[]

// Single resource
GET /api/v1/routing_rules/:id → RoutingRule

// Pagination (if/when added) — expect this shape
{
  data: RoutingRule[]
  meta: {
    total: number
    page: number
    per_page: number
  }
}

// Error response from Rails
{
  error: string        // human-readable message
  errors?: string[]   // field-level errors (validation failures)
}

// Auth response
{
  token: string
  tenant: Tenant
  user: User
}
```

When consuming errors from Axios:
```ts
// In services, extract the Rails error message
const message = error.response?.data?.error ?? 'Something went wrong'
```

---

## Form Conventions

All forms use React Hook Form + Zod. No exceptions.

### Pattern
```ts
// 1. Define schema in the component file or a separate schemas/ file
const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  strategy: z.enum(['priority', 'round_robin', 'failover']),
  provider_id: z.string().uuid('Select a provider'),
})

type CreateRuleForm = z.infer<typeof createRuleSchema>

// 2. Wire to RHF
const form = useForm<CreateRuleForm>({
  resolver: zodResolver(createRuleSchema),
  defaultValues: { name: '', strategy: 'priority' },
})

// 3. Map server errors back onto fields
const mutation = useCreateRule()
const onSubmit = async (data: CreateRuleForm) => {
  try {
    await mutation.mutateAsync(data)
  } catch (error) {
    const serverError = error.response?.data?.error
    if (serverError) form.setError('root', { message: serverError })
  }
}
```

### Field-level error display
Always use `<FormMessage />` from shadcn form — never custom error divs.

### Server error display
Render root-level server errors above the submit button:
```tsx
{form.formState.errors.root && (
  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
)}
```

### Required fields
- Mark required fields visually with `*` in the label
- Never rely on browser native validation — Zod handles it all

---

## Sensitive Value Display

API keys (`cxk_*`), secrets, tokens, and credentials must follow this pattern everywhere.

### Rules
- Always mask on initial display: `cxk_••••••••••••••••`
- Provide a **copy to clipboard** button — never ask the user to manually select/copy
- Provide a **reveal toggle** (eye icon) for short-lived display
- Never log or expose full values in error messages or toasts
- Show full value only once after creation (in a dialog), then mask forever

### Copy to clipboard pattern
```tsx
const [copied, setCopied] = useState(false)

const handleCopy = async () => {
  await navigator.clipboard.writeText(value)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

<button onClick={handleCopy} className="...">
  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
</button>
```

### Post-creation reveal dialog
When a new API key or credential is created, show it once in a modal with:
- Full value in a `font-mono` read-only input
- Copy button
- Warning: "This value will not be shown again"
- Confirm checkbox before dismissing ("I have copied this key")

---

## Tables — Pagination, Filtering & Search

For data-heavy screens (logs, suppressions, API keys), implement these consistently.

### Pagination
```ts
// Query hook with page param
export function useLogs(page = 1, perPage = 25) {
  return useQuery({
    queryKey: ['logs', page, perPage],
    queryFn: () => emailsService.getLogs({ page, per_page: perPage }),
  })
}
```

- Default page size: **25 rows**
- Use simple prev/next pagination — no infinite scroll on dashboard tables
- Show total count: "Showing 1–25 of 312"
- Keep page in URL search params (`?page=2`) so browser back works

### Filtering
- Filters live in URL search params — not component state
- Use `useSearchParams` from Next.js, not `useState`
- Apply filters debounced (300ms) for text inputs

### Search
- Search inputs debounce 300ms before firing
- Show a clear (×) button when search has a value
- Preserve search term in URL: `?q=failed`

### Applicable screens
| Screen | Pagination | Search | Filters |
|---|---|---|---|
| Logs | yes (25/page) | by email address | status, provider, date range |
| Suppressions | yes (25/page) | by email address | reason |
| API keys | no (unlikely to exceed 10) | — | — |
| Routing rules | no | — | — |
| Webhooks | no | — | — |

---

## Toast Notification Guidelines (Sonner)

### When to use toast vs inline

| Situation | Use |
|---|---|
| Successful mutation (create, update, delete) | Toast (success) |
| Mutation error (server returned error) | Toast (error) + re-enable form |
| Page-level data fetch failure | Inline error state (not toast) |
| Clipboard copy | Toast ("Copied to clipboard") |
| Session expired (401) | Toast (warning) + redirect to login |
| Background sync / refresh | Silent — no toast |

### Copy patterns
```ts
// Success
toast.success('Provider connected')
toast.success('Rule created')
toast.success('API key generated')
toast.success('Copied to clipboard')

// Error
toast.error('Failed to connect provider. Check your credentials.')
toast.error(error.response?.data?.error ?? 'Something went wrong')

// Warning
toast.warning('Session expired. Please sign in again.')
```

Rules:
- Keep success toasts to 3 words max where possible
- Error toasts must be actionable — tell the user what went wrong
- Never show a toast for read operations (GET requests)
- Never show both a toast AND an inline error for the same failure

---

## Route Protection & Middleware

`src/middleware.ts` handles all route protection. Rules:

```
Public routes (no auth required):
  /login
  /signup
  /verify

Onboarding routes (auth required, but redirect after onboarding complete):
  /onboarding/workspace
  /onboarding/project

Protected routes (auth required + onboarding complete):
  /dashboard/*
  /admin/* (auth required + admin role)

Default redirect:
  Unauthenticated → /login
  Authenticated + onboarding incomplete → /onboarding/workspace
  Authenticated + onboarding complete → /dashboard/overview
```

### Onboarding gate
After login, check if `tenant.onboarding_complete` (or equivalent flag from auth response) is true.
If false → redirect to `/onboarding/workspace` even if user tries to access `/dashboard/*` directly.

### Admin gate
`/admin/*` routes are only accessible to users with `role: 'admin'` on their membership.
Redirect non-admins who hit `/admin/*` to `/dashboard/overview`.

---

## Multi-Tenancy in the Frontend

Every authenticated session belongs to one tenant. The tenant context must be available globally.

### Auth store shape
```ts
interface AuthStore {
  token: string | null
  user: User | null
  tenant: Tenant | null          // current tenant
  membership: Membership | null  // current user's role in this tenant
  setSession: (token: string, user: User, tenant: Tenant, membership: Membership) => void
  logout: () => void
}
```

### Tenant-scoped queries
All API calls are automatically tenant-scoped on the Rails side via the JWT.
Frontend does NOT need to pass `tenant_id` manually — the Bearer token encodes it.

### Role-based UI
Use `membership.role` to show/hide destructive or admin-only actions:
```ts
const { membership } = useAuthStore()
const isAdmin = membership?.role === 'admin'

// Hide delete buttons for non-admins
{isAdmin && <Button variant="destructive">Delete workspace</Button>}
```

Roles: `admin` | `member` (from Rails `Membership::ROLES`)

---

## Accessibility Baseline

Every component must meet these minimum requirements:

### Keyboard navigation
- All interactive elements reachable by Tab
- Dialogs trap focus when open — shadcn Dialog handles this automatically
- Close dialogs with Escape key — shadcn handles this automatically
- Tables: arrow key navigation not required, but row actions must be keyboard accessible

### ARIA
- Icon-only buttons must have `aria-label`: `<Button aria-label="Delete rule"><Trash2 /></Button>`
- Status badges must not rely on color alone — include text label alongside color dot
- `dot-indicator.tsx` must include `aria-label="Active"` or `aria-label="Inactive"`
- Loading skeletons: wrap with `aria-busy="true"` on the container

### Focus management
- When a dialog closes after a successful mutation, return focus to the trigger element
- After deleting a table row, move focus to the next row or the table itself

### Contrast
- Never use `text-muted-foreground` for critical status information
- Error messages must use `text-destructive`, not muted grey

---

## Page Metadata

Every page must export metadata for the browser tab title.

```ts
// Static
export const metadata = {
  title: 'Routing Rules — CourierX',
}

// Dynamic (for detail pages)
export async function generateMetadata({ params }) {
  return { title: `Tenant ${params.id} — CourierX Admin` }
}
```

Title format: `{Page Name} — CourierX`
Root layout title: `CourierX`

---

## Common Commands

```bash
# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

---

## Do Not

- Use `useEffect` for data fetching — use TanStack Query
- Hardcode `localhost:4000` in components — only in `src/services/api.ts`
- Use inline styles — Tailwind only
- Render API keys or secrets in non-monospace font
- Touch `marketing/` directory
- Create new shadcn components if an existing one can be extended
- Use `any` type — always type API responses properly
- Show raw Rails error payloads or stack traces to users
- Delete / revoke / disconnect anything on a single click — always confirm first
- Store page/filter state in `useState` — keep it in URL search params
- Show a toast for a GET request failure — use inline error state instead
- Render icon-only buttons without `aria-label`
- Hardcode role strings — use constants (`'admin'` | `'member'`)
- Display a full API key or secret after the initial creation reveal — always mask thereafter
- Skip `<title>` metadata export on any page
