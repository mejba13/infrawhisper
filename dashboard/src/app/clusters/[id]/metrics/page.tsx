"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card, CardHeader } from "@/components/ui/Card"
import { MetricChart } from "@/components/monitoring/MetricChart"
import { useMetrics } from "@/hooks/useMetrics"
import { Cpu, MemoryStick, Wifi, HardDrive } from "lucide-react"

export default function MetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cpu } = useMetrics(id, "cpu_usage")
  const { data: mem } = useMetrics(id, "memory_usage")
  const { data: net } = useMetrics(id, "network_rx_bytes")
  const { data: disk } = useMetrics(id, "disk_io_read")

  const charts = [
    { title: "CPU Usage", subtitle: "Average across all pods", data: cpu?.data ?? [], color: "#00d4aa", unit: "%", icon: <Cpu size={14} /> },
    { title: "Memory Usage", subtitle: "Cluster memory consumption", data: mem?.data ?? [], color: "#60a5fa", unit: " MB", icon: <MemoryStick size={14} /> },
    { title: "Network I/O", subtitle: "Inbound traffic (rx bytes)", data: net?.data ?? [], color: "#fbbf24", unit: " B", icon: <Wifi size={14} /> },
    { title: "Disk I/O", subtitle: "Read operations", data: disk?.data ?? [], color: "#a78bfa", unit: " B/s", icon: <HardDrive size={14} /> },
  ]

  return (
    <PageShell title="Metrics" subtitle="Real-time cluster performance" clusterId={id}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {charts.map((chart, i) => (
          <div key={chart.title} className={`animate-fade-in stagger-${i + 1}`}>
            <Card>
              <CardHeader
                title={chart.title}
                subtitle={chart.subtitle}
                action={
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
                    {chart.icon}
                  </div>
                }
              />
              <MetricChart
                data={chart.data}
                metricName={chart.title}
                color={chart.color}
                unit={chart.unit}
              />
            </Card>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
