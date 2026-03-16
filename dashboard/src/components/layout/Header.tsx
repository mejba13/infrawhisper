"use client"
import { Bell, Search, Command } from "lucide-react"

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex h-16 items-center justify-between px-8 bg-zinc-950 border-b border-zinc-800/60">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 transition-colors">
          <Search size={13} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 font-mono">
            <Command size={9} />K
          </kbd>
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950" />
        </button>
        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/25 hover:bg-teal-500/25 transition-colors">
          AC
        </button>
      </div>
    </header>
  )
}
