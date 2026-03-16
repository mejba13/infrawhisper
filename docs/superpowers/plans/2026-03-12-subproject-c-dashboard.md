# InfraWhisper Sub-project C: Next.js Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js 14 App Router dashboard — cluster overview, pod/node/service tables, real-time metric charts, log viewer, AI chat interface, cost dashboard, incident cards, alert management, and service topology map.

**Architecture:** Next.js 14 with App Router and TypeScript strict mode. Server Components for data fetching, Client Components for interactivity/real-time. Tailwind CSS + shadcn/ui primitives for styling. React Query for API state, Recharts for charts, WebSocket hooks for live feeds. All API calls go to the Go backend at `NEXT_PUBLIC_API_URL`.

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS, shadcn/ui, Recharts, React Query (TanStack Query v5), WebSocket API, D3.js (topology), Lucide React (icons)

---

## Chunk 1: Project Bootstrap

### Task 1: Initialize Next.js app with all config

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/next.config.js`
- Create: `dashboard/tailwind.config.ts`
- Create: `dashboard/tsconfig.json`
- Create: `dashboard/postcss.config.js`
- Create: `dashboard/.env.local`
- Create: `dashboard/src/app/globals.css`
- Create: `dashboard/Dockerfile`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
npx create-next-app@latest dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-git \
  --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/dashboard"
npm install \
  @tanstack/react-query@^5 \
  recharts \
  lucide-react \
  d3 \
  @types/d3 \
  class-variance-authority \
  clsx \
  tailwind-merge \
  @radix-ui/react-dialog \
  @radix-ui/react-tabs \
  @radix-ui/react-tooltip \
  @radix-ui/react-badge \
  @radix-ui/react-select \
  @radix-ui/react-dropdown-menu \
  cmdk
```

- [ ] **Step 3: Create `dashboard/.env.local`**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

- [ ] **Step 4: Create `dashboard/src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function formatCurrency(usd: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usd)
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
```

- [ ] **Step 5: Create `dashboard/src/lib/api.ts`**

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("iw_token") : null
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error ?? "Request failed")
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
```

- [ ] **Step 6: Create `dashboard/src/lib/ws.ts`**

```typescript
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080"

export type WSMessage = {
  type: string
  [key: string]: unknown
}

export function createWebSocket(
  path: string,
  onMessage: (msg: WSMessage) => void,
  onError?: (e: Event) => void
): WebSocket {
  const token = typeof window !== "undefined" ? localStorage.getItem("iw_token") : null
  const url = `${WS_BASE}${path}${token ? `?token=${token}` : ""}`
  const ws = new WebSocket(url)

  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {
      // ignore malformed messages
    }
  }

  ws.onerror = onError ?? ((e) => console.error("WebSocket error", e))
  return ws
}
```

- [ ] **Step 7: Create `dashboard/src/lib/auth.ts`**

```typescript
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("iw_token")
}

export function setToken(token: string): void {
  localStorage.setItem("iw_token", token)
}

