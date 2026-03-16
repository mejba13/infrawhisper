"use client"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useClusters } from "@/hooks/useQuery"
import { Server, Plus, ArrowUpRight, Globe, Cpu } from "lucide-react"
import Link from "next/link"

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters()

  return (
    <PageShell title="Clusters" subtitle={`${clusters?.length ?? 0} clusters connected`}>
      <div className="flex items-center justify-between">
        <div />
        <Button variant="primary" size="sm">
          <Plus size={14} /> Add Cluster
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`h-44 rounded-[var(--radius-lg)] animate-shimmer stagger-${i + 1}`} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clusters?.map((c, i) => (
          <Link key={c.id} href={`/clusters/${c.id}`}>
            <Card hover className={`group animate-fade-in stagger-${(i % 6) + 1}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Server size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={statusVariant(c.status)} dot>{c.status}</Badge>
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  style={{ color: 'var(--accent)' }} />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Globe size={10} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Region
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {c.region}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Cpu size={10} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Nodes
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {c.node_count}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider block mb-1"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Version
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {c.k8s_version}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!isLoading && clusters?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <Server size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No clusters connected yet</p>
          <p className="mt-1.5 text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
            Deploy the InfraWhisper agent to your Kubernetes cluster to get started.
          </p>
          <Button variant="primary" size="md" className="mt-6">
            <Plus size={14} /> Connect Cluster
          </Button>
        </div>
      )}
    </PageShell>
  )
}
