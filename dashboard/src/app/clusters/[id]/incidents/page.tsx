"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useIncidents } from "@/hooks/useQuery"
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: incidents, isLoading } = useIncidents(id)

  const open = incidents?.filter((i) => i.status === "open") ?? []
  const resolved = incidents?.filter((i) => i.status === "resolved") ?? []

  return (
    <PageShell title="Incidents" subtitle={`${open.length} open, ${resolved.length} resolved`} clusterId={id}>
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className={cn("h-24 rounded-xl anim-shimmer", `delay-${i}`)} />)}
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-3 anim-fade-up">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-status-error flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-error animate-pulse" />
            Open Incidents
          </h2>
          {open.map((inc, i) => (
            <Card key={inc.id} className={cn("anim-fade-up", `delay-${(i % 6) + 1}`)}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  inc.severity === 'critical' ? "bg-status-error/10 border-status-error/20" : "bg-status-warn/10 border-status-warn/20"
                )}>
                  <AlertTriangle size={18} className={inc.severity === 'critical' ? 'text-status-error' : 'text-status-warn'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold tracking-tight text-text-primary">{inc.title}</p>
                      {inc.ai_summary && <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed line-clamp-2">{inc.ai_summary}</p>}
                      {inc.root_cause && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <Zap size={12} className="text-accent" />
                          <span className="text-[12px] text-text-muted">Root cause: {inc.root_cause}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={statusVariant(inc.severity)} dot>{inc.severity}</Badge>
                      <Badge variant="danger" dot>open</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3 anim-fade-up delay-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-status-ok flex items-center gap-2">
            <CheckCircle2 size={14} /> Resolved
          </h2>
          {resolved.map((inc, i) => (
            <Card key={inc.id} className={cn("opacity-70 anim-fade-up", `delay-${(i % 6) + 1}`)}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-ok/8 border border-status-ok/15">
                  <CheckCircle2 size={18} className="text-status-ok" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-medium text-text-secondary">{inc.title}</p>
                      {inc.root_cause && <p className="mt-1 text-[12px] text-text-muted">{inc.root_cause}</p>}
                    </div>
                    <Badge variant="success" dot>resolved</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && incidents?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center anim-fade-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-status-ok/10 border border-status-ok/20 mb-5">
            <CheckCircle2 size={28} className="text-status-ok" />
          </div>
          <p className="text-[15px] font-medium text-text-primary">No incidents</p>
          <p className="mt-2 text-[13px] text-text-muted">Your cluster is running smoothly</p>
        </div>
      )}
    </PageShell>
  )
}
