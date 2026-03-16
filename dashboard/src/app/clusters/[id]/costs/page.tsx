"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card, CardHeader, StatCard } from "@/components/ui/Card"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useCosts } from "@/hooks/useQuery"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, TrendingDown, Layers } from "lucide-react"

export default function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useCosts(id)

  const costs = data?.costs ?? []
  const total = costs.reduce((sum, c) => sum + c.cost_usd, 0)
  const namespaces = new Set(costs.map(c => c.namespace)).size
  const avgWaste = costs.length > 0
    ? costs.reduce((sum, c) => sum + (c.requested > 0 ? (1 - c.used / c.requested) * 100 : 0), 0) / costs.length
    : 0

  return (
    <PageShell title="Cost Analysis" subtitle="Resource utilization and spend" clusterId={id}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="anim-fade-up delay-1"><StatCard label="Total (30d)" value={formatCurrency(total)} icon={<DollarSign size={16} />} accent /></div>
        <div className="anim-fade-up delay-2"><StatCard label="Namespaces" value={namespaces} icon={<Layers size={16} />} /></div>
        <div className="anim-fade-up delay-3"><StatCard label="Avg Waste" value={`${avgWaste.toFixed(0)}%`} icon={<TrendingDown size={16} />} trend={avgWaste > 30 ? "Optimization needed" : "Within budget"} /></div>
      </div>

      <Card className="p-0 overflow-hidden anim-fade-up delay-4">
        <div className="px-5 py-4 border-b border-border-default">
          <h3 className="text-[15px] font-semibold tracking-tight text-text-primary">Cost Breakdown by Workload</h3>
          <p className="text-[12px] text-text-muted mt-0.5">Last 30 days aggregated</p>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-[13px] text-text-muted">Loading cost data...</div>
        ) : (
          <Table>
            <thead><tr><Th>Namespace</Th><Th>Workload</Th><Th>Resource</Th><Th>Requested</Th><Th>Used</Th><Th>Waste</Th><Th>Cost</Th></tr></thead>
            <tbody>
              {costs.map((c, i) => {
                const waste = c.requested > 0 ? (1 - c.used / c.requested) * 100 : 0
                return (
                  <Tr key={i}>
                    <Td><span className="rounded bg-surface-overlay px-2 py-0.5 text-[11px] font-medium text-text-secondary">{c.namespace}</span></Td>
                    <Td><span className="font-mono text-[12px] text-text-primary">{c.workload}</span></Td>
                    <Td><span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">{c.resource_type}</span></Td>
                    <Td><span className="font-mono text-[12px]">{c.requested.toFixed(2)}</span></Td>
                    <Td><span className="font-mono text-[12px]">{c.used.toFixed(2)}</span></Td>
                    <Td>
                      <span className={`font-mono text-[12px] font-semibold ${waste > 50 ? 'text-status-error' : waste > 30 ? 'text-status-warn' : 'text-status-ok'}`}>
                        {waste.toFixed(0)}%
                      </span>
                    </Td>
                    <Td><span className="font-mono text-[12px] font-semibold text-text-primary">{formatCurrency(c.cost_usd)}</span></Td>
                  </Tr>
                )
              })}
              {costs.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-[13px] text-text-muted">No cost data available yet</td></tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
