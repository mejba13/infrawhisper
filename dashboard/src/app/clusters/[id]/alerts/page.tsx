"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useAlerts } from "@/hooks/useQuery"
import { Bell, Plus, Trash2 } from "lucide-react"
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

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Alert Rules" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex justify-end">
            <Button variant="primary" size="sm"><Plus size={14} /> New Alert</Button>
          </div>
          {isLoading && <div className="text-zinc-500 text-sm">Loading...</div>}
          <div className="space-y-2">
            {(alerts ?? []).map((rule) => (
              <Card key={rule.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-zinc-400" />
                    <span className="font-medium text-zinc-200 text-sm">{rule.name}</span>
                    <Badge variant={statusVariant(rule.severity)}>{rule.severity}</Badge>
                    {!rule.enabled && <Badge variant="muted">disabled</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} aria-label="Delete rule">
                    <Trash2 size={13} className="text-zinc-500" />
                  </Button>
                </div>
                {rule.description && <p className="mt-1 text-xs text-zinc-500 pl-6">{rule.description}</p>}
              </Card>
            ))}
            {!isLoading && alerts?.length === 0 && (
              <div className="py-16 text-center text-zinc-500">No alert rules configured.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
