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
    { t: "CPU Usage", s: "Average across all pods", d: cpu?.data ?? [], c: "#2dd4a8", u: "%", i: <Cpu size={14} /> },
    { t: "Memory Usage", s: "Cluster memory consumption", d: mem?.data ?? [], c: "#60a5fa", u: " MB", i: <MemoryStick size={14} /> },
    { t: "Network I/O", s: "Inbound traffic", d: net?.data ?? [], c: "#fbbf24", u: " B", i: <Wifi size={14} /> },
    { t: "Disk I/O", s: "Read operations", d: disk?.data ?? [], c: "#a78bfa", u: " B/s", i: <HardDrive size={14} /> },
  ]
  return (
    <PageShell title="Metrics" subtitle="Real-time cluster performance" clusterId={id}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {charts.map((ch, idx) => (
          <div key={ch.t} className={cn("anim-fade-up", `delay-${idx+1}`)}>
            <Card>
              <CardHeader title={ch.t} subtitle={ch.s} action={<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">{ch.i}</div>} />
              <MetricChart data={ch.d} metricName={ch.t} color={ch.c} unit={ch.u} />
            </Card>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
