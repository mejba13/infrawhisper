"use client"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function PageShell({
  title,
  subtitle,
  clusterId,
  children,
}: {
  title: string
  subtitle?: string
  clusterId?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-root)' }}>
      <Sidebar clusterId={clusterId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
