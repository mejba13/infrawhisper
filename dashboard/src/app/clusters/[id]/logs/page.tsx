"use client"
import { use, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { useLogs } from "@/hooks/useLogs"
import { Search, Filter } from "lucide-react"
import { relativeTime } from "@/lib/utils"
import type { LogEntry } from "@/types/logs"

const SC: Record<string, string> = {
  ERROR: "text-red-400 bg-red-500/10", FATAL: "text-red-400 bg-red-500/15",
  WARN: "text-amber-400 bg-amber-500/10", INFO: "text-blue-400 bg-blue-500/10",
  DEBUG: "text-zinc-500 bg-zinc-800", TRACE: "text-zinc-600 bg-zinc-800",
}

export default function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("")
  const { data, isLoading } = useLogs(id, { search, severity, limit: 200 })
  return (
    <PageShell title="Logs" subtitle="Application log streams" clusterId={id}>
      <div className="flex gap-3 anim-fade-up">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
            className="w-full py-2.5 pl-10 pr-4 text-[13px] font-mono rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none transition-colors" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <select value={severity} onChange={e => setSeverity(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-[13px] rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 appearance-none focus:outline-none">
            <option value="">All levels</option>
            {["ERROR","WARN","INFO","DEBUG"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <Card className="p-0 overflow-hidden anim-fade-up delay-2" style={{ maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
        {isLoading && <div className="p-8 text-center"><div className="inline-flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</div></div>}
        <div>
          {(data?.logs ?? []).map((log: LogEntry, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-2.5 border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
              <span className="shrink-0 text-[11px] font-mono text-zinc-600 pt-0.5 w-14 tabular-nums">{relativeTime(log.timestamp)}</span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-center min-w-[46px] ${SC[log.severity] ?? SC.DEBUG}`}>{log.severity.slice(0,4)}</span>
              <span className="shrink-0 text-[11px] font-mono text-zinc-600 truncate max-w-[140px]">{log.pod}</span>
              <span className="text-[12px] font-mono text-zinc-400 break-all leading-relaxed">{log.body}</span>
            </div>
          ))}
          {!isLoading && data?.logs?.length === 0 && <div className="py-16 text-center text-sm text-zinc-500">No logs found</div>}
        </div>
      </Card>
    </PageShell>
  )
}
