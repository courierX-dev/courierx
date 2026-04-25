"use client"

import { Mail, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProviderType } from "@/types/provider"

/**
 * ProviderIcon — brand-aware icon with optional chip wrapper and status state.
 *
 *   <ProviderIcon provider="sendgrid" size={16} />                        // bare mark, brand-tinted
 *   <ProviderIcon provider="sendgrid" size={20} chip />                   // chip, brand-colored
 *   <ProviderIcon provider="sendgrid" size={20} chip status="inactive" /> // chip, greyed out
 *   <ProviderIcon provider="sendgrid" size={20} chip status="error" />    // chip, muted + destructive ring
 *
 * Brand path data sourced from simple-icons (https://simpleicons.org).
 * Postmark mark crafted from its paper-plane glyph.
 */

const PROVIDER_ALIASES: Record<string, ProviderType> = {
  aws_ses: "ses",
  amazon_ses: "ses",
}

export type ProviderIconStatus = "active" | "inactive" | "error"

type BrandSpec = {
  /** Path content for the brand silhouette (uses currentColor). */
  paths: React.ReactNode
  /** Tailwind classes applied to the chip wrapper when status === "active". */
  chip: string
  /** Tailwind classes for the bare mark when status === "active" / undefined. */
  mark: string
}

const BRAND: Partial<Record<ProviderType, BrandSpec>> = {
  sendgrid: {
    chip: "bg-[#1A82E2] text-white",
    mark: "text-[#1A82E2]",
    paths: (
      <path d="M.8 24h13.6c.88 0 1.6-.72 1.6-1.6v-4.8c0-.88-.72-1.6-1.6-1.6H9.6c-.88 0-1.6-.72-1.6-1.6V9.6C8 8.72 7.28 8 6.4 8H1.6C.72 8 0 8.72 0 9.6v13.6c0 .44.36.8.8.8zM23.2 0H9.6C8.72 0 8 .72 8 1.6v4.8C8 7.28 8.72 8 9.6 8h4.8c.88 0 1.6.72 1.6 1.6v4.8c0 .88.72 1.6 1.6 1.6h4.8c.88 0 1.6-.72 1.6-1.6V.8c0-.44-.36-.8-.8-.8Z" />
    ),
  },
  mailgun: {
    chip: "bg-[#F06B66] text-white",
    mark: "text-[#F06B66]",
    paths: (
      <path d="M11.837 0c6.602 0 11.984 5.381 11.984 11.994-.017 2.99-3.264 4.84-5.844 3.331a3.805 3.805 0 0 1-.06-.035l-.055-.033-.022.055c-2.554 4.63-9.162 4.758-11.894.232-2.732-4.527.46-10.313 5.746-10.416a6.868 6.868 0 0 1 7.002 6.866 1.265 1.265 0 0 0 2.52 0c0-5.18-4.197-9.38-9.377-9.387C4.611 2.594.081 10.41 3.683 16.673c3.238 5.632 11.08 6.351 15.289 1.402l1.997 1.686A11.95 11.95 0 0 1 11.837 24C2.6 23.72-2.87 13.543 1.992 5.684A12.006 12.006 0 0 1 11.837 0Zm0 7.745c-3.276-.163-5.5 3.281-4.003 6.2a4.26 4.26 0 0 0 4.014 2.31c3.276-.171 5.137-3.824 3.35-6.575a4.26 4.26 0 0 0-3.36-1.935Zm0 2.53c1.324 0 2.152 1.433 1.49 2.58a1.72 1.72 0 0 1-1.49.86 1.72 1.72 0 1 1 0-3.44Z" />
    ),
  },
  ses: {
    chip: "bg-[#FF9900] text-white",
    mark: "text-[#FF9900]",
    paths: (
      <path d="M11.9996 0C5.3833 0 0 5.3834 0 11.9998c0 2.5316.7813 4.9544 2.2599 7.0051l.6955-.5014C1.5827 16.5993.8571 14.3505.8571 11.9998.8571 5.856 5.856.8572 12.0004.8572c6.144 0 11.1425 4.999 11.1425 11.1426 0 2.3508-.7256 4.5995-2.0983 6.5037l.6955.5014C23.2187 16.9542 24 14.5314 24 11.9998 24 5.3834 18.6163 0 11.9996 0zM6 16.7142a.4285.4285 0 0 0-.4286.4285v1.7598c-.9643.2048-1.7143 1.0822-1.7143 2.0974 0 1.1615.9815 2.143 2.1429 2.143s2.1429-.9815 2.1429-2.143c0-1.0152-.75-1.8926-1.7143-2.0974v-1.3312h5.1428v2.1883c-.9643.2049-1.7143 1.0822-1.7143 2.0975C9.8571 23.0186 10.8386 24 12 24s2.1429-.9814 2.1429-2.1429c0-1.0153-.75-1.8926-1.7143-2.0975v-2.1883h5.1428v1.3312c-.9643.2048-1.7143 1.0822-1.7143 2.0974 0 1.1615.9815 2.143 2.1429 2.143s2.1429-.9815 2.1429-2.143c0-1.0152-.75-1.8926-1.7143-2.0974v-1.7598A.4285.4285 0 0 0 18 16.7142h-5.5714v-2.5715H18c.237 0 .4286-.192.4286-.4286V5.9997A.4285.4285 0 0 0 18 5.571H6a.4285.4285 0 0 0-.4286.4286v7.7144c0 .2366.1916.4286.4286.4286h5.5714v2.5715H6zm1.2857 4.2857c0 .697-.5889 1.2858-1.2857 1.2858s-1.2857-.5889-1.2857-1.2858c0-.6968.5889-1.2857 1.2857-1.2857S7.2857 20.3031 7.2857 21zm12 0c0 .697-.5889 1.2858-1.2857 1.2858s-1.2857-.5889-1.2857-1.2858c0-.6968.5889-1.2857 1.2857-1.2857s1.2857.5889 1.2857 1.2857zm-1.7143-8.248L14.259 9.7703l3.3124-2.8389v5.8205zm-.7298-6.3236-4.842 4.1499-4.8412-4.15h9.6832zm-10.413.5031L9.741 9.7707 6.4286 12.752V6.9314zm.6878 6.3541 3.2807-2.9525 1.3239 1.135a.4253.4253 0 0 0 .2786.1032.4253.4253 0 0 0 .2785-.1033l1.3243-1.1349 3.2812 2.9525H7.1164zM12 20.5714c.6968 0 1.2857.5888 1.2857 1.2857 0 .6969-.5889 1.2857-1.2857 1.2857s-1.2857-.5888-1.2857-1.2857c0-.6969.5889-1.2857 1.2857-1.2857z" />
    ),
  },
  postmark: {
    chip: "bg-[#FFDE00] text-neutral-900",
    mark: "text-[#E8B900]",
    paths: (
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm5.86 6.14c.27 0 .47.27.38.52L13.5 18.39a.4.4 0 0 1-.74.02l-2.18-4.83a.4.4 0 0 0-.21-.21L5.55 11.2a.4.4 0 0 1 .02-.74l11.72-4.31a.4.4 0 0 1 .15-.02ZM10.74 12.45l1.49 3.3 3.34-7.95-7.95 2.96 3.12 1.4Z" />
    ),
  },
  resend: {
    chip: "bg-foreground text-background",
    mark: "text-foreground",
    paths: (
      <path d="M14.679 0c4.648 0 7.413 2.765 7.413 6.434s-2.765 6.434-7.413 6.434H12.33L24 24h-8.245l-8.88-8.44c-.636-.588-.93-1.273-.93-1.86 0-.831.587-1.565 1.713-1.883l4.574-1.224c1.737-.465 2.936-1.81 2.936-3.572 0-2.153-1.761-3.4-3.939-3.4H0V0z" />
    ),
  },
}

