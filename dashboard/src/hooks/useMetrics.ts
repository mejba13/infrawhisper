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
