"use client"

import Image from "next/image"
import { useState } from "react"
import { Mail, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProviderType } from "@/types/provider"

const CUSTOM_ICON_PATH: Record<ProviderType, string | null> = {
  sendgrid: "/providers/sendgrid.svg",
  mailgun: "/providers/mailgun.svg",
  ses: "/providers/ses.svg",
  postmark: "/providers/postmark.svg",
  resend: "/providers/resend.svg",
  smtp: null,
}

interface ProviderIconProps {
  provider: string
  size?: number
  className?: string
}

export function ProviderIcon({ provider, size = 16, className }: ProviderIconProps) {
  const [errored, setErrored] = useState(false)
  const src = CUSTOM_ICON_PATH[provider as ProviderType]

  if (src && !errored) {
    return (
      <Image
        src={src}
        alt={`${provider} logo`}
        width={size}
        height={size}
        className={cn("object-contain", className)}
        onError={() => setErrored(true)}
        unoptimized
      />
    )
  }

  const Fallback = provider === "smtp" ? Server : Mail
  return (
    <Fallback
      className={cn("text-muted-foreground", className)}
      style={{ width: size, height: size }}
      aria-label={`${provider} icon`}
    />
  )
}
