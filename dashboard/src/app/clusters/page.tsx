"use client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useClusters } from "@/hooks/useQuery"
import { Server, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters()

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Clusters" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {clusters?.length ?? 0} cluster{clusters?.length !== 1 ? "s" : ""} connected
            </p>
            <Button variant="primary" size="sm">
              <Plus size={14} /> Add Cluster
            </Button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-800" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clusters?.map((c) => (
              <Link key={c.id} href={`/clusters/${c.id}`}>
                <Card className="cursor-pointer hover:border-zinc-600 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={16} className="text-zinc-400" />
                      <span className="font-medium text-zinc-100">{c.name}</span>
                    </div>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-zinc-500">
                    <div>{c.provider} · {c.region}</div>
                    <div>{c.node_count} nodes · k8s {c.k8s_version}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {!isLoading && clusters?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Server size={40} className="mb-4 text-zinc-700" />
              <p className="text-zinc-500">No clusters connected yet.</p>
              <p className="mt-1 text-xs text-zinc-600">Deploy the InfraWhisper agent to your cluster to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
