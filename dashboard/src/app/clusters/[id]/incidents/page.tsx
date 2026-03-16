"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useIncidents } from "@/hooks/useQuery"
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react"

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: incidents, isLoading } = useIncidents(id)

  const open = incidents?.filter((i) => i.status === "open") ?? []
  const resolved = incidents?.filter((i) => i.status === "resolved") ?? []

  return (
    <PageShell title="Incidents" subtitle={`${open.length} open, ${resolved.length} resolved`} clusterId={id}>
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-24 rounded-[var(--radius-lg)] animate-shimmer stagger-${i}`} />
          ))}
        </div>
      )}

      {/* Open incidents */}
      {open.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
            style={{ color: 'var(--status-critical)' }}>
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--status-critical)' }} />
            Open Incidents
          </h2>
          {open.map((incident, i) => (
            <Card key={incident.id} className={`animate-fade-in stagger-${(i % 6) + 1}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: incident.severity === 'critical' ? 'rgba(248 113 113 / 0.1)' : 'rgba(251 191 36 / 0.1)',
                    border: `1px solid ${incident.severity === 'critical' ? 'rgba(248 113 113 / 0.2)' : 'rgba(251 191 36 / 0.2)'}`,
                  }}>
                  <AlertTriangle size={18} style={{
                    color: incident.severity === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)'
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[15px] tracking-tight"
                        style={{ color: 'var(--text-primary)' }}>
                        {incident.title}
                      </p>
                      {incident.ai_summary && (
                        <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}>
                          {incident.ai_summary}
                        </p>
                      )}
                      {incident.root_cause && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <Zap size={12} style={{ color: 'var(--accent)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Root cause: {incident.root_cause}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={statusVariant(incident.severity)} dot>{incident.severity}</Badge>
                      <Badge variant="danger" dot>open</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved incidents */}
      {resolved.length > 0 && (
        <div className="space-y-3 animate-fade-in stagger-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
            style={{ color: 'var(--status-healthy)' }}>
            <CheckCircle2 size={14} />
            Resolved
          </h2>
          {resolved.map((incident, i) => (
            <Card key={incident.id} className={`opacity-70 animate-fade-in stagger-${(i % 6) + 1}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(52 211 153 / 0.08)', border: '1px solid rgba(52 211 153 / 0.15)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--status-healthy)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                        {incident.title}
                      </p>
                      {incident.root_cause && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {incident.root_cause}
                        </p>
                      )}
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
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
            style={{ background: 'rgba(52 211 153 / 0.1)', border: '1px solid rgba(52 211 153 / 0.2)' }}>
            <CheckCircle2 size={28} style={{ color: 'var(--status-healthy)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No incidents</p>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Your cluster is running smoothly
          </p>
        </div>
      )}
    </PageShell>
  )
}
