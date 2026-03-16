"use client"
import { Bell, Search, Command } from "lucide-react"

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex h-16 items-center justify-between px-8 bg-surface-base border-b border-border-default">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium bg-surface-raised border border-border-default text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors focus-ring">
          <Search size={13} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-dim">
            <Command size={9} />K
          </kbd>
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-secondary transition-colors focus-ring" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-status-error ring-2 ring-surface-base" />
        </button>
        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold bg-accent-dim text-accent border border-accent-medium hover:bg-accent-medium transition-colors focus-ring">
          AC
        </button>
      </div>
    </header>
  )
}
