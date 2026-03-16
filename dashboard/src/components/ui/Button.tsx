import { cn } from "@/lib/utils"
import { forwardRef } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--text-inverse)',
  },
  secondary: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  danger: {
    background: 'rgba(248 113 113 / 0.1)',
    color: 'var(--status-critical)',
    border: '1px solid rgba(248 113 113 / 0.2)',
  },
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, style, ...props }, ref) => {
    const sizes = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-3 text-sm gap-2"
    }
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus-ring",
          sizes[size],
          className
        )}
        style={{
          borderRadius: 'var(--radius-md)',
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
