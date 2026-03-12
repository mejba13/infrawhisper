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
