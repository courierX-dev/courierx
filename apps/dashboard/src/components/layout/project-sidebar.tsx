"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  ScrollText,
  Globe,
  GitFork,
  Key,
  Radio,
  ShieldCheck,
  CreditCard,
  Ban,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  {
    section: "Monitor",
    items: [
      { label: "Overview",  href: "/dashboard/overview",  icon: LayoutDashboard },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3       },
      { label: "Logs",      href: "/dashboard/logs",      icon: ScrollText      },
    ],
  },
  {
    section: "Infrastructure",
    items: [
      { label: "Domains", href: "/dashboard/domains", icon: Globe    },
      { label: "Routing", href: "/dashboard/routing", icon: GitFork  },
    ],
  },
  {
    section: "Developer",
    items: [
      { label: "API Keys",  href: "/dashboard/api-keys",  icon: Key   },
      { label: "Webhooks",  href: "/dashboard/webhooks",  icon: Radio },
    ],
  },
  {
    section: "Compliance & Billing",
    items: [
      { label: "Suppressions", href: "/dashboard/suppressions", icon: Ban         },
      { label: "Compliance",   href: "/dashboard/compliance",   icon: ShieldCheck },
      { label: "Billing",      href: "/dashboard/billing",      icon: CreditCard  },
    ],
  },
]

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
          : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </Link>
  )
}

export function ProjectSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-sidebar flex flex-col overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/45">
              {group.section}
            </p>
            <ul className="space-y-px">
              {group.items.map(({ label, href, icon }) => (
                <li key={href}>
                  <NavItem
                    href={href}
                    label={label}
                    icon={icon}
                    active={pathname === href || pathname.startsWith(href + "/")}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <NavItem
          href="/dashboard/settings"
          label="Settings"
          icon={Settings}
          active={pathname === "/dashboard/settings"}
        />
      </div>
    </aside>
  )
}
