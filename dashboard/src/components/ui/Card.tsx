import { cn } from "@/lib/utils"

export function Card({
  className,
  children,
  hover = false,
  style: extraStyle,
}: {
  className?: string
  children: React.ReactNode
  hover?: boolean
  glow?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-raised border border-border-default p-5",
        hover && "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg cursor-pointer transition-all duration-200",
        className
      )}
      style={extraStyle}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-text-primary">{title}</h3>
        {subtitle && <p className="mt-1 text-[12px] text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = false,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  accent?: boolean
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{label}</span>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          accent ? "bg-accent-dim text-accent" : "bg-surface-overlay text-text-muted"
        )}>
          {icon}
        </div>
      </div>
      <div className={cn(
        "text-[28px] font-bold tracking-tight leading-none",
        accent ? "text-accent" : "text-text-primary"
      )}>
        {value}
      </div>
      {trend && <p className="mt-2 text-[12px] font-medium text-text-muted">{trend}</p>}
    </Card>
  )
}
