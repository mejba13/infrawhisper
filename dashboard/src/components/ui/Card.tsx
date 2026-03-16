import { cn } from "@/lib/utils"

export function Card({
  className,
  children,
  hover = false,
  glow = false,
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
        "rounded-[var(--radius-lg)] p-5 transition-all duration-300",
        hover && "hover:translate-y-[-2px] hover:shadow-lg cursor-pointer",
        glow && "animate-pulse-glow",
        className
      )}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        ...extraStyle,
      }}
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
        <h3 className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
        )}
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
        <span className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: accent ? 'var(--accent-muted)' : 'var(--bg-hover)', color: accent ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight"
        style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
      {trend && (
        <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{trend}</p>
      )}
    </Card>
  )
}
