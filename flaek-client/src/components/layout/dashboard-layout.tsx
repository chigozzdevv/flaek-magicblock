import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { isAuthenticated } from '@/lib/auth'
import { navigate } from '@/lib/router'

type DashboardLayoutProps = PropsWithChildren<{
  currentPath: string
}>

export function DashboardLayout({ children, currentPath }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/signin')
    }
  }, [])

  if (!isAuthenticated()) {
    return null
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <Sidebar
        currentPath={currentPath}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div
        className={`flex flex-col min-h-screen pt-16 transition-[margin] duration-200 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
