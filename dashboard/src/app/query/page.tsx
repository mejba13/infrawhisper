"use client"
import { useState, useRef, useEffect } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useClusters, useNLQuery } from "@/hooks/useQuery"
import { Send, Code2, Sparkles, ArrowRight } from "lucide-react"

interface Message { role: "user" | "assistant"; content: string; sql?: string; data_points?: number }

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

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }) }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !clusterId || isPending) return
    const msg = input.trim(); setInput("")
    setMessages(m => [...m, { role: "user", content: msg }])
    try {
      const r = await mutateAsync(msg)
      setMessages(m => [...m, { role: "assistant", content: r.answer, sql: r.sql_used, data_points: r.data_points }])
    } catch (e: unknown) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Query failed"}` }])
    }
  }

  return (
    <PageShell title="AI Query" subtitle="Ask anything about your infrastructure">
      <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Cluster selector */}
        <div className="flex items-center gap-3 mb-5 anim-fade-up">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Cluster</span>
          <select value={clusterId} onChange={e => setClusterId(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors">
            <option value="">Select a cluster...</option>
            {(clusters ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Chat */}
        <Card className="flex-1 min-h-0 p-0 overflow-hidden anim-fade-up delay-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-500/25">
                  <Sparkles size={24} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-100">Infrastructure Intelligence</p>
                  <p className="mt-2 text-sm text-zinc-400 max-w-md leading-relaxed">
                    Ask natural language questions about your Kubernetes clusters, metrics, logs, and costs.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 w-full max-w-lg">
                  {SUGGESTIONS.map(q => (
                    <button key={q} onClick={() => setInput(q)}
                      className="group flex items-center justify-between text-left text-[13px] font-medium px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-150">
                      <span>{q}</span>
                      <ArrowRight size={14} className="shrink-0 ml-2 text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-teal-400 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} anim-fade-up`}>
                <div className={`max-w-[80%] px-5 py-3.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-teal-500 text-zinc-950 font-medium"
                    : "rounded-2xl rounded-bl-sm bg-zinc-800/60 border border-zinc-800 text-zinc-200"
                }`}>
                  <p>{m.content}</p>
                  {m.sql && (
                    <details className={`mt-3 pt-2 border-t ${m.role === "user" ? "border-teal-600/30" : "border-zinc-700/50"}`}>
                      <summary className={`cursor-pointer text-xs flex items-center gap-1.5 font-medium ${m.role === "user" ? "text-teal-900/70" : "text-zinc-500"}`}>
                        <Code2 size={11} /> SQL &middot; {m.data_points} rows
                      </summary>
                      <pre className={`mt-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap p-3 rounded-lg ${
                        m.role === "user" ? "bg-teal-600/20 text-teal-900/80" : "bg-zinc-900 text-zinc-500"
                      }`}>{m.sql}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start anim-fade-up">
                <div className="px-5 py-4 rounded-2xl bg-zinc-800/60 border border-zinc-800">
                  <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Input */}
        <div className="flex gap-3 mt-5 anim-fade-up delay-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={clusterId ? "Ask about your infrastructure..." : "Select a cluster first"}
            disabled={!clusterId || isPending}
            className="flex-1 px-5 py-3 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-40 transition-colors" />
          <Button variant="primary" size="lg" onClick={handleSend} disabled={!input.trim() || !clusterId || isPending} className="rounded-xl px-5">
            <Send size={16} />
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
