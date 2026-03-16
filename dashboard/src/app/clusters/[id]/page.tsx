"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card, CardHeader, StatCard } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useCluster, useIncidents } from "@/hooks/useQuery"
import { Activity, AlertTriangle, Server, Shield } from "lucide-react"

export default function ClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cluster } = useCluster(id)
  const { data: incidents } = useIncidents(id)

  const openIncidents = incidents?.filter((i) => i.status === "open") ?? []
  const criticalIncidents = openIncidents.filter((i) => i.severity === "critical")

  return (
    <PageShell title={cluster?.name ?? "Cluster"} subtitle="Cluster overview" clusterId={id}>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="anim-fade-up delay-1"><StatCard label="Nodes" value={cluster?.node_count ?? "—"} icon={<Server size={16} />} accent /></div>
        <div className="anim-fade-up delay-2"><StatCard label="Open Incidents" value={openIncidents.length} icon={<AlertTriangle size={16} />} trend={openIncidents.length > 0 ? "Needs attention" : "All clear"} /></div>
        <div className="anim-fade-up delay-3"><StatCard label="Critical" value={criticalIncidents.length} icon={<Shield size={16} />} /></div>
        <div className="anim-fade-up delay-4"><StatCard label="Status" value={cluster?.status ?? "unknown"} icon={<Activity size={16} />} /></div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 anim-fade-up delay-5">
          <Card>
            <CardHeader title="Open Incidents" subtitle={`${openIncidents.length} requiring attention`} />
            {openIncidents.length === 0 ? (
              <div className="py-8 text-center">
                <Shield size={24} className="text-status-ok mx-auto mb-2" />
                <p className="text-[13px] font-medium text-text-muted">No open incidents</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openIncidents.slice(0, 5).map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between rounded-lg bg-surface-overlay border border-border-subtle px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertTriangle size={14} className="text-status-warn shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-text-primary block truncate">{inc.title}</span>
                        {inc.ai_summary && <p className="text-[12px] text-text-muted mt-0.5 truncate">{inc.ai_summary}</p>}
                      </div>
                    </div>
                    <Badge variant={statusVariant(inc.severity)} dot className="shrink-0 ml-3">{inc.severity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 anim-fade-up delay-6">
          <Card>
            <CardHeader title="Cluster Info" />
            <div className="space-y-0">
              {[
                ["Provider", cluster?.provider],
                ["Region", cluster?.region],
                ["Kubernetes", cluster?.k8s_version],
                ["Cluster ID", cluster?.id?.slice(0, 12) + "..."],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{label}</span>
                  <span className="text-[13px] font-medium font-mono text-text-primary">{value ?? "—"}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
