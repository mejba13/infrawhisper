import { cn } from "@/lib/utils"

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted"

const variants: Record<Variant, string> = {
  default: "bg-zinc-800 text-zinc-200",
  success: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  warning: "bg-amber-900/50 text-amber-400 border border-amber-800",
  danger: "bg-red-900/50 text-red-400 border border-red-800",
  info: "bg-blue-900/50 text-blue-400 border border-blue-800",
  muted: "bg-zinc-900 text-zinc-500",
}

export function Badge({
  variant = "default",
  children,
  className,
}: {
  variant?: Variant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusVariant(status: string): Variant {
  switch (status.toLowerCase()) {
    case "running": case "healthy": case "ready": case "resolved": return "success"
    case "pending": case "warning": case "investigating": return "warning"
    case "failed": case "critical": case "crashloopbackoff": case "notready": return "danger"
    default: return "muted"
  }
}
