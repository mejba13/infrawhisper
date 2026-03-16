import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted"

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: {
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
  },
  success: {
    background: 'rgba(52 211 153 / 0.1)',
    color: 'var(--status-healthy)',
    border: '1px solid rgba(52 211 153 / 0.2)',
  },
  warning: {
    background: 'rgba(251 191 36 / 0.1)',
    color: 'var(--status-warning)',
    border: '1px solid rgba(251 191 36 / 0.2)',
  },
  danger: {
    background: 'rgba(248 113 113 / 0.1)',
    color: 'var(--status-critical)',
    border: '1px solid rgba(248 113 113 / 0.2)',
  },
  info: {
    background: 'rgba(96 165 250 / 0.1)',
    color: 'var(--status-info)',
    border: '1px solid rgba(96 165 250 / 0.2)',
  },
  muted: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border-subtle)',
  },
}

export function Badge({
  variant = "default",
  children,
  className,
  dot = false,
}: {
  variant?: Variant
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider leading-none",
        className
      )}
      style={variantStyles[variant]}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      )}
      {children}
    </span>
  )
}

export function statusVariant(status: string): Variant {
  switch (status.toLowerCase()) {
    case "running": case "healthy": case "connected": case "ready": case "resolved": return "success"
    case "pending": case "warning": case "investigating": return "warning"
    case "failed": case "critical": case "crashloopbackoff": case "notready": case "open": case "firing": return "danger"
    case "disconnected": case "unknown": return "muted"
    default: return "default"
  }
}
