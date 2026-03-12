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
