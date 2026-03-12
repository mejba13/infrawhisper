"use client"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Search">
          <Search size={15} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Notifications">
          <Bell size={15} />
        </Button>
      </div>
    </header>
  )
}
