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
      <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Cluster selector */}
        <div className="flex items-center gap-3 mb-5 anim-fade-up">
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Cluster</span>
          <select
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg bg-surface-raised border border-border-default text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
          >
            <option value="">Select a cluster...</option>
            {(clusters ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Chat area */}
        <Card className="flex-1 min-h-0 p-0 overflow-hidden anim-fade-up delay-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim border border-accent-medium">
                  <Sparkles size={24} className="text-accent" />
                </div>
                <div>
                  <p className="text-[18px] font-semibold tracking-tight text-text-primary">Infrastructure Intelligence</p>
                  <p className="mt-2 text-[14px] text-text-secondary max-w-md leading-relaxed">
                    Ask natural language questions about your Kubernetes clusters, metrics, logs, and costs.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 w-full max-w-lg">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="group flex items-center justify-between text-left text-[13px] font-medium px-4 py-3 rounded-xl bg-surface-overlay border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong hover:bg-surface-hover transition-all duration-150"
                    >
                      <span>{q}</span>
                      <ArrowRight size={14} className="shrink-0 ml-2 text-text-dim opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} anim-fade-up`}>
                <div
                  className={`max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-accent text-surface-root"
                      : "rounded-2xl rounded-bl-sm bg-surface-overlay border border-border-default text-text-primary"
                  }`}
                >
                  <p>{m.content}</p>
                  {m.sql && (
                    <details className={`mt-3 pt-2 border-t ${m.role === "user" ? "border-black/15" : "border-border-subtle"}`}>
                      <summary className={`cursor-pointer text-[12px] flex items-center gap-1.5 font-medium ${
                        m.role === "user" ? "text-surface-root/60" : "text-text-muted"
                      }`}>
                        <Code2 size={11} /> SQL query &middot; {m.data_points} rows
                      </summary>
                      <pre className={`mt-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap p-3 rounded-lg ${
                        m.role === "user" ? "bg-black/10 text-surface-root/70" : "bg-surface-base text-text-muted"
                      }`}>
                        {m.sql}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start anim-fade-up">
                <div className="px-5 py-4 rounded-2xl bg-surface-overlay border border-border-default">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Input */}
        <div className="flex gap-3 mt-5 anim-fade-up delay-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={clusterId ? "Ask about your infrastructure..." : "Select a cluster first"}
            disabled={!clusterId || isPending}
            className="flex-1 px-5 py-3 text-[14px] rounded-xl bg-surface-raised border border-border-default text-text-primary placeholder:text-text-dim focus:border-border-strong focus:outline-none disabled:opacity-40 transition-colors"
          />
          <Button
            variant="primary"
            size="lg"
            onClick={handleSend}
            disabled={!input.trim() || !clusterId || isPending}
            className="rounded-xl px-5"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
