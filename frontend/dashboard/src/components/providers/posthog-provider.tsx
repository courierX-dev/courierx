'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

function UserIdentifier() {
  const tenant = useAuthStore((s) => s.tenant)
  const ph = usePostHog()

  useEffect(() => {
    if (!ph) return
    if (tenant) {
      ph.identify(tenant.id, {
        name: tenant.name,
        email: tenant.email,
        slug: tenant.slug,
        mode: tenant.mode,
        plan_id: tenant.plan_id,
      })
    } else {
      ph.reset()
    }
  }, [tenant, ph])

  return null
}

if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  if (key) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    })
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <UserIdentifier />
      {children}
    </PHProvider>
  )
}
