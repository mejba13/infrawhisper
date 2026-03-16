"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Server, Activity, FileText, GitBranch,
  AlertTriangle, DollarSign, Bell, MessageSquare, Settings,
  Box, ChevronLeft
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
    <aside className="flex h-full w-[220px] flex-col border-r"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg animate-pulse-glow"
          style={{ background: 'var(--accent-muted)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            InfraWhisper
          </span>
          <span className="block text-[10px] font-medium tracking-widest uppercase"
            style={{ color: 'var(--accent)', opacity: 0.7 }}>
            copilot
          </span>
        </div>
      </div>

      {/* Back to clusters */}
      {clusterId && (
        <Link href="/clusters"
          className="flex items-center gap-2 px-5 py-3 text-xs font-medium transition-colors border-b"
          style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-subtle)' }}>
          <ChevronLeft size={12} />
          All Clusters
        </Link>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {items.map(({ href, label, icon: Icon }, index) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 animate-fade-in",
                `stagger-${index + 1}`,
                isActive
                  ? "shadow-sm"
                  : "hover:translate-x-0.5"
              )}
              style={{
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer status */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--status-healthy)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            All systems operational
          </span>
        </div>
      </div>
    </aside>
  )
}
