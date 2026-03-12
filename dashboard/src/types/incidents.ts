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
