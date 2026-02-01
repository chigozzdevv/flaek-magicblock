import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiMe, apiGetTenant, apiUpdateTenantName, apiChangePassword } from '@/lib/api'

export default function SettingsPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [org, setOrg] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [pw, setPw] = useState({ old: '', n1: '', n2: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const [{ user }, t] = await Promise.all([apiMe(), apiGetTenant()])
      setUser({ name: user.name, email: user.email })
      setOrg(t.org_name)
    } catch {}
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault()
    setSavingOrg(true)
    try {
      const out = await apiUpdateTenantName(org.trim())
      setOrg(out.org_name)
    } finally {
      setSavingOrg(false)
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault()
    setPwLoading(true)
    setPwMsg('')
    try {
      await apiChangePassword({
        oldPassword: pw.old,
        newPassword: pw.n1,
        confirmNewPassword: pw.n2,
      })
      setPw({ old: '', n1: '', n2: '' })
      setPwMsg('Password updated')
    } catch (e: any) {
      setPwMsg(e.message || 'Failed')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">Name</label>
            <input
              value={user?.name || ''}
              readOnly
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
            />
            <label className="text-sm">Email</label>
            <input
              value={user?.email || ''}
              readOnly
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
            />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Organization</h2>
          <form onSubmit={saveOrg} className="mt-4 space-y-3">
            <label className="text-sm block">Name</label>
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
            />
            <Button loading={savingOrg}>Save</Button>
          </form>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Security</h2>
          <div className="mt-4 max-w-xl">
            <form onSubmit={changePw} className="grid gap-3">
              <label className="text-sm">Current password</label>
              <input
                type="password"
                value={pw.old}
                onChange={(e) => setPw((s) => ({ ...s, old: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                required
              />
              <label className="text-sm">New password</label>
              <input
                type="password"
                value={pw.n1}
                onChange={(e) => setPw((s) => ({ ...s, n1: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                required
              />
              <label className="text-sm">Confirm new password</label>
              <input
                type="password"
                value={pw.n2}
                onChange={(e) => setPw((s) => ({ ...s, n2: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                required
              />
              {pwMsg && (
                <div
                  className={`text-sm ${pwMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}
                >
                  {pwMsg}
                </div>
              )}
              <Button loading={pwLoading}>Update password</Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
