"use client"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface Tab { id: string; label: string; content: React.ReactNode }

export function Tabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  return (
    <div>
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800/40">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={cn(
            "px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-150",
            active === t.id ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}>{t.label}</button>
        ))}
      </div>
      <div className="pt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  )
}
