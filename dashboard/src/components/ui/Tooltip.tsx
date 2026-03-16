"use client"
import { useState } from "react"

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap z-50 animate-fade-in px-3 py-1.5 text-xs font-medium"
          style={{
            background: 'var(--bg-overlay)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
