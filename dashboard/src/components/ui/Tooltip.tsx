"use client"
import { useState } from "react"

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap z-50 anim-fade-up px-3 py-1.5 text-[12px] font-medium rounded-lg bg-surface-overlay text-text-primary border border-border-default shadow-lg">
          {content}
        </div>
      )}
    </div>
  )
}
