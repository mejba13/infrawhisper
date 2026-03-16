import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted"

const v: Record<Variant, string> = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  muted: "bg-zinc-800/50 text-zinc-500 border-zinc-700/50",
}

export function Badge({ variant = "default", children, className, dot = false }: {
  variant?: Variant; children: React.ReactNode; className?: string; dot?: boolean
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider leading-none whitespace-nowrap",
      v[variant], className
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
