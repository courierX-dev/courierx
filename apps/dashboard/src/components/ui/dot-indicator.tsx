import { cn } from "@/lib/utils"

const dotColor: Record<string, string> = {
  healthy:    "bg-success",
  active:     "bg-success",
  verified:   "bg-success",
  degraded:   "bg-warning",
  pending:    "bg-warning",
  down:       "bg-destructive",
  failed:     "bg-destructive",
  error:      "bg-destructive",
  inactive:   "bg-muted-foreground/40",
  unverified: "bg-muted-foreground/40",
  revoked:    "bg-muted-foreground/40",
  queued:     "bg-muted-foreground/40",
}

const PULSE_STATUSES = new Set(["healthy", "active", "verified"])

interface DotIndicatorProps {
  status: string
  className?: string
}

export function DotIndicator({ status, className }: DotIndicatorProps) {
  const lower = status.toLowerCase()
  const color = dotColor[lower] ?? "bg-muted-foreground/40"
  const shouldPulse = PULSE_STATUSES.has(lower)

  if (shouldPulse) {
    return (
      <span className={cn("relative inline-flex h-2 w-2 flex-shrink-0", className)}>
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", color)} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full flex-shrink-0",
        color,
        className,
      )}
    />
  )
}
