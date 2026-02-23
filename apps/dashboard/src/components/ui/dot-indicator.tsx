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

interface DotIndicatorProps {
  status: string
  className?: string
}

export function DotIndicator({ status, className }: DotIndicatorProps) {
  const color = dotColor[status.toLowerCase()] ?? "bg-muted-foreground/40"
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
