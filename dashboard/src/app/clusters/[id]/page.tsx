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
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="animate-fade-in stagger-1">
          <StatCard
            label="Nodes"
            value={cluster?.node_count ?? "—"}
            icon={<Server size={16} />}
            accent
          />
        </div>
        <div className="animate-fade-in stagger-2">
          <StatCard
            label="Open Incidents"
            value={openIncidents.length}
            icon={<AlertTriangle size={16} />}
            trend={openIncidents.length > 0 ? "Needs attention" : "All clear"}
          />
        </div>
        <div className="animate-fade-in stagger-3">
          <StatCard
            label="Critical"
            value={criticalIncidents.length}
            icon={<Shield size={16} />}
          />
        </div>
        <div className="animate-fade-in stagger-4">
          <StatCard
            label="Status"
            value={cluster?.status ?? "unknown"}
            icon={<Activity size={16} />}
          />
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Open incidents — wider */}
        <div className="lg:col-span-3 animate-fade-in stagger-5">
          <Card>
            <CardHeader
              title="Open Incidents"
              subtitle={`${openIncidents.length} requiring attention`}
            />
            {openIncidents.length === 0 ? (
              <div className="py-8 text-center">
                <Shield size={24} style={{ color: 'var(--status-healthy)', margin: '0 auto 8px' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  No open incidents
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {openIncidents.slice(0, 5).map((incident, i) => (
                  <div
                    key={incident.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 animate-fade-in stagger-${i + 1}`}
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={14} style={{ color: 'var(--status-warning)' }} />
                      <div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                          {incident.title}
                        </span>
                        {incident.ai_summary && (
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>
                            {incident.ai_summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusVariant(incident.severity)} dot>
                      {incident.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Cluster info — narrower */}
        <div className="lg:col-span-2 animate-fade-in stagger-6">
          <Card>
            <CardHeader title="Cluster Info" />
            <div className="space-y-4">
              {[
                ["Provider", cluster?.provider],
                ["Region", cluster?.region],
                ["Kubernetes", cluster?.k8s_version],
                ["Cluster ID", cluster?.id?.slice(0, 12) + "..."],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                  </span>
                  <span className="text-[13px] font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
