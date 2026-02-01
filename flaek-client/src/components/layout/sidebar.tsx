import {
  LayoutDashboard,
  Workflow,
  Package,
  Briefcase,
  Blocks,
  Key,
  CreditCard,
  LogOut,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import BrandLogo from '@/components/brand-logo'
import { navigate } from '@/lib/router'
import { clearToken } from '@/lib/auth'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: Workflow, label: 'Flow Builder', path: '/dashboard/pipelines' },
  { icon: Package, label: 'Flows', path: '/dashboard/operations' },
  { icon: Briefcase, label: 'Jobs', path: '/dashboard/jobs' },
  { icon: Blocks, label: 'Blocks Library', path: '/dashboard/blocks' },
  { icon: Key, label: 'API Keys', path: '/dashboard/keys' },
  { icon: CreditCard, label: 'Credits', path: '/dashboard/credits' },
  { icon: SettingsIcon, label: 'Settings', path: '/dashboard/settings' },
]

type SidebarProps = {
  currentPath: string
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ currentPath, collapsed = false, onToggle }: SidebarProps) {
  const handleLogout = () => {
    clearToken()
    navigate('/')
  }

  return (
    <div
      className={`fixed top-0 left-0 h-screen border-r border-white/10 bg-bg-elev flex flex-col z-40 transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        <div
          className={`transition-opacity ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <BrandLogo className="h-7" />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={`flex-1 ${collapsed ? 'p-3' : 'p-4'} space-y-1 overflow-y-auto`}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-500/10 text-brand-500'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              <Icon size={18} />
              <span className={collapsed ? 'hidden' : ''}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className={`border-t border-white/10 ${collapsed ? 'p-3' : 'p-4'}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition`}
        >
          <LogOut size={18} />
          <span className={collapsed ? 'hidden' : ''}>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
