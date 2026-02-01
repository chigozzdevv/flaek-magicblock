import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/app'
import GetStartedPage from '@/pages/get-started'
import SigninPage from '@/pages/signin'
import ForgotPasswordPage from '@/pages/forgot-password'
import ResetPasswordPage from '@/pages/reset-password'
import DocsPage from '@/pages/docs'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import OverviewPage from '@/pages/dashboard/overview'
import PipelineBuilderPage from '@/pages/dashboard/pipeline-builder'
import OperationsPage from '@/pages/dashboard/operations'
import JobsPage from '@/pages/dashboard/jobs'
import BlocksPage from '@/pages/dashboard/blocks'
import ApiKeysPage from '@/pages/dashboard/api-keys'
import CreditsPage from '@/pages/dashboard/credits'
import SettingsPage from '@/pages/dashboard/settings'

function usePathname() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path
}

function Router() {
  const path = usePathname()

  if (path === '/get-started') return <GetStartedPage />
  if (path === '/signin') return <SigninPage />
  if (path === '/forgot-password') return <ForgotPasswordPage />
  if (path === '/reset-password') return <ResetPasswordPage />
  if (path === '/docs') return <DocsPage />

  if (path.startsWith('/dashboard')) {
    return (
      <DashboardLayout currentPath={path}>
        {path === '/dashboard' && <OverviewPage />}
        {path === '/dashboard/pipelines' && <PipelineBuilderPage />}
        {path === '/dashboard/operations' && <OperationsPage />}
        {path === '/dashboard/jobs' && <JobsPage />}
        {path === '/dashboard/blocks' && <BlocksPage />}
        {path === '/dashboard/keys' && <ApiKeysPage />}
        {path === '/dashboard/credits' && <CreditsPage />}
        {path === '/dashboard/settings' && <SettingsPage />}
      </DashboardLayout>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
