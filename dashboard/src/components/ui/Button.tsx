import { cn } from "@/lib/utils"
import { forwardRef } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-surface-root hover:bg-accent-light",
  secondary: "bg-surface-raised text-text-secondary border border-border-default hover:bg-surface-overlay hover:text-text-primary hover:border-border-strong",
  ghost: "text-text-muted hover:bg-surface-hover hover:text-text-secondary",
  danger: "bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) => {
    const sizes = {
      sm: "px-3 py-1.5 text-[12px] gap-1.5",
      md: "px-4 py-2 text-[13px] gap-2",
      lg: "px-5 py-2.5 text-[13px] gap-2"
    }
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus-ring",
          variantClasses[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
