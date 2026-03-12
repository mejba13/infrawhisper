"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader } from "@/components/ui/Card"
import { MetricChart } from "@/components/monitoring/MetricChart"
import { useMetrics } from "@/hooks/useMetrics"

export default function MetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cpu } = useMetrics(id, "cpu_usage")
  const { data: mem } = useMetrics(id, "memory_usage")

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Metrics" />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <Card>
            <CardHeader title="CPU Usage" subtitle="Average across all pods · 1m intervals" />
            <MetricChart data={cpu?.data ?? []} metricName="CPU" color="#3b82f6" unit="%" />
          </Card>
          <Card>
            <CardHeader title="Memory Usage" subtitle="Average across all pods · 1m intervals" />
            <MetricChart data={mem?.data ?? []} metricName="Memory" color="#8b5cf6" unit=" MB" />
          </Card>
        </main>
      </div>
    </div>
  )
}
