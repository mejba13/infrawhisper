"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 whitespace-nowrap shadow-lg border border-zinc-700 z-50">
          {content}
        </div>
      )}
    </div>
  )
}
