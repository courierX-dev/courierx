import { cn } from "@/lib/utils"

const styles: Record<string, string> = {
  delivered:  "bg-success/12 text-success border-success/25",
  active:     "bg-success/12 text-success border-success/25",
  paid:       "bg-success/12 text-success border-success/25",
  opened:     "bg-sky-500/12 text-sky-600 border-sky-500/25 dark:text-sky-400",
  clicked:    "bg-violet-500/12 text-violet-600 border-violet-500/25 dark:text-violet-400",
  bounced:    "bg-destructive/12 text-destructive border-destructive/25",
  failed:     "bg-destructive/12 text-destructive border-destructive/25",
  error:      "bg-destructive/12 text-destructive border-destructive/25",
  revoked:    "bg-destructive/12 text-destructive border-destructive/25",
  inactive:   "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  queued:     "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  pending:    "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  sent:       "bg-primary/12 text-primary border-primary/25",
  primary:    "bg-primary/12 text-primary border-primary/25",
  secondary:  "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  tertiary:   "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = styles[status.toLowerCase()] ?? styles.queued
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        style,
        className,
      )}
    >
      {status}
    </span>
  )
}
