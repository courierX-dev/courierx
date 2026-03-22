import { cn } from "@/lib/utils"

const modeStyles: Record<string, string> = {
  demo:    "bg-muted/80 text-muted-foreground border-border",
  byok:    "bg-primary/10 text-primary border-primary/25",
  managed: "bg-success/10 text-success border-success/25",
}

const modeLabels: Record<string, string> = {
  demo:    "Demo",
  byok:    "BYOK",
  managed: "Managed",
}

interface ModeBadgeProps {
  mode: string
  className?: string
}

export function ModeBadge({ mode, className }: ModeBadgeProps) {
  const style = modeStyles[mode] ?? modeStyles.demo
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        style,
        className,
      )}
    >
      {modeLabels[mode] ?? mode}
    </span>
  )
}
