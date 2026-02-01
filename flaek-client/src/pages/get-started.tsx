import { useState, useEffect } from 'react'
import { apiSignup, apiLogin } from '@/lib/api'
import BrandLogo from '@/components/brand-logo'
import { ArrowLeft } from 'lucide-react'
import { navigate } from '@/lib/router'
import { isAuthenticated } from '@/lib/auth'

type Mode = 'signup' | 'signin'

export default function GetStartedPage({ mode: initialMode = 'signup' as Mode }) {
  const mode: Mode = initialMode

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard')
    }
  }, [])

  if (isAuthenticated()) {
    return null
  }

  return (
    <div className="min-h-dvh text-text-primary bg-bg-base overflow-x-hidden flex items-center justify-center py-12">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="mb-10 flex items-center">
          <button
            onClick={() => navigate('/')}
            className="text-white/80 hover:text-white transition-colors -mr-1"
            aria-label="Back to home"
          >
            <ArrowLeft size={24} />
          </button>
          <BrandLogo className="h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-4 text-base text-white/70 leading-relaxed">
          Private compute with public proof.{' '}
          {mode === 'signup' ? 'Start for free.' : 'Sign in to continue.'}
        </p>

        <div className="mt-8">{mode === 'signup' ? <SignupForm /> : <SigninForm />}</div>
      </div>
    </div>
  )
}

function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiSignup({ name, email, password, confirmPassword: confirm, orgName: org })
      const out = await apiLogin({ email, password })
      localStorage.setItem('flaek_jwt', out.jwt)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium mb-2">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
            placeholder="Ada Lovelace"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Organization</label>
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
            placeholder="My company"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
          placeholder="you@company.com"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
            placeholder="Repeat password"
          />
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="pt-2">
        <button
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-brand-600 hover:to-brand-700 transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </div>
      <div className="text-center text-sm text-white/70">
        Already have an account?{' '}
        <a
          href="/signin"
          onClick={(e) => {
            e.preventDefault()
            navigate('/signin')
          }}
          className="text-brand-500 hover:text-brand-400 font-medium transition-colors"
        >
          Sign in
        </a>
      </div>
    </form>
  )
}

function SigninForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const out = await apiLogin({ email, password })
      localStorage.setItem('flaek_jwt', out.jwt)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-base outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-200"
          placeholder="Your password"
        />
        <div className="mt-2 text-sm">
          <a
            href="/forgot-password"
            onClick={(e) => {
              e.preventDefault()
              navigate('/forgot-password')
            }}
            className="text-white/70 hover:text-white transition-colors"
          >
            Forgot password?
          </a>
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="pt-2">
        <button
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-brand-600 hover:to-brand-700 transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
      <div className="text-center text-sm text-white/70">
        New to Flaek?{' '}
        <a
          href="/get-started"
          onClick={(e) => {
            e.preventDefault()
            navigate('/get-started')
          }}
          className="text-brand-500 hover:text-brand-400 font-medium transition-colors"
        >
          Create an account
        </a>
      </div>
    </form>
  )
}
