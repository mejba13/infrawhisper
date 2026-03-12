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
