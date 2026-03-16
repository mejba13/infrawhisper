"use client"
import { use, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Pod } from "@/types/cluster"
import { Search, Box, RefreshCw } from "lucide-react"

export default function PodsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["pods", id],
    queryFn: () => api.get<{ pods: Pod[] }>(`/api/v1/clusters/${id}/pods`),
    refetchInterval: 15_000,
  })

  const pods = (data?.pods ?? []).filter(
    (p) => !search || p.name.includes(search) || p.namespace.includes(search)
  )

  return (
    <PageShell title="Pods" subtitle={`${pods.length} pods across all namespaces`} clusterId={id}>
      <div className="flex items-center gap-3 anim-fade-up">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or namespace..."
            className="w-full py-2.5 pl-10 pr-4 text-[13px] rounded-lg bg-surface-raised border border-border-default text-text-primary placeholder:text-text-dim focus:border-border-strong focus:outline-none transition-colors"
          />
        </div>
      </div>

      <Card className="p-0 overflow-hidden anim-fade-up delay-2">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-accent" />
            <p className="text-[13px] text-text-muted">Loading pods...</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr><Th>Pod Name</Th><Th>Namespace</Th><Th>Status</Th><Th>Ready</Th><Th>Restarts</Th><Th>Node</Th></tr>
            </thead>
            <tbody>
              {pods.map((p) => (
                <Tr key={p.name}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Box size={14} className="text-accent shrink-0" />
                      <span className="text-[12px] font-mono font-medium text-text-primary">{p.name}</span>
                    </div>
                  </Td>
                  <Td><span className="rounded bg-surface-overlay px-2 py-0.5 text-[11px] font-medium text-text-secondary">{p.namespace}</span></Td>
                  <Td><Badge variant={statusVariant(p.status)} dot>{p.status}</Badge></Td>
                  <Td><span className="font-mono text-[12px]">{p.ready}</span></Td>
                  <Td>
                    <span className={`font-mono text-[12px] ${p.restarts > 5 ? 'text-status-warn font-semibold' : p.restarts > 0 ? 'text-text-secondary' : 'text-text-dim'}`}>
                      {p.restarts}
                    </span>
                  </Td>
                  <Td><span className="font-mono text-[11px] text-text-muted">{p.node}</span></Td>
                </Tr>
              ))}
              {pods.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-[13px] text-text-muted">No pods found</td></tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