export function clearToken(): void {
  localStorage.removeItem("iw_token")
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
```

- [ ] **Step 8: Create `dashboard/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 9: Verify Next.js builds**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/dashboard"
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 10: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add dashboard/
git commit -m "feat(dashboard): initialize Next.js 14 app with Tailwind, deps, lib utilities"
```

---

## Chunk 2: Types & Hooks

### Task 2: TypeScript types and React Query hooks

**Files:**
- Create: `dashboard/src/types/cluster.ts`
- Create: `dashboard/src/types/metrics.ts`
- Create: `dashboard/src/types/logs.ts`
- Create: `dashboard/src/types/incidents.ts`
- Create: `dashboard/src/types/costs.ts`
- Create: `dashboard/src/hooks/useMetrics.ts`
- Create: `dashboard/src/hooks/useLogs.ts`
- Create: `dashboard/src/hooks/useWebSocket.ts`
- Create: `dashboard/src/hooks/useQuery.ts`

- [ ] **Step 1: Create `dashboard/src/types/cluster.ts`**

```typescript
export interface Cluster {
  id: string
  tenant_id: string
  name: string
  provider: string
  region: string
  k8s_version: string
  status: "healthy" | "degraded" | "critical" | "pending" | "unknown"
  node_count: number
  agent_token: string
}

export interface Pod {
  name: string
  namespace: string
  status: "Running" | "Pending" | "Failed" | "Succeeded" | "Unknown" | "CrashLoopBackOff"
  ready: string
  restarts: number
  age: string
  node: string
  cpu_usage: number
  memory_usage: number
}

export interface Node {
  name: string
  status: "Ready" | "NotReady" | "Unknown"
  roles: string[]
  age: string
  version: string
  cpu_capacity: number
  memory_capacity: number
  cpu_usage: number
  memory_usage: number
}

export interface AlertRule {
  id: string
  tenant_id: string
  cluster_id: string | null
  name: string
  description: string | null
  condition: Record<string, unknown>
  severity: "critical" | "high" | "warning" | "info"
  enabled: boolean
  channels: unknown[]
}
```

- [ ] **Step 2: Create `dashboard/src/types/metrics.ts`**

```typescript
export interface MetricPoint {
  timestamp: string
  cluster_id: string
  namespace: string
  pod: string
  metric_name: string
  metric_value: number
}

export interface MetricsResponse {
  metric: string
  data: MetricPoint[]
}
```

- [ ] **Step 3: Create `dashboard/src/types/logs.ts`**

```typescript
export interface LogEntry {
  timestamp: string
  cluster_id: string
  namespace: string
  pod: string
  container: string
  severity: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL"
  body: string
  trace_id: string
  attributes: Record<string, string>
}

export interface LogsResponse {
  logs: LogEntry[]
}
```

- [ ] **Step 4: Create `dashboard/src/types/incidents.ts`**

```typescript
export interface Incident {
  id: string
  tenant_id: string
  cluster_id: string
  title: string
  severity: "critical" | "high" | "warning" | "info"
  status: "open" | "investigating" | "resolved"
  root_cause: string | null
  ai_summary: string | null
}

export interface AnalyzeResponse {
  incident_title: string
  severity: "critical" | "high" | "warning" | "info"
  root_causes: { component: string; description: string; confidence: number }[]
  ai_summary: string
  remediation_steps: { order: number; action: string; command: string | null; expected_outcome: string }[]
  related_services: string[]
  estimated_impact: string
  confidence_score: number
}
```

- [ ] **Step 5: Create `dashboard/src/types/costs.ts`**

```typescript
export interface CostRecord {
  date: string
  namespace: string
  workload: string
  resource_type: "cpu" | "memory" | "storage"
  requested: number
  used: number
  cost_usd: number
}

export interface CostsResponse {
  costs: CostRecord[]
}

export interface OptimizeResponse {
  total_estimated_monthly_savings_usd: number
  recommendations: {
    namespace: string
    workload: string
    resource_type: string
    current_request: number
    recommended_request: number
    waste_percentage: number
    estimated_monthly_savings_usd: number
    reason: string
  }[]
  summary: string
  top_offenders: string[]
}
```

- [ ] **Step 6: Create `dashboard/src/hooks/useWebSocket.ts`**

```typescript
"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { createWebSocket, type WSMessage } from "@/lib/ws"

export function useWebSocket(path: string, enabled = true) {
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = createWebSocket(path, (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg])
    })
    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, 3000) // reconnect after 3s
    }
    wsRef.current = ws
  }, [path, enabled])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  return { messages, connected }
}
```

- [ ] **Step 7: Create `dashboard/src/hooks/useMetrics.ts`**

```typescript
"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { MetricsResponse } from "@/types/metrics"

export function useMetrics(clusterId: string, metric = "cpu_usage", step = "1 MINUTE") {
  return useQuery({
    queryKey: ["metrics", clusterId, metric, step],
    queryFn: () =>
      api.get<MetricsResponse>(
        `/api/v1/clusters/${clusterId}/metrics?metric=${metric}&step=${encodeURIComponent(step)}`
      ),
    refetchInterval: 30_000,
    enabled: !!clusterId,
  })
}
```

- [ ] **Step 8: Create `dashboard/src/hooks/useLogs.ts`**

```typescript
"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { LogsResponse } from "@/types/logs"

export function useLogs(
  clusterId: string,
  params: { namespace?: string; pod?: string; severity?: string; search?: string; limit?: number } = {}
) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && query.set(k, String(v)))

  return useQuery({
    queryKey: ["logs", clusterId, params],
    queryFn: () =>
      api.get<LogsResponse>(`/api/v1/clusters/${clusterId}/logs?${query}`),
    enabled: !!clusterId,
  })
}
```

- [ ] **Step 9: Create `dashboard/src/hooks/useQuery.ts`**

```typescript
"use client"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Cluster, AlertRule } from "@/types/cluster"
import type { Incident } from "@/types/incidents"
import type { CostsResponse } from "@/types/costs"

