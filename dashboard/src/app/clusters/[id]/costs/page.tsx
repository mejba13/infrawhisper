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
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="animate-fade-in stagger-1">
          <StatCard
            label="Total (30d)"
            value={formatCurrency(total)}
            icon={<DollarSign size={16} />}
            accent
          />
        </div>
        <div className="animate-fade-in stagger-2">
          <StatCard
            label="Namespaces"
            value={namespaces}
            icon={<Layers size={16} />}
          />
        </div>
        <div className="animate-fade-in stagger-3">
          <StatCard
            label="Avg Waste"
            value={`${avgWaste.toFixed(0)}%`}
            icon={<TrendingDown size={16} />}
            trend={avgWaste > 30 ? "Optimization needed" : "Within budget"}
          />
        </div>
      </div>

      {/* Cost breakdown table */}
      <Card className="p-0 overflow-hidden animate-fade-in stagger-4">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Cost Breakdown by Workload
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Last 30 days aggregated</p>
        </div>
        {isLoading ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-tertiary)' }}>Loading cost data...</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Namespace</Th>
                <Th>Workload</Th>
                <Th>Resource</Th>
                <Th>Requested</Th>
                <Th>Used</Th>
                <Th>Waste</Th>
                <Th>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c, i) => {
                const waste = c.requested > 0 ? (1 - c.used / c.requested) * 100 : 0
                return (
                  <Tr key={i}>
                    <Td>
                      <span className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {c.namespace}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {c.workload}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {c.resource_type}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.requested.toFixed(2)}</span>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.used.toFixed(2)}</span>
                    </Td>
                    <Td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: waste > 50 ? 'var(--status-critical)' : waste > 30 ? 'var(--status-warning)' : 'var(--status-healthy)',
                      }}>
                        {waste.toFixed(0)}%
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatCurrency(c.cost_usd)}
                      </span>
                    </Td>
                  </Tr>
                )
              })}
              {costs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No cost data available yet
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
