"use client"
import { use, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { useLogs } from "@/hooks/useLogs"
import { Search, Filter } from "lucide-react"
import { relativeTime } from "@/lib/utils"
import type { LogEntry } from "@/types/logs"

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  ERROR: { color: 'var(--status-critical)', bg: 'rgba(248 113 113 / 0.1)' },
  FATAL: { color: 'var(--status-critical)', bg: 'rgba(248 113 113 / 0.15)' },
  WARN: { color: 'var(--status-warning)', bg: 'rgba(251 191 36 / 0.1)' },
  INFO: { color: 'var(--status-info)', bg: 'rgba(96 165 250 / 0.1)' },
  DEBUG: { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)' },
  TRACE: { color: 'var(--text-tertiary)', bg: 'var(--bg-hover)' },
}

export default function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("")
  const { data, isLoading } = useLogs(id, { search, severity, limit: 200 })

  return (
    <PageShell title="Logs" subtitle="Application log streams" clusterId={id}>
      {/* Filters */}
      <div className="flex gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full py-2.5 pl-10 pr-4 text-sm focus-ring"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }} />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-sm appearance-none focus-ring"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <option value="">All levels</option>
            {["ERROR", "WARN", "INFO", "DEBUG"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Log entries */}
      <Card className="p-0 overflow-hidden animate-fade-in stagger-2" style={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
        {isLoading && (
          <div className="p-6 text-center">
            <div className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div>
          {(data?.logs ?? []).map((log: LogEntry, i) => {
            const sev = SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.DEBUG
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-2.5 transition-colors duration-150"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span className="shrink-0 text-[11px] pt-0.5 tabular-nums"
                  style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: '56px' }}>
                  {relativeTime(log.timestamp)}
                </span>
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: sev.color, background: sev.bg, minWidth: '48px', textAlign: 'center' }}
                >
                  {log.severity.slice(0, 4)}
                </span>
                <span className="shrink-0 text-[11px] truncate"
                  style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', maxWidth: '140px' }}>
                  {log.pod}
                </span>
                <span className="text-[12px] break-all leading-relaxed"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {log.body}
                </span>
              </div>
            )
          })}
          {!isLoading && data?.logs?.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-tertiary)' }}>
              No logs found matching your filters
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  )
}
