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
import { cn } from "@/lib/utils"

export default function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: alerts, isLoading } = useAlerts(id)
  const qc = useQueryClient()

  const handleDelete = async (alertId: string) => {
    await api.delete(`/api/v1/clusters/${id}/alerts/${alertId}`)
    qc.invalidateQueries({ queryKey: ["alerts", id] })
  }

  const enabledCount = alerts?.filter(r => r.enabled).length ?? 0

  return (
    <PageShell title="Alert Rules" subtitle={`${enabledCount} active rules`} clusterId={id}>
      <div className="flex justify-end anim-fade-up">
        <Button variant="primary" size="sm"><Plus size={14} /> New Rule</Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className={cn("h-20 rounded-xl anim-shimmer", `delay-${i}`)} />)}
        </div>
      )}

      <div className="space-y-3">
        {(alerts ?? []).map((rule, i) => (
          <Card key={rule.id} className={cn("anim-fade-up", `delay-${(i % 6) + 1}`)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border",
                  rule.enabled ? "bg-accent-dim border-accent-medium" : "bg-surface-overlay border-border-subtle"
                )}>
                  <Bell size={15} className={rule.enabled ? "text-accent" : "text-text-dim"} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={cn("text-[14px] font-medium", rule.enabled ? "text-text-primary" : "text-text-muted")}>{rule.name}</span>
                    <Badge variant={statusVariant(rule.severity)} dot>{rule.severity}</Badge>
                    {!rule.enabled && <Badge variant="muted"><Power size={9} className="mr-1" /> disabled</Badge>}
                  </div>
                  {rule.description && <p className="mt-1 text-[12px] text-text-muted">{rule.description}</p>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} aria-label="Delete rule">
                <Trash2 size={14} className="text-text-dim" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && alerts?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center anim-fade-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised border border-border-default mb-5">
            <Bell size={28} className="text-text-muted" />
          </div>
          <p className="text-[15px] font-medium text-text-secondary">No alert rules configured</p>
          <p className="mt-2 text-[13px] text-text-muted max-w-xs">Set up alert rules to get notified about infrastructure issues.</p>
          <Button variant="primary" className="mt-6"><Plus size={14} /> Create Rule</Button>
        </div>
      )}
    </PageShell>
  )
}
