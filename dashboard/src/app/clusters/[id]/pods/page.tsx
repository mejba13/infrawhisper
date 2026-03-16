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
      {/* Search */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or namespace..."
            className="w-full py-2.5 pl-10 pr-4 text-sm focus-ring"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>
      </div>

      {/* Pod table */}
      <Card className="p-0 overflow-hidden animate-fade-in stagger-2">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading pods...</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Pod Name</Th>
                <Th>Namespace</Th>
                <Th>Status</Th>
                <Th>Ready</Th>
                <Th>Restarts</Th>
                <Th>Node</Th>
              </tr>
            </thead>
            <tbody>
              {pods.map((p) => (
                <Tr key={p.name}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Box size={14} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '12px' }}>
                        {p.name}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      {p.namespace}
                    </span>
                  </Td>
                  <Td><Badge variant={statusVariant(p.status)} dot>{p.status}</Badge></Td>
                  <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{p.ready}</span></Td>
                  <Td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: p.restarts > 5 ? 'var(--status-warning)' : p.restarts > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      fontWeight: p.restarts > 5 ? 600 : 400,
                    }}>
                      {p.restarts}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {p.node}
                    </span>
                  </Td>
                </Tr>
              ))}
              {pods.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No pods found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
