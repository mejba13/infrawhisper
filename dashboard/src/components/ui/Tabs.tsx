"use client"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

export function Tabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  return (
    <div>
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200",
            )}
            style={{
              background: active === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: active === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: active === t.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  )
}
