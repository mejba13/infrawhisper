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
    <div className="flex h-screen bg-surface-root">
      <Sidebar clusterId={clusterId} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-8 py-7 space-y-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
