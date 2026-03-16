import { cn } from "@/lib/utils"

export function Card({ className, children, hover = false, style: extraStyle }: {
  className?: string; children: React.ReactNode; hover?: boolean; glow?: boolean; style?: React.CSSProperties
}) {
  return (
    <div className={cn(
      "rounded-xl bg-zinc-900/80 border border-zinc-800/60 p-5",
      hover && "hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg cursor-pointer transition-all duration-200",
      className
    )} style={extraStyle}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, icon, trend, accent = false }: {
  label: string; value: string | number; icon: React.ReactNode; trend?: string; accent?: boolean
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent ? "bg-teal-500/15 text-teal-400" : "bg-zinc-800 text-zinc-400")}>
          {icon}
        </div>
      </div>
      <div className={cn("text-[28px] font-bold tracking-tight leading-none", accent ? "text-teal-400" : "text-zinc-100")}>{value}</div>
      {trend && <p className="mt-2 text-xs font-medium text-zinc-500">{trend}</p>}
    </Card>
  )
}
