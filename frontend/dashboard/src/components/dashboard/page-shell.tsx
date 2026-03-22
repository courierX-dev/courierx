import { cn } from "@/lib/utils"

interface PageShellProps {
  children: React.ReactNode
  /** Use "narrow" for form-heavy pages like profile/settings */
  maxWidth?: "narrow" | "full"
  gap?: "sm" | "md" | "lg"
  className?: string
}

export function PageShell({ children, maxWidth = "full", gap = "md", className }: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        gap === "sm" ? "gap-4" : gap === "lg" ? "gap-8" : "gap-6",
        maxWidth === "narrow" && "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  )
}
