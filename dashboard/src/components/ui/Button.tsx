import { cn } from "@/lib/utils"
import { forwardRef } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
const v: Record<Variant, string> = {
  primary: "bg-teal-500 text-zinc-950 hover:bg-teal-400 font-semibold",
  secondary: "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700",
  ghost: "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className, children, ...props }, ref) => {
    const s = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-[13px] gap-2", lg: "px-5 py-2.5 text-[13px] gap-2" }
    return (
      <button ref={ref} className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none focus-ring",
        v[variant], s[size], className
      )} {...props}>{children}</button>
    )
  }
)
Button.displayName = "Button"
