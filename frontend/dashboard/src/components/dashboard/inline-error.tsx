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
      <AlertCircle className="mb-2 h-5 w-5 text-destructive" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

/** Larger section-level error — use when the entire page section failed. */
export function SectionError({ message = "Failed to load", onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
      <h3 className="text-sm font-medium">{message}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Could not reach server. Please try again.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
