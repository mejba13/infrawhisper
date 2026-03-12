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
