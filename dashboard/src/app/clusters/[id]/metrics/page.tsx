"use client"
import { use } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card, CardHeader } from "@/components/ui/Card"
import { MetricChart } from "@/components/monitoring/MetricChart"
import { useMetrics } from "@/hooks/useMetrics"
import { Cpu, MemoryStick, Wifi, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"

export default function MetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cpu } = useMetrics(id, "cpu_usage")
  const { data: mem } = useMetrics(id, "memory_usage")
  const { data: net } = useMetrics(id, "network_rx_bytes")
  const { data: disk } = useMetrics(id, "disk_io_read")

  const charts = [
    { title: "CPU Usage", sub: "Average across all pods", data: cpu?.data ?? [], color: "#22d3a7", unit: "%", icon: <Cpu size={14} /> },
    { title: "Memory Usage", sub: "Cluster memory consumption", data: mem?.data ?? [], color: "#60a5fa", unit: " MB", icon: <MemoryStick size={14} /> },
    { title: "Network I/O", sub: "Inbound traffic (rx bytes)", data: net?.data ?? [], color: "#fbbf24", unit: " B", icon: <Wifi size={14} /> },
    { title: "Disk I/O", sub: "Read operations", data: disk?.data ?? [], color: "#a78bfa", unit: " B/s", icon: <HardDrive size={14} /> },
  ]

  return (
    <PageShell title="Metrics" subtitle="Real-time cluster performance" clusterId={id}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {charts.map((c, i) => (
          <div key={c.title} className={cn("anim-fade-up", `delay-${i + 1}`)}>
            <Card>
              <CardHeader
                title={c.title}
                subtitle={c.sub}
                action={<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-overlay text-text-muted">{c.icon}</div>}
              />
              <MetricChart data={c.data} metricName={c.title} color={c.color} unit={c.unit} />
            </Card>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
