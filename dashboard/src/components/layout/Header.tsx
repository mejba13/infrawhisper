"use client"
import { Bell, Search, Command } from "lucide-react"

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex h-16 items-center justify-between px-8 border-b"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <div className="animate-fade-in">
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Search trigger */}
        <button
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 hover:scale-[1.02] focus-ring"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
            <Command size={9} />K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 focus-ring"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
            style={{ background: 'var(--status-critical)' }} />
        </button>

        {/* Avatar */}
        <button
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 focus-ring"
          style={{
            background: 'var(--accent-muted)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-strong)',
          }}
        >
          AC
        </button>
      </div>
    </header>
  )
}
