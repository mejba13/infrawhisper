"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Server, Activity, FileText, GitBranch,
  AlertTriangle, DollarSign, Bell, MessageSquare, Settings, Zap
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/clusters", label: "Clusters", icon: Server },
  { href: "/query", label: "AI Query", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

const CLUSTER_NAV = (id: string) => [
  { href: `/clusters/${id}`, label: "Overview", icon: LayoutDashboard },
  { href: `/clusters/${id}/pods`, label: "Pods", icon: Zap },
  { href: `/clusters/${id}/nodes`, label: "Nodes", icon: Server },
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
    <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm">InfraWhisper</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors mb-0.5",
              pathname === href
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
