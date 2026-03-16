"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Server, Activity, FileText, GitBranch,
  AlertTriangle, DollarSign, Bell, MessageSquare, Settings,
  Box, ChevronLeft, Zap
} from "lucide-react"

const NAV = [
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
  const items = clusterId ? CLUSTER_NAV(clusterId) : NAV

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-zinc-950 border-r border-zinc-800/60">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
          <Zap size={16} className="text-teal-400" />
        </div>
        <div className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-zinc-100">InfraWhisper</span>
          <span className="block text-[10px] font-bold tracking-[0.12em] uppercase text-teal-400">Copilot</span>
        </div>
      </div>

      {clusterId && (
        <Link href="/clusters" className="flex items-center gap-2 px-5 py-3 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors border-b border-zinc-800/40">
          <ChevronLeft size={12} /> All Clusters
        </Link>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
              active ? "bg-teal-500/12 text-teal-400" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            )}>
              <Icon size={16} strokeWidth={active ? 2 : 1.7} />
              <span>{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-zinc-500">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
