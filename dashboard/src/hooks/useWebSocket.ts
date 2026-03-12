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
