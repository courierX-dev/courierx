'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
          <h1 className="text-lg font-medium">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">An unexpected error occurred. The team has been notified.</p>
        </div>
      </body>
    </html>
  )
}
