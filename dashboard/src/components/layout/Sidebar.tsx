"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Server, Activity, FileText, GitBranch,
  AlertTriangle, DollarSign, Bell, MessageSquare, Settings,
  Box, ChevronLeft, Zap
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/clusters", label: "Clusters", icon: Server },
  { href: "/query", label: "AI Query", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

const CLUSTER_NAV = (id: string) => [
  { href: `/clusters/${id}`, label: "Overview", icon: LayoutDashboard },
  { href: `/clusters/${id}/pods`, label: "Pods", icon: Box },
  { href: `/clusters/${id}/metrics`, label: "Metrics", icon: Activity },
  { href: `/clusters/${id}/logs`, label: "Logs", icon: FileText },
  { href: `/clusters/${id}/traces`, label: "Traces", icon: GitBranch },
  { href: `/clusters/${id}/incidents`, label: "Incidents", icon: AlertTriangle },
  { href: `/clusters/${id}/costs`, label: "Costs", icon: DollarSign },
  { href: `/clusters/${id}/alerts`, label: "Alerts", icon: Bell },
]

export function Sidebar({ clusterId }: { clusterId?: string }) {
  const pathname = usePathname()
  const items = clusterId ? CLUSTER_NAV(clusterId) : NAV_ITEMS

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-surface-base border-r border-border-default">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-default">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim">
          <Zap size={16} className="text-accent" />
        </div>
        <div className="leading-tight">
          <span className="block text-[14px] font-semibold tracking-tight text-text-primary">
            InfraWhisper
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-accent">
            Copilot
          </span>
        </div>
      </div>

      {/* Back link */}
      {clusterId && (
        <Link
          href="/clusters"
          className="flex items-center gap-2 px-5 py-3 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors border-b border-border-subtle"
        >
          <ChevronLeft size={12} />
          All Clusters
        </Link>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-accent-dim text-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.7} />
              <span>{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          )
        })}
      </nav>

      {/* Status footer */}
      <div className="px-5 py-4 border-t border-border-default">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-status-ok opacity-50" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-ok" />
          </span>
          <span className="text-[11px] font-medium text-text-muted">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
