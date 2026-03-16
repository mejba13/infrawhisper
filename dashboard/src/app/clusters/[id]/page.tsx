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
  const open = incidents?.filter(i => i.status === "open") ?? []
  const critical = open.filter(i => i.severity === "critical")

  return (
    <PageShell title={cluster?.name ?? "Cluster"} subtitle="Cluster overview" clusterId={id}>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="anim-fade-up delay-1"><StatCard label="Nodes" value={cluster?.node_count ?? "—"} icon={<Server size={16} />} accent /></div>
        <div className="anim-fade-up delay-2"><StatCard label="Open Incidents" value={open.length} icon={<AlertTriangle size={16} />} trend={open.length > 0 ? "Needs attention" : "All clear"} /></div>
        <div className="anim-fade-up delay-3"><StatCard label="Critical" value={critical.length} icon={<Shield size={16} />} /></div>
        <div className="anim-fade-up delay-4"><StatCard label="Status" value={cluster?.status ?? "unknown"} icon={<Activity size={16} />} /></div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 anim-fade-up delay-5">
          <Card>
            <CardHeader title="Open Incidents" subtitle={`${open.length} requiring attention`} />
            {open.length === 0 ? (
              <div className="py-8 text-center"><Shield size={24} className="text-emerald-400 mx-auto mb-2" /><p className="text-sm font-medium text-zinc-500">No open incidents</p></div>
            ) : (
              <div className="space-y-2">
                {open.slice(0, 5).map(inc => (
                  <div key={inc.id} className="flex items-center justify-between rounded-lg bg-zinc-800/40 border border-zinc-800/40 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-zinc-200 block truncate">{inc.title}</span>
                        {inc.ai_summary && <p className="text-xs text-zinc-500 mt-0.5 truncate">{inc.ai_summary}</p>}
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
            {[["Provider", cluster?.provider], ["Region", cluster?.region], ["Kubernetes", cluster?.k8s_version], ["Cluster ID", cluster?.id?.slice(0,12)+"..."]].map(([k,v]) => (
              <div key={k} className="flex items-center justify-between py-3 border-b border-zinc-800/40 last:border-0">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{k}</span>
                <span className="text-[13px] font-medium font-mono text-zinc-200">{v ?? "—"}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
