"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Settings,
  Mail,
  FileText,
  Key,
  CreditCard,
  LayoutDashboard,
  Zap,
  BookOpen,
  ChevronDown,
  Server,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Overview",       href: "/dashboard",            icon: LayoutDashboard },
  { name: "Messages",       href: "/dashboard/messages",   icon: Mail },
  { name: "Templates",      href: "/dashboard/templates",  icon: FileText },
  { name: "Providers",      href: "/dashboard/providers",  icon: Server },
  { name: "API Keys",       href: "/dashboard/api-keys",   icon: Key },
  { name: "Billing",        href: "/dashboard/billing",    icon: CreditCard },
]

const bottomItems = [
  { name: "Settings",  href: "/dashboard/settings", icon: Settings },
  { name: "Docs",      href: "https://docs.courierx.dev", icon: BookOpen, external: true },
]

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href
  return pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold tracking-tight text-sidebar-foreground">
          CourierX
        </span>
      </div>

      {/* Product selector */}
      <div className="px-3 pt-3">
        <button className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
              M
            </div>
            <span>My App</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-auto px-3 py-2">
        <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
          Main
        </p>
        <div className="grid gap-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    active ? "text-primary" : "text-sidebar-foreground/40",
                  )}
                />
                {item.name}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="grid gap-0.5">
          {bottomItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
