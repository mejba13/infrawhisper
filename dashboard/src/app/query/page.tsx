"use client"
import { useState, useRef, useEffect } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useClusters, useNLQuery } from "@/hooks/useQuery"
import { Send, Code2, Sparkles, ArrowRight } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  sql?: string
  data_points?: number
}

const SUGGESTIONS = [
  "What pods have restarted most in the last hour?",
  "Show me memory usage by namespace",
  "Which workloads are costing the most?",
  "Are there any error spikes in the last 30 minutes?",
]

export default function QueryPage() {
  const { data: clusters } = useClusters()
  const [clusterId, setClusterId] = useState("")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const { mutateAsync, isPending } = useNLQuery(clusterId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

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
    <PageShell title="AI Query" subtitle="Ask anything about your infrastructure">
      <div className="flex flex-col h-[calc(100vh-180px)] gap-5">
        {/* Cluster selector */}
        <div className="flex items-center gap-3 animate-fade-in">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Cluster
          </label>
          <select
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
            className="px-3 py-2 text-sm focus-ring"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <option value="">Select a cluster...</option>
            {(clusters ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Chat area */}
        <Card className="flex-1 overflow-hidden p-0 animate-fade-in stagger-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-strong)' }}>
                  <Sparkles size={28} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Infrastructure Intelligence
                  </p>
                  <p className="mt-1.5 text-sm max-w-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Ask natural language questions about your Kubernetes clusters, metrics, logs, and costs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-lg">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="group flex items-center gap-2 text-xs font-medium px-4 py-2.5 transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: 'var(--bg-hover)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      {q}
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div
                  className="max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed"
                  style={{
                    borderRadius: m.role === "user" ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: m.role === "user" ? 'var(--accent)' : 'var(--bg-overlay)',
                    color: m.role === "user" ? 'var(--text-inverse)' : 'var(--text-primary)',
                    border: m.role === "user" ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  <p>{m.content}</p>
                  {m.sql && (
                    <details className="mt-3" style={{ borderTop: `1px solid ${m.role === "user" ? 'rgba(0 0 0 / 0.15)' : 'var(--border-subtle)'}` }}>
                      <summary className="cursor-pointer pt-2 text-xs flex items-center gap-1.5 font-medium"
                        style={{ color: m.role === "user" ? 'rgba(0 0 0 / 0.6)' : 'var(--text-tertiary)' }}>
                        <Code2 size={11} /> SQL query &middot; {m.data_points} rows
                      </summary>
                      <pre className="mt-2 text-[11px] overflow-x-auto whitespace-pre-wrap p-3 rounded-lg"
                        style={{
                          background: m.role === "user" ? 'rgba(0 0 0 / 0.1)' : 'var(--bg-surface)',
                          color: m.role === "user" ? 'rgba(0 0 0 / 0.7)' : 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                        {m.sql}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start animate-fade-in">
                <div className="px-5 py-4 rounded-2xl"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Input */}
        <div className="flex gap-3 animate-fade-in stagger-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={clusterId ? "Ask about your infrastructure..." : "Select a cluster first"}
            disabled={!clusterId || isPending}
            className="flex-1 px-5 py-3.5 text-sm focus-ring disabled:opacity-40"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleSend}
            disabled={!input.trim() || !clusterId || isPending}
            style={{ borderRadius: 'var(--radius-xl)', width: '52px' }}
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
