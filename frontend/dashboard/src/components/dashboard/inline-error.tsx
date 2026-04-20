import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InlineErrorProps {
  message?: string
  onRetry?: () => void
}

/** Small inline error for use inside cards/sections. */
export function InlineError({ message = "Failed to load", onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

/** Thin horizontal error strip — use inside a card to preserve the card chrome. */
export function ErrorBanner({ message = "Could not load data", onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-destructive/70 bg-destructive/5 border-b border-destructive/10">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-medium hover:text-destructive underline-offset-2 hover:underline whitespace-nowrap"
        >
          Retry
        </button>
      )}
    </div>
  )
}

/** Larger section-level error — use when the entire page section failed. */
export function SectionError({ message = "Failed to load", onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-3 h-7 w-7 text-muted-foreground/50" />
      <h3 className="text-sm font-medium">{message}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
        Something went wrong. Please try again.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
