"use client"
import { use, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Pod } from "@/types/cluster"
import { Search } from "lucide-react"

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
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Pods" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter pods..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Loading pods...</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th><Th>Namespace</Th><Th>Status</Th>
                    <Th>Ready</Th><Th>Restarts</Th><Th>Node</Th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((p) => (
                    <Tr key={p.name}>
                      <Td><span className="font-mono text-xs">{p.name}</span></Td>
                      <Td><span className="text-zinc-400">{p.namespace}</span></Td>
                      <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                      <Td>{p.ready}</Td>
                      <Td><span className={p.restarts > 5 ? "text-amber-400" : ""}>{p.restarts}</span></Td>
                      <Td><span className="font-mono text-xs text-zinc-400">{p.node}</span></Td>
                    </Tr>
                  ))}
                  {pods.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No pods found</td></tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
