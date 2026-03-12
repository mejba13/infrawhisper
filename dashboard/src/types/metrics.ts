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
