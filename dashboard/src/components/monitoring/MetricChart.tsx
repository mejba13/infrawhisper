"use client"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts"
import type { MetricPoint } from "@/types/metrics"

export function MetricChart({
  data,
  metricName,
  color = "#22d3a7",
  unit = "",
  height = 260,
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
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${metricName}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#282d3c" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#6c7382', fontFamily: "'JetBrains Mono', monospace" }}
          tickLine={false}
          axisLine={{ stroke: '#282d3c' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6c7382', fontFamily: "'JetBrains Mono', monospace" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: '#1c1f2a',
            border: '1px solid #282d3c',
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
          labelStyle={{ color: '#6c7382' }}
          formatter={((v: unknown) => [`${v}${unit}`, metricName]) as unknown as undefined}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${metricName})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: color, fill: '#0a0b0e' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
