"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useCluster, useIncidents } from "@/hooks/useQuery"
import { Activity, AlertTriangle, Server } from "lucide-react"

export default function ClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cluster } = useCluster(id)
  const { data: incidents } = useIncidents(id)

  const openIncidents = incidents?.filter((i) => i.status === "open") ?? []
  const criticalIncidents = openIncidents.filter((i) => i.severity === "critical")

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={cluster?.name ?? "Cluster"} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats row */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Server size={12} /> Nodes</div>
              <div className="text-2xl font-semibold text-zinc-100">{cluster?.node_count ?? "—"}</div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><AlertTriangle size={12} /> Open Incidents</div>
              <div className={`text-2xl font-semibold ${openIncidents.length > 0 ? "text-amber-400" : "text-zinc-100"}`}>
                {openIncidents.length}
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><AlertTriangle size={12} /> Critical</div>
              <div className={`text-2xl font-semibold ${criticalIncidents.length > 0 ? "text-red-400" : "text-zinc-100"}`}>
                {criticalIncidents.length}
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Activity size={12} /> Status</div>
              <Badge variant={statusVariant(cluster?.status ?? "unknown")} className="mt-1">
                {cluster?.status ?? "unknown"}
              </Badge>
            </Card>
          </div>

          {/* Recent incidents */}
          {openIncidents.length > 0 && (
            <Card className="mb-4">
              <CardHeader title="Open Incidents" subtitle={`${openIncidents.length} requiring attention`} />
              <div className="space-y-2">
                {openIncidents.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <span className="text-sm text-zinc-200">{i.title}</span>
                    <Badge variant={statusVariant(i.severity)}>{i.severity}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Cluster Info" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Provider", cluster?.provider],
                ["Region", cluster?.region],
                ["Kubernetes", cluster?.k8s_version],
                ["ID", cluster?.id?.slice(0, 8) + "…"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200 font-mono text-xs mt-0.5">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </main>
      </div>
    </div>
  )
}
