"use client"
import { use, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { useLogs } from "@/hooks/useLogs"
import { Search } from "lucide-react"
import { relativeTime } from "@/lib/utils"
import type { LogEntry } from "@/types/logs"

const SEVERITY_COLORS: Record<string, string> = {
  ERROR: "text-red-400", FATAL: "text-red-500",
  WARN: "text-amber-400", INFO: "text-blue-400",
  DEBUG: "text-zinc-500", TRACE: "text-zinc-600",
}

export default function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("")
  const { data, isLoading } = useLogs(id, { search, severity, limit: 200 })

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Logs" />
        <main className="flex-1 overflow-hidden flex flex-col p-6 gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none"
            >
              <option value="">All levels</option>
              {["ERROR", "WARN", "INFO", "DEBUG"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <Card className="flex-1 overflow-y-auto p-0 font-mono">
            {isLoading && <div className="p-4 text-zinc-500 text-sm">Loading logs...</div>}
            <div className="divide-y divide-zinc-800/30">
              {(data?.logs ?? []).map((log: LogEntry, i) => (
                <div key={i} className="flex gap-3 px-4 py-1.5 hover:bg-zinc-800/30 text-xs">
                  <span className="shrink-0 text-zinc-600">{relativeTime(log.timestamp)}</span>
                  <span className={`shrink-0 w-10 ${SEVERITY_COLORS[log.severity] ?? "text-zinc-400"}`}>
                    {log.severity.slice(0, 4)}
                  </span>
                  <span className="shrink-0 text-zinc-500 w-28 truncate">{log.pod}</span>
                  <span className="text-zinc-300 break-all">{log.body}</span>
                </div>
              ))}
              {!isLoading && data?.logs?.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No logs found</div>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
