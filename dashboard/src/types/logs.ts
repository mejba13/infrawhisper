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