export function useClusters() {
  return useQuery({
    queryKey: ["clusters"],
    queryFn: () => api.get<Cluster[]>("/api/v1/clusters"),
    refetchInterval: 60_000,
  })
}

export function useCluster(id: string) {
  return useQuery({
    queryKey: ["cluster", id],
    queryFn: () => api.get<Cluster>(`/api/v1/clusters/${id}`),
    enabled: !!id,
  })
}

export function useIncidents(clusterId: string) {
  return useQuery({
    queryKey: ["incidents", clusterId],
    queryFn: () => api.get<Incident[]>(`/api/v1/clusters/${clusterId}/incidents`),
    enabled: !!clusterId,
  })
}

export function useAlerts(clusterId: string) {
  return useQuery({
    queryKey: ["alerts", clusterId],
    queryFn: () => api.get<AlertRule[]>(`/api/v1/clusters/${clusterId}/alerts`),
    enabled: !!clusterId,
  })
}

export function useCosts(clusterId: string) {
  return useQuery({
    queryKey: ["costs", clusterId],
    queryFn: () => api.get<CostsResponse>(`/api/v1/clusters/${clusterId}/costs`),
    enabled: !!clusterId,
  })
}

export function useNLQuery(clusterId: string) {
  return useMutation({
    mutationFn: (query: string) =>
      api.post<{ answer: string; sql_used: string; data_points: number }>(
        `/api/v1/clusters/${clusterId}/query`,
        { query }
      ),
  })
}
```

- [ ] **Step 10: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add dashboard/src/types/ dashboard/src/hooks/ dashboard/src/lib/
git commit -m "feat(dashboard): TypeScript types and React Query hooks"
```

---

## Chunk 3: UI Primitives & Layout

### Task 3: Shared UI components and app layout

**Files:**
- Create: `dashboard/src/components/ui/Badge.tsx`
- Create: `dashboard/src/components/ui/Button.tsx`
- Create: `dashboard/src/components/ui/Card.tsx`
- Create: `dashboard/src/components/ui/Table.tsx`
- Create: `dashboard/src/components/ui/Tabs.tsx`
- Create: `dashboard/src/components/ui/Modal.tsx`
- Create: `dashboard/src/components/ui/Tooltip.tsx`
- Create: `dashboard/src/components/layout/Sidebar.tsx`
- Create: `dashboard/src/components/layout/Header.tsx`
- Create: `dashboard/src/app/layout.tsx`
- Create: `dashboard/src/app/globals.css`
- Modify: `dashboard/src/app/page.tsx`

- [ ] **Step 1: Create `dashboard/src/components/ui/Badge.tsx`**

```tsx
import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted"

const variants: Record<Variant, string> = {
  default: "bg-zinc-800 text-zinc-200",
  success: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  warning: "bg-amber-900/50 text-amber-400 border border-amber-800",
  danger: "bg-red-900/50 text-red-400 border border-red-800",
  info: "bg-blue-900/50 text-blue-400 border border-blue-800",
  muted: "bg-zinc-900 text-zinc-500",
}

export function Badge({
  variant = "default",
  children,
  className,
}: {
  variant?: Variant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusVariant(status: string): Variant {
  switch (status.toLowerCase()) {
    case "running": case "healthy": case "ready": case "resolved": return "success"
    case "pending": case "warning": case "investigating": return "warning"
    case "failed": case "critical": case "crashloopbackoff": case "notready": return "danger"
    default: return "muted"
  }
}
```

- [ ] **Step 2: Create `dashboard/src/components/ui/Button.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
  ghost: "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200",
  danger: "bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-800",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) => {
    const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-1.5 text-sm", lg: "px-5 py-2.5 text-base" }
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
```

- [ ] **Step 3: Create `dashboard/src/components/ui/Card.tsx`**

```tsx
import { cn } from "@/lib/utils"

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

- [ ] **Step 4: Create `dashboard/src/components/ui/Table.tsx`**

```tsx
import { cn } from "@/lib/utils"

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-zinc-800 px-3 py-2 text-left text-xs font-medium text-zinc-500", className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-zinc-800/50 px-3 py-2.5 text-zinc-300", className)}>
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn("hover:bg-zinc-800/40 transition-colors", className)}>
      {children}
    </tr>
  )
}
```

- [ ] **Step 5: Create `dashboard/src/components/ui/Tabs.tsx`**

```tsx
"use client"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

