declare module 'posthog-js' {
  interface PostHog {
    init(token: string, config?: Record<string, unknown>): void
    identify(distinctId: string, properties?: Record<string, unknown>): void
    capture(event: string, properties?: Record<string, unknown>): void
    reset(): void
  }
  const posthog: PostHog
  export default posthog
}

declare module 'posthog-js/react' {
  import type { ReactNode } from 'react'

  interface PostHogProviderProps {
    client: unknown
    children: ReactNode
  }

  export function PostHogProvider(props: PostHogProviderProps): JSX.Element
  export function usePostHog(): import('posthog-js').PostHog | null
}