interface ProviderIconProps {
  provider: string
  size?: number
  chip?: boolean
  status?: ProviderIconStatus
  className?: string
}

export function ProviderIcon({
  provider,
  size = 16,
  chip = false,
  status,
  className,
}: ProviderIconProps) {
  const key = (PROVIDER_ALIASES[provider] ?? provider) as ProviderType
  const brand = BRAND[key]
  const isMuted = status === "inactive" || status === "error"
  const isError = status === "error"
  const chipSize = size + 14
  const chipRadius = size <= 14 ? "rounded-md" : size <= 20 ? "rounded-lg" : "rounded-xl"

  // Unknown / smtp → Lucide fallback
  if (!brand) {
    const Fallback = key === "smtp" ? Server : Mail
    if (!chip) {
      return (
        <Fallback
          className={cn("text-muted-foreground", isMuted && "opacity-60", className)}
          style={{ width: size, height: size }}
          aria-label={`${provider} icon`}
        />
      )
    }
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center bg-muted text-muted-foreground shrink-0",
          chipRadius,
          isError && "ring-1 ring-destructive/40",
          className,
        )}
        style={{ width: chipSize, height: chipSize }}
        aria-label={`${provider} icon${status ? ` (${status})` : ""}`}
      >
        <Fallback style={{ width: size, height: size }} />
      </span>
    )
  }

  // Bare mark (no chip): brand-tinted, muted when inactive
  if (!chip) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={cn(
          isMuted ? "text-muted-foreground/70" : brand.mark,
          className,
        )}
        aria-label={`${provider} icon`}
      >
        {brand.paths}
      </svg>
    )
  }

  // Chip — brand bg when active, muted when inactive, ringed when error
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 transition-colors",
        chipRadius,
        isMuted ? "bg-muted text-muted-foreground" : brand.chip,
        isError && "ring-1 ring-destructive/40",
        className,
      )}
      style={{ width: chipSize, height: chipSize }}
      aria-label={`${provider} icon${status ? ` (${status})` : ""}`}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        {brand.paths}
      </svg>
    </span>
  )
}