export function Tabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              active === t.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  )
}
```

- [ ] **Step 6: Create `dashboard/src/components/ui/Modal.tsx`**

```tsx
"use client"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={cn("relative z-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl", className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create `dashboard/src/components/ui/Tooltip.tsx`**

```tsx
"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 whitespace-nowrap shadow-lg border border-zinc-700 z-50">
          {content}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Create `dashboard/src/components/layout/Sidebar.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Server, Activity, FileText, GitBranch,
  AlertTriangle, DollarSign, Bell, MessageSquare, Settings, Zap
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/clusters", label: "Clusters", icon: Server },
  { href: "/query", label: "AI Query", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
]

const CLUSTER_NAV = (id: string) => [
  { href: `/clusters/${id}`, label: "Overview", icon: LayoutDashboard },
  { href: `/clusters/${id}/pods`, label: "Pods", icon: Zap },
  { href: `/clusters/${id}/nodes`, label: "Nodes", icon: Server },
  { href: `/clusters/${id}/metrics`, label: "Metrics", icon: Activity },
  { href: `/clusters/${id}/logs`, label: "Logs", icon: FileText },
  { href: `/clusters/${id}/traces`, label: "Traces", icon: GitBranch },
  { href: `/clusters/${id}/incidents`, label: "Incidents", icon: AlertTriangle },
  { href: `/clusters/${id}/costs`, label: "Costs", icon: DollarSign },
  { href: `/clusters/${id}/alerts`, label: "Alerts", icon: Bell },
]

export function Sidebar({ clusterId }: { clusterId?: string }) {
  const pathname = usePathname()
  const items = clusterId ? CLUSTER_NAV(clusterId) : NAV_ITEMS

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-zinc-100 text-sm">InfraWhisper</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors mb-0.5",
              pathname === href
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 9: Create `dashboard/src/components/layout/Header.tsx`**

```tsx
"use client"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Search">
          <Search size={15} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Notifications">
          <Bell size={15} />
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 10: Create `dashboard/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #09090b;
  --foreground: #fafafa;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }
```

- [ ] **Step 11: Create `dashboard/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "InfraWhisper — AI Infrastructure Copilot",
  description: "AI-powered Kubernetes observability platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 12: Create `dashboard/src/app/providers.tsx`**

```tsx
"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 13: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add dashboard/src/components/ dashboard/src/app/
git commit -m "feat(dashboard): UI primitives, layout components, app shell"
```

---

## Chunk 4: Dashboard Pages

### Task 4: Core dashboard pages

**Files:**
- Create: `dashboard/src/app/page.tsx`
- Create: `dashboard/src/app/clusters/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/pods/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/metrics/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/logs/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/incidents/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/costs/page.tsx`
- Create: `dashboard/src/app/clusters/[id]/alerts/page.tsx`
- Create: `dashboard/src/app/query/page.tsx`

- [ ] **Step 1: Create `dashboard/src/app/page.tsx`** (home — redirect to clusters)

```tsx
import { redirect } from "next/navigation"
export default function Home() {
  redirect("/clusters")
}
```

- [ ] **Step 2: Create `dashboard/src/app/clusters/page.tsx`**

```tsx
"use client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useClusters } from "@/hooks/useQuery"
import { Server, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export default function ClustersPage() {
  const { data: clusters, isLoading } = useClusters()

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Clusters" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {clusters?.length ?? 0} cluster{clusters?.length !== 1 ? "s" : ""} connected
            </p>
            <Button variant="primary" size="sm">
              <Plus size={14} /> Add Cluster
            </Button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-800" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clusters?.map((c) => (
              <Link key={c.id} href={`/clusters/${c.id}`}>
                <Card className="cursor-pointer hover:border-zinc-600 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={16} className="text-zinc-400" />
                      <span className="font-medium text-zinc-100">{c.name}</span>
                    </div>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-zinc-500">
                    <div>{c.provider} · {c.region}</div>
                    <div>{c.node_count} nodes · k8s {c.k8s_version}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {!isLoading && clusters?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Server size={40} className="mb-4 text-zinc-700" />
              <p className="text-zinc-500">No clusters connected yet.</p>
              <p className="mt-1 text-xs text-zinc-600">Deploy the InfraWhisper agent to your cluster to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `dashboard/src/app/clusters/[id]/page.tsx`** (cluster overview)

```tsx
"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useCluster, useIncidents } from "@/hooks/useQuery"
import { Activity, AlertTriangle, Server, Cpu } from "lucide-react"

export default function ClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: cluster } = useCluster(id)
  const { data: incidents } = useIncidents(id)

  const openIncidents = incidents?.filter((i) => i.status === "open") ?? []
  const criticalIncidents = openIncidents.filter((i) => i.severity === "critical")

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={cluster?.name ?? "Cluster"} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats row */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Server size={12} /> Nodes</div>
              <div className="text-2xl font-semibold text-zinc-100">{cluster?.node_count ?? "—"}</div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><AlertTriangle size={12} /> Open Incidents</div>
              <div className={`text-2xl font-semibold ${openIncidents.length > 0 ? "text-amber-400" : "text-zinc-100"}`}>
                {openIncidents.length}
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><AlertTriangle size={12} /> Critical</div>
              <div className={`text-2xl font-semibold ${criticalIncidents.length > 0 ? "text-red-400" : "text-zinc-100"}`}>
                {criticalIncidents.length}
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Activity size={12} /> Status</div>
              <Badge variant={statusVariant(cluster?.status ?? "unknown")} className="mt-1">
                {cluster?.status ?? "unknown"}
              </Badge>
            </Card>
          </div>

          {/* Recent incidents */}
          {openIncidents.length > 0 && (
            <Card className="mb-4">
              <CardHeader title="Open Incidents" subtitle={`${openIncidents.length} requiring attention`} />
              <div className="space-y-2">
                {openIncidents.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <span className="text-sm text-zinc-200">{i.title}</span>
                    <Badge variant={statusVariant(i.severity)}>{i.severity}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Cluster Info" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Provider", cluster?.provider],
                ["Region", cluster?.region],
                ["Kubernetes", cluster?.k8s_version],
                ["ID", cluster?.id?.slice(0, 8) + "…"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200 font-mono text-xs mt-0.5">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `dashboard/src/app/clusters/[id]/pods/page.tsx`**

```tsx
"use client"
import { use, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Pod } from "@/types/cluster"
import { Search } from "lucide-react"

export default function PodsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["pods", id],
    queryFn: () => api.get<{ pods: Pod[] }>(`/api/v1/clusters/${id}/pods`),
    refetchInterval: 15_000,
  })

  const pods = (data?.pods ?? []).filter(
    (p) => !search || p.name.includes(search) || p.namespace.includes(search)
  )

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Pods" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter pods..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Loading pods...</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th><Th>Namespace</Th><Th>Status</Th>
                    <Th>Ready</Th><Th>Restarts</Th><Th>Node</Th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((p) => (
                    <Tr key={p.name}>
                      <Td><span className="font-mono text-xs">{p.name}</span></Td>
                      <Td><span className="text-zinc-400">{p.namespace}</span></Td>
                      <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                      <Td>{p.ready}</Td>
                      <Td><span className={p.restarts > 5 ? "text-amber-400" : ""}>{p.restarts}</span></Td>
                      <Td><span className="font-mono text-xs text-zinc-400">{p.node}</span></Td>
                    </Tr>
                  ))}
                  {pods.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No pods found</td></tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `dashboard/src/components/monitoring/MetricChart.tsx`**

```tsx
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
          formatter={(v: number) => [`${v}${unit}`, metricName]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 6: Create `dashboard/src/app/clusters/[id]/metrics/page.tsx`**

```tsx
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
```

- [ ] **Step 7: Create `dashboard/src/app/clusters/[id]/logs/page.tsx`**

```tsx
"use client"
import { use, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useLogs } from "@/hooks/useLogs"
import { Search } from "lucide-react"
import { relativeTime } from "@/lib/utils"
import type { LogEntry } from "@/types/logs"

const SEVERITY_COLORS: Record<string, string> = {
  ERROR: "text-red-400", FATAL: "text-red-500",
  WARN: "text-amber-400", INFO: "text-blue-400",
  DEBUG: "text-zinc-500", TRACE: "text-zinc-600",
}

export default function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("")
  const { data, isLoading, refetch } = useLogs(id, { search, severity, limit: 200 })

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Logs" />
        <main className="flex-1 overflow-hidden flex flex-col p-6 gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none"
            >
              <option value="">All levels</option>
              {["ERROR", "WARN", "INFO", "DEBUG"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <Card className="flex-1 overflow-y-auto p-0 font-mono">
            {isLoading && <div className="p-4 text-zinc-500 text-sm">Loading logs...</div>}
            <div className="divide-y divide-zinc-800/30">
              {(data?.logs ?? []).map((log: LogEntry, i) => (
                <div key={i} className="flex gap-3 px-4 py-1.5 hover:bg-zinc-800/30 text-xs">
                  <span className="shrink-0 text-zinc-600">{relativeTime(log.timestamp)}</span>
                  <span className={`shrink-0 w-10 ${SEVERITY_COLORS[log.severity] ?? "text-zinc-400"}`}>
                    {log.severity.slice(0, 4)}
                  </span>
                  <span className="shrink-0 text-zinc-500 w-28 truncate">{log.pod}</span>
                  <span className="text-zinc-300 break-all">{log.body}</span>
                </div>
              ))}
              {!isLoading && data?.logs?.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No logs found</div>
              )}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create `dashboard/src/app/clusters/[id]/incidents/page.tsx`**

```tsx
"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { useIncidents } from "@/hooks/useQuery"
import { AlertTriangle } from "lucide-react"

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: incidents, isLoading } = useIncidents(id)

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Incidents" />
        <main className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && <div className="text-zinc-500 text-sm">Loading incidents...</div>}
          {(incidents ?? []).map((incident) => (
            <Card key={incident.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-medium text-zinc-100 text-sm">{incident.title}</p>
                    {incident.ai_summary && (
                      <p className="mt-1 text-xs text-zinc-400">{incident.ai_summary}</p>
                    )}
                    {incident.root_cause && (
                      <p className="mt-1 text-xs text-zinc-500">Root cause: {incident.root_cause}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={statusVariant(incident.severity)}>{incident.severity}</Badge>
                  <Badge variant={statusVariant(incident.status)}>{incident.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
          {!isLoading && incidents?.length === 0 && (
            <div className="py-24 text-center text-zinc-500">No incidents — great job! 🎉</div>
          )}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Create `dashboard/src/app/clusters/[id]/costs/page.tsx`**

```tsx
"use client"
import { use } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card, CardHeader } from "@/components/ui/Card"
import { Table, Th, Td, Tr } from "@/components/ui/Table"
import { useCosts } from "@/hooks/useQuery"
import { formatCurrency } from "@/lib/utils"
import { DollarSign } from "lucide-react"

export default function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useCosts(id)

  const costs = data?.costs ?? []
  const total = costs.reduce((sum, c) => sum + c.cost_usd, 0)

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Cost Analysis" />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><DollarSign size={12} /> Total (30d)</div>
              <div className="text-2xl font-semibold text-zinc-100">{formatCurrency(total)}</div>
            </Card>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-zinc-100 text-sm">Cost Breakdown by Workload</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>
            ) : (
              <Table>
                <thead><tr>
                  <Th>Namespace</Th><Th>Workload</Th><Th>Resource</Th>
                  <Th>Requested</Th><Th>Used</Th><Th>Cost</Th>
                </tr></thead>
                <tbody>
                  {costs.map((c, i) => (
                    <Tr key={i}>
                      <Td>{c.namespace}</Td><Td>{c.workload}</Td><Td>{c.resource_type}</Td>
                      <Td>{c.requested.toFixed(2)}</Td><Td>{c.used.toFixed(2)}</Td>
                      <Td><span className="font-medium text-zinc-200">{formatCurrency(c.cost_usd)}</span></Td>
                    </Tr>
                  ))}
                  {costs.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No cost data yet</td></tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Create `dashboard/src/app/clusters/[id]/alerts/page.tsx`**

```tsx
"use client"
import { use, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Badge, statusVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useAlerts } from "@/hooks/useQuery"
import { Bell, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

export default function AlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: alerts, isLoading } = useAlerts(id)
  const qc = useQueryClient()

  const handleDelete = async (alertId: string) => {
    await api.delete(`/api/v1/clusters/${id}/alerts/${alertId}`)
    qc.invalidateQueries({ queryKey: ["alerts", id] })
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar clusterId={id} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Alert Rules" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex justify-end">
            <Button variant="primary" size="sm"><Plus size={14} /> New Alert</Button>
          </div>
          {isLoading && <div className="text-zinc-500 text-sm">Loading...</div>}
          <div className="space-y-2">
            {(alerts ?? []).map((rule) => (
              <Card key={rule.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-zinc-400" />
                    <span className="font-medium text-zinc-200 text-sm">{rule.name}</span>
                    <Badge variant={statusVariant(rule.severity)}>{rule.severity}</Badge>
                    {!rule.enabled && <Badge variant="muted">disabled</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)} aria-label="Delete rule">
                    <Trash2 size={13} className="text-zinc-500" />
                  </Button>
                </div>
                {rule.description && <p className="mt-1 text-xs text-zinc-500 pl-6">{rule.description}</p>}
              </Card>
            ))}
            {!isLoading && alerts?.length === 0 && (
              <div className="py-16 text-center text-zinc-500">No alert rules configured.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Create `dashboard/src/app/query/page.tsx`** (NL chat interface)

```tsx
"use client"
import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useClusters, useNLQuery } from "@/hooks/useQuery"
import { MessageSquare, Send, Code2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  sql?: string
  data_points?: number
}

export default function QueryPage() {
  const { data: clusters } = useClusters()
  const [clusterId, setClusterId] = useState("")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const { mutateAsync, isPending } = useNLQuery(clusterId)

  const handleSend = async () => {
    if (!input.trim() || !clusterId || isPending) return
    const userMsg = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", content: userMsg }])
    try {
      const result = await mutateAsync(userMsg)
      setMessages((m) => [...m, {
        role: "assistant",
        content: result.answer,
        sql: result.sql_used,
        data_points: result.data_points,
      }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Query failed"
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }])
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="AI Query" />
        <main className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
          {/* Cluster selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500">Cluster:</label>
            <select
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none"
            >
              <option value="">Select a cluster...</option>
              {(clusters ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Chat messages */}
          <Card className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MessageSquare size={36} className="text-zinc-700" />
                <p className="text-zinc-500 text-sm">Ask anything about your infrastructure</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "What pods have restarted most in the last hour?",
                    "Show me memory usage by namespace",
                    "Which workloads are costing the most?",
                  ].map((q) => (
                    <button key={q} onClick={() => setInput(q)}
                      className="text-xs rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"
                }`}>
                  <p>{m.content}</p>
                  {m.sql && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-zinc-400 flex items-center gap-1">
                        <Code2 size={10} /> SQL used · {m.data_points} rows
                      </summary>
                      <pre className="mt-2 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">{m.sql}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-xl px-4 py-2.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={clusterId ? "Ask about your infrastructure..." : "Select a cluster first"}
              disabled={!clusterId || isPending}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <Button variant="primary" onClick={handleSend} disabled={!input.trim() || !clusterId || isPending}>
              <Send size={14} />
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 12: Verify TypeScript compiles**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/dashboard"
npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before committing.

- [ ] **Step 13: Commit**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
git add dashboard/src/app/ dashboard/src/components/
git commit -m "feat(dashboard): all dashboard pages — clusters, pods, metrics, logs, incidents, costs, alerts, AI query"
```

---

## Chunk 5: docker-compose & build verification

### Task 5: Wire dashboard into docker-compose and verify build

**Files:**
- Modify: `docker-compose.yml`
- Verify: `npm run build` passes

- [ ] **Step 1: Add dashboard service to `docker-compose.yml`**

Add before `volumes:`:
```yaml
  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api-server:8080
      NEXT_PUBLIC_WS_URL: ws://api-server:8080
    depends_on:
      - ai-engine
    restart: unless-stopped
```

Also add `output: "standalone"` to `dashboard/next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
}
module.exports = nextConfig
```

- [ ] **Step 2: Run production build**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper/dashboard"
npm run build 2>&1 | tail -20
```

Expected: exits 0 with `✓ Compiled` or `Route (app)` table.

- [ ] **Step 3: Validate docker-compose**

```bash
cd "/Users/mejba/Local Storage/AI Development/infrawhisper"
docker compose config --quiet && echo "OK"
```

- [ ] **Step 4: Final commit**

```bash
git add dashboard/ docker-compose.yml
git commit -m "feat(dashboard): production build verified, docker-compose wired"
```

---

## Next Sub-project

- **Sub-project D** — Helm charts, multi-stage Dockerfiles, GitHub Actions CI/CD
