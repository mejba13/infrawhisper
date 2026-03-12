"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useIncidents } from "@/hooks/useQuery"
import { AlertTriangle } from "lucide-react"

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: incidents, isLoading } = useIncidents(id)

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Incidents" />
        <main className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && <div className="text-zinc-500 text-sm">Loading incidents...</div>}
          {(incidents ?? []).map((incident) => (
            <Card key={incident.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-medium text-zinc-100 text-sm">{incident.title}</p>
                    {incident.ai_summary && (
                      <p className="mt-1 text-xs text-zinc-400">{incident.ai_summary}</p>
                    )}
                    {incident.root_cause && (
                      <p className="mt-1 text-xs text-zinc-500">Root cause: {incident.root_cause}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={statusVariant(incident.severity)}>{incident.severity}</Badge>
                  <Badge variant={statusVariant(incident.status)}>{incident.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
          {!isLoading && incidents?.length === 0 && (
            <div className="py-24 text-center text-zinc-500">No incidents — great job!</div>
          )}
        </main>
      </div>
    </div>
  )
}
