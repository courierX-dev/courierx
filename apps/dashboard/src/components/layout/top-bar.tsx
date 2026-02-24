"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Zap, ChevronDown, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeBadge } from "@/components/ui/mode-badge"
import { authService } from "@/services/auth.service"

export function TopBar() {
  const router = useRouter()
  const [tenantName, setTenantName] = useState("")
  const [tenantMode, setTenantMode] = useState("demo")

  useEffect(() => {
    const cached = authService.getCachedTenant()
    if (cached) {
      setTenantName(cached.name)
      setTenantMode(cached.mode)
    } else {
      authService.getCurrentUser().then((t) => {
        setTenantName(t.name)
        setTenantMode(t.mode)
      }).catch(() => {})
    }
  }, [])

  const initials = tenantName
    ? tenantName.slice(0, 2).toUpperCase()
    : "…"

  function handleSignOut() {
    authService.logout()
  }

  return (
    <header className="h-11 shrink-0 border-b border-border bg-background flex items-center px-4 gap-2">
      {/* Logo */}
      <Link href="/dashboard/overview" className="flex items-center gap-2 mr-1">
        <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
          <Zap className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">CourierX</span>
      </Link>

      <span className="text-border select-none">/</span>

      {/* Workspace selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-sm font-medium">
            {tenantName || "…"}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem className="font-medium text-sm">{tenantName}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ModeBadge mode={tenantMode} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-full p-0 bg-muted text-muted-foreground font-mono text-xs font-semibold"
          >
            {initials}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium truncate">{tenantName}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => router.push("/dashboard/profile")}>
            <User className="h-3.5 w-3.5 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => router.push("/dashboard/settings")}>
            <Settings className="h-3.5 w-3.5 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-sm text-destructive focus:text-destructive cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
