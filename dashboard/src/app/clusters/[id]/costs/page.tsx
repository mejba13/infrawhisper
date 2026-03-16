"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card, StatCard } from "@/components/ui/Card"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useCosts } from "@/hooks/useQuery"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, TrendingDown, Layers } from "lucide-react"

export default function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useCosts(id)
  const costs = data?.costs ?? []
  const total = costs.reduce((s, c) => s + c.cost_usd, 0)
  const ns = new Set(costs.map(c => c.namespace)).size
  const avgW = costs.length > 0 ? costs.reduce((s, c) => s + (c.requested > 0 ? (1 - c.used / c.requested) * 100 : 0), 0) / costs.length : 0

  return (
    <PageShell title="Cost Analysis" subtitle="Resource utilization and spend" clusterId={id}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="anim-fade-up delay-1"><StatCard label="Total (30d)" value={formatCurrency(total)} icon={<DollarSign size={16} />} accent /></div>
        <div className="anim-fade-up delay-2"><StatCard label="Namespaces" value={ns} icon={<Layers size={16} />} /></div>
        <div className="anim-fade-up delay-3"><StatCard label="Avg Waste" value={`${avgW.toFixed(0)}%`} icon={<TrendingDown size={16} />} trend={avgW > 30 ? "Optimization needed" : "Within budget"} /></div>
      </div>
      <Card className="p-0 overflow-hidden anim-fade-up delay-4">
        <div className="px-5 py-4 border-b border-zinc-800/60">
          <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">Cost Breakdown by Workload</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Last 30 days aggregated</p>
        </div>
        {isLoading ? <div className="p-12 text-center text-sm text-zinc-500">Loading...</div> : (
          <Table><thead><tr><Th>Namespace</Th><Th>Workload</Th><Th>Resource</Th><Th>Requested</Th><Th>Used</Th><Th>Waste</Th><Th>Cost</Th></tr></thead>
            <tbody>{costs.map((c, i) => {
              const w = c.requested > 0 ? (1 - c.used / c.requested) * 100 : 0
              return (
                <Tr key={i}>
                  <Td><span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">{c.namespace}</span></Td>
                  <Td><span className="font-mono text-xs text-zinc-200">{c.workload}</span></Td>
                  <Td><span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">{c.resource_type}</span></Td>
                  <Td><span className="font-mono text-xs">{c.requested.toFixed(2)}</span></Td>
                  <Td><span className="font-mono text-xs">{c.used.toFixed(2)}</span></Td>
                  <Td><span className={`font-mono text-xs font-semibold ${w > 50 ? 'text-red-400' : w > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{w.toFixed(0)}%</span></Td>
                  <Td><span className="font-mono text-xs font-semibold text-zinc-200">{formatCurrency(c.cost_usd)}</span></Td>
                </Tr>
              )
            })}{costs.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-sm text-zinc-500">No cost data</td></tr>}</tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
