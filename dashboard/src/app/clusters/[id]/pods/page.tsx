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
  const { data, isLoading } = useQuery({ queryKey: ["pods", id], queryFn: () => api.get<{ pods: Pod[] }>(`/api/v1/clusters/${id}/pods`), refetchInterval: 15_000 })
  const pods = (data?.pods ?? []).filter(p => !search || p.name.includes(search) || p.namespace.includes(search))
  return (
    <PageShell title="Pods" subtitle={`${pods.length} pods across all namespaces`} clusterId={id}>
      <div className="flex items-center gap-3 anim-fade-up">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name or namespace..."
            className="w-full py-2.5 pl-10 pr-4 text-[13px] rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none transition-colors" />
        </div>
      </div>
      <Card className="p-0 overflow-hidden anim-fade-up delay-2">
        {isLoading ? (
          <div className="p-12 text-center"><RefreshCw size={20} className="animate-spin mx-auto mb-3 text-teal-400" /><p className="text-sm text-zinc-500">Loading pods...</p></div>
        ) : (
          <Table><thead><tr><Th>Pod Name</Th><Th>Namespace</Th><Th>Status</Th><Th>Ready</Th><Th>Restarts</Th><Th>Node</Th></tr></thead>
            <tbody>
              {pods.map(p => (
                <Tr key={p.name}>
                  <Td><div className="flex items-center gap-2.5"><Box size={14} className="text-teal-400 shrink-0" /><span className="text-xs font-mono font-medium text-zinc-200">{p.name}</span></div></Td>
                  <Td><span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">{p.namespace}</span></Td>
                  <Td><Badge variant={statusVariant(p.status)} dot>{p.status}</Badge></Td>
                  <Td><span className="font-mono text-xs">{p.ready}</span></Td>
                  <Td><span className={`font-mono text-xs ${p.restarts > 5 ? 'text-amber-400 font-semibold' : 'text-zinc-400'}`}>{p.restarts}</span></Td>
                  <Td><span className="font-mono text-[11px] text-zinc-500">{p.node}</span></Td>
                </Tr>
              ))}
              {pods.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-sm text-zinc-500">No pods found</td></tr>}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
