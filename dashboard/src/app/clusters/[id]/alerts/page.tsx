"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useAlerts } from "@/hooks/useQuery"
import { Bell, Plus, Trash2, Power } from "lucide-react"
import { api } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

export default function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: alerts, isLoading } = useAlerts(id)
  const qc = useQueryClient()

  const handleDelete = async (alertId: string) => {
    await api.delete(`/api/v1/clusters/${id}/alerts/${alertId}`)
    qc.invalidateQueries({ queryKey: ["alerts", id] })
  }

  const enabledAlerts = alerts?.filter(r => r.enabled) ?? []

  return (
    <PageShell title="Alert Rules" subtitle={`${enabledAlerts.length} active rules`} clusterId={id}>
      <div className="flex justify-end animate-fade-in">
        <Button variant="primary" size="sm">
          <Plus size={14} /> New Rule
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-20 rounded-[var(--radius-lg)] animate-shimmer stagger-${i}`} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {(alerts ?? []).map((rule, i) => (
          <Card key={rule.id} className={`animate-fade-in stagger-${(i % 6) + 1}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background: rule.enabled ? 'var(--accent-muted)' : 'var(--bg-hover)',
                    border: `1px solid ${rule.enabled ? 'var(--accent-strong)' : 'var(--border-subtle)'}`,
                  }}>
                  <Bell size={15} style={{ color: rule.enabled ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-[14px]"
                      style={{ color: rule.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {rule.name}
                    </span>
                    <Badge variant={statusVariant(rule.severity)} dot>{rule.severity}</Badge>
                    {!rule.enabled && (
                      <Badge variant="muted">
                        <Power size={9} className="mr-1" /> disabled
                      </Badge>
                    )}
                  </div>
                  {rule.description && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {rule.description}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} aria-label="Delete rule">
                <Trash2 size={14} style={{ color: 'var(--text-tertiary)' }} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && alerts?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <Bell size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No alert rules configured</p>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Set up alert rules to get notified about infrastructure issues.
          </p>
          <Button variant="primary" size="md" className="mt-6">
            <Plus size={14} /> Create Rule
          </Button>
        </div>
      )}
    </PageShell>
  )
}
