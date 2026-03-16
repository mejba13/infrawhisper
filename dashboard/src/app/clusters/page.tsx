"use client"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useClusters } from "@/hooks/useQuery"
import { Server, Plus, ArrowUpRight, Globe, Cpu } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters()

  return (
    <PageShell title="Clusters" subtitle={`${clusters?.length ?? 0} clusters connected`}>
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm"><Plus size={14} /> Add Cluster</Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("h-44 rounded-xl anim-shimmer", `delay-${i}`)} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clusters?.map((c, i) => (
          <Link key={c.id} href={`/clusters/${c.id}`}>
            <Card hover className={cn("group anim-fade-up", `delay-${(i % 6) + 1}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim group-hover:scale-110 transition-transform duration-200">
                    <Server size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight text-text-primary">{c.name}</p>
                    <Badge variant={statusVariant(c.status)} dot className="mt-1">{c.status}</Badge>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-text-dim opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-200" />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-subtle">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Globe size={10} className="text-text-dim" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-dim">Region</span>
                  </div>
                  <span className="text-[12px] font-medium font-mono text-text-secondary">{c.region}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Cpu size={10} className="text-text-dim" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-dim">Nodes</span>
                  </div>
                  <span className="text-[12px] font-medium text-text-secondary">{c.node_count}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-dim block mb-1">Version</span>
                  <span className="text-[12px] font-medium font-mono text-text-secondary">{c.k8s_version}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!isLoading && clusters?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center anim-fade-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised border border-border-default mb-5">
            <Server size={28} className="text-text-muted" />
          </div>
          <p className="text-[15px] font-medium text-text-secondary">No clusters connected yet</p>
          <p className="mt-2 text-[13px] text-text-muted max-w-xs">
            Deploy the InfraWhisper agent to your Kubernetes cluster to get started.
          </p>
          <Button variant="primary" className="mt-6"><Plus size={14} /> Connect Cluster</Button>
        </div>
      )}
    </PageShell>
  )
}
