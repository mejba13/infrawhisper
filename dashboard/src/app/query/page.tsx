"use client"
import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useClusters, useNLQuery } from "@/hooks/useQuery"
import { MessageSquare, Send, Code2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  sql?: string
  data_points?: number
}

export default function QueryPage() {
  const { data: clusters } = useClusters()
  const [clusterId, setClusterId] = useState("")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const { mutateAsync, isPending } = useNLQuery(clusterId)

  const handleSend = async () => {
    if (!input.trim() || !clusterId || isPending) return
    const userMsg = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", content: userMsg }])
    try {
      const result = await mutateAsync(userMsg)
      setMessages((m) => [...m, {
        role: "assistant",
        content: result.answer,
        sql: result.sql_used,
        data_points: result.data_points,
      }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Query failed"
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }])
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="AI Query" />
        <main className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
          {/* Cluster selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500">Cluster:</label>
            <select
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 focus:outline-none"
            >
              <option value="">Select a cluster...</option>
              {(clusters ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Chat messages */}
          <Card className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MessageSquare size={36} className="text-zinc-700" />
                <p className="text-zinc-500 text-sm">Ask anything about your infrastructure</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "What pods have restarted most in the last hour?",
                    "Show me memory usage by namespace",
                    "Which workloads are costing the most?",
                  ].map((q) => (
                    <button key={q} onClick={() => setInput(q)}
                      className="text-xs rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"
                }`}>
                  <p>{m.content}</p>
                  {m.sql && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-zinc-400 flex items-center gap-1">
                        <Code2 size={10} /> SQL used · {m.data_points} rows
                      </summary>
                      <pre className="mt-2 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">{m.sql}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-xl px-4 py-2.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={clusterId ? "Ask about your infrastructure..." : "Select a cluster first"}
              disabled={!clusterId || isPending}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <Button variant="primary" onClick={handleSend} disabled={!input.trim() || !clusterId || isPending}>
              <Send size={14} />
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
