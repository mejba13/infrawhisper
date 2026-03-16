import { cn } from "@/lib/utils"

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className="w-full overflow-x-auto"><table className={cn("w-full text-[13px]", className)}>{children}</table></div>
}
export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-500 bg-zinc-950/50 border-b border-zinc-800/60", className)}>{children}</th>
}
export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3.5 text-zinc-300 border-b border-zinc-800/30", className)}>{children}</td>
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors duration-100 hover:bg-zinc-800/30", className)}>{children}</tr>
}
