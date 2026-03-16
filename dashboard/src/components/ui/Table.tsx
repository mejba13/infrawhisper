import { cn } from "@/lib/utils"

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn("px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider", className)}
      style={{
        color: 'var(--text-tertiary)',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
      }}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={cn("px-4 py-3.5 text-[13px]", className)}
      style={{
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr
      className={cn("transition-colors duration-150", className)}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </tr>
  )
}
