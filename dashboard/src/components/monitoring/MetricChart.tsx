"use client"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts"
import type { MetricPoint } from "@/types/metrics"

export function MetricChart({
  data,
  metricName,
  color = "#00d4aa",
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
          <linearGradient id={`gradient-${metricName}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-subtle)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-subtle)' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            boxShadow: 'var(--shadow-md)',
          }}
          labelStyle={{ color: 'var(--text-tertiary)' }}
          formatter={((v: unknown) => [`${v}${unit}`, metricName]) as unknown as undefined}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${metricName})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: color, fill: 'var(--bg-root)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
