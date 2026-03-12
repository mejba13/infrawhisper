"use client"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts"
import type { MetricPoint } from "@/types/metrics"

export function MetricChart({
  data,
  metricName,
  color = "#3b82f6",
  unit = "",
  height = 240,
}: {
  data: MetricPoint[]
  metricName: string
  color?: string
  unit?: string
  height?: number
}) {
  const formatted = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: parseFloat(p.metric_value.toFixed(2)),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v}${unit}`} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={((v: unknown) => [`${v}${unit}`, metricName]) as unknown as undefined}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
