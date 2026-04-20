"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/auth.store"
import { authService } from "@/services/auth.service"

export function TopBar() {
  const router = useRouter()
  const { tenant, hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  useEffect(() => {
    if (hydrated && !tenant) {
      authService.getCurrentUser().catch(() => {})
    }
  }, [hydrated, tenant])

  const tenantName = tenant?.name ?? ""
  const initials = tenantName
    ? tenantName.slice(0, 2).toUpperCase()
    : "..."

  return (
    <header className="h-[52px] shrink-0 bg-card border-b border-border flex items-center px-6 gap-3">
      {/* Search */}
      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground w-[220px] cursor-text">
        <Search className="h-[13px] w-[13px] text-muted-foreground shrink-0" />
        <span>Search...</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* New campaign */}
      <Button
        size="sm"
        className="h-8 gap-1.5 rounded-lg text-[13px] font-medium"
        onClick={() => router.push("/dashboard/campaigns/new")}
      >
        <Plus className="h-[13px] w-[13px]" />
        New campaign
      </Button>

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
            onClick={() => authService.logout()}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
