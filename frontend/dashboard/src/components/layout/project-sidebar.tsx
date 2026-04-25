"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  Plug,
  Settings,
  ChevronDown,
  BarChart3,
  ScrollText,
  Globe,
  GitFork,
  Key,
  Radio,
  Ban,
  ShieldCheck,
  CreditCard,
  Mail,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth.store"

const NAV = [
  {
    section: "Overview",
    items: [
      { id: "overview", label: "Dashboard", href: "/dashboard/overview", icon: LayoutDashboard },
    ],
  },
  {
    section: "Campaigns",
    items: [
      { id: "campaigns", label: "Campaigns", href: "/dashboard/campaigns", icon: Mail },
      { id: "templates", label: "Templates", href: "/dashboard/templates", icon: FileText },
      { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { id: "logs", label: "Logs", href: "/dashboard/logs", icon: ScrollText },
    ],
  },
  {
    section: "Infrastructure",
    items: [
      { id: "providers", label: "Providers", href: "/dashboard/providers", icon: Plug },
      { id: "domains", label: "Domains", href: "/dashboard/domains", icon: Globe },
      { id: "routing", label: "Routing", href: "/dashboard/routing", icon: GitFork },
    ],
  },
  {
    section: "Developer",
    items: [
      { id: "api-keys", label: "API keys", href: "/dashboard/api-keys", icon: Key },
      { id: "webhooks", label: "Webhooks", href: "/dashboard/webhooks", icon: Radio },
      { id: "team", label: "Team", href: "/dashboard/team", icon: Users },
    ],
  },
  {
    section: "Compliance",
    items: [
      { id: "suppressions", label: "Suppressions", href: "/dashboard/suppressions", icon: Ban },
      { id: "compliance", label: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
      { id: "billing", label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    ],
  },
]

export function ProjectSidebar() {
  const pathname = usePathname()
  const { tenant, hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  const tenantName = tenant?.name ?? "Workspace"
  const tenantInitial = tenantName.charAt(0).toUpperCase()

  return (
    <aside className="w-[220px] shrink-0 bg-sidebar flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center gap-[9px] px-4 pt-[18px] pb-[14px] border-b border-sidebar-border">
        <div className="w-6 h-6 rounded-[6px] bg-sidebar-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
          C
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground tracking-[-0.01em]">
          Courier<span className="text-sidebar-primary">X</span>
        </span>
      </div>

      {/* Workspace picker */}
      <div className="mx-[10px] mt-[10px] mb-1 px-[10px] py-2 rounded-lg bg-white/5 flex items-center gap-2 cursor-pointer hover:bg-white/[0.08] transition-colors">
        <div className="w-5 h-5 rounded-[5px] bg-[#1D4ED8] text-[10px] font-bold text-white flex items-center justify-center shrink-0">
          {tenantInitial}
        </div>
        <span className="text-xs font-medium text-sidebar-foreground/80 flex-1 truncate">
          {tenantName}
        </span>
        <ChevronDown className="h-[11px] w-[11px] text-sidebar-muted/60 shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-nav px-[10px] pt-2 pb-4">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <span className="block px-[10px] mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-muted/60">
              {group.section}
            </span>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg mb-px transition-colors duration-[120ms]",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0",
                      isActive ? "text-white" : "text-sidebar-muted/70"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px]",
                      isActive ? "font-medium" : "font-normal"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Settings link */}
      <div className="px-[10px] pb-2">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg transition-colors duration-[120ms]",
            pathname === "/dashboard/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
          )}
        >
          <Settings className="h-[15px] w-[15px] shrink-0" />
          <span className="text-[13px]">Settings</span>
        </Link>
      </div>

      {/* User */}
      <div className="px-3 py-[10px] border-t border-sidebar-border flex items-center gap-[9px]">
        <div className="w-7 h-7 rounded-full bg-[#1D4ED8] text-[11px] font-semibold text-white flex items-center justify-center shrink-0">
          {tenantInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-sidebar-foreground/90 truncate">
            {tenantName}
          </div>
          <div className="text-[11px] text-sidebar-muted/60">Admin</div>
        </div>
      </div>
    </aside>
  )
}
