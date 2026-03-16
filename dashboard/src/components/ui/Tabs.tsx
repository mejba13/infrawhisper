"use client"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Tab { id: string; label: string; content: React.ReactNode }

export function Tabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  return (
    <div>
      <div className="flex gap-1 p-1 rounded-xl bg-surface-base border border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-150",
              active === t.id
                ? "bg-surface-raised text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  )
}
