import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted"

const variantClasses: Record<Variant, string> = {
  default: "bg-surface-overlay text-text-secondary border-border-default",
  success: "bg-status-ok/10 text-status-ok border-status-ok/20",
  warning: "bg-status-warn/10 text-status-warn border-status-warn/20",
  danger: "bg-status-error/10 text-status-error border-status-error/20",
  info: "bg-status-info/10 text-status-info border-status-info/20",
  muted: "bg-surface-raised text-text-dim border-border-subtle",
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
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap",
      variantClasses[variant],
      className
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
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
