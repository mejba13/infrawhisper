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
