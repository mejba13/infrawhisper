"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader } from "@/components/ui/Card"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useCosts } from "@/hooks/useQuery"
import { formatCurrency } from "@/lib/utils"
import { DollarSign } from "lucide-react"

export default function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useCosts(id)

  const costs = data?.costs ?? []
  const total = costs.reduce((sum, c) => sum + c.cost_usd, 0)

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Cost Analysis" />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><DollarSign size={12} /> Total (30d)</div>
              <div className="text-2xl font-semibold text-zinc-100">{formatCurrency(total)}</div>
            </Card>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-100 text-sm">Cost Breakdown by Workload</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>
            ) : (
              <Table>
                <thead><tr>
                  <Th>Namespace</Th><Th>Workload</Th><Th>Resource</Th>
                  <Th>Requested</Th><Th>Used</Th><Th>Cost</Th>
                </tr></thead>
                <tbody>
                  {costs.map((c, i) => (
                    <Tr key={i}>
                      <Td>{c.namespace}</Td><Td>{c.workload}</Td><Td>{c.resource_type}</Td>
                      <Td>{c.requested.toFixed(2)}</Td><Td>{c.used.toFixed(2)}</Td>
                      <Td><span className="font-medium text-zinc-200">{formatCurrency(c.cost_usd)}</span></Td>
                    </Tr>
                  ))}
                  {costs.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No cost data yet</td></tr>
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
