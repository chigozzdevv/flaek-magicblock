import { useEffect, useState, useRef } from 'react'
import { Loader2, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  apiGetJobs,
  apiGetJob,
  apiCancelJob,
  apiSubmitJob,
  apiCompleteJob,
  apiAppendJobLogs,
  apiGetMagicblockConfig,
  apiGetMagicblockValidators,
} from '@/lib/api'
import {
  executePlanWithWallet,
  getBrowserWallet,
  getWalletPublicKey,
  type MagicblockConfig,
} from '@/lib/magicblock'
import { io, Socket } from 'socket.io-client'

type Job = {
  job_id: string
  operation_id: string
  status: 'planned' | 'submitted' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
  error?: string
}

const statusConfig = {
  planned: { icon: Clock, variant: 'info' as const, label: 'Planned' },
  submitted: { icon: RefreshCw, variant: 'warning' as const, label: 'Submitted' },
  completed: { icon: CheckCircle, variant: 'success' as const, label: 'Completed' },
  failed: { icon: XCircle, variant: 'danger' as const, label: 'Failed' },
  cancelled: { icon: AlertCircle, variant: 'default' as const, label: 'Cancelled' },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const [txInput, setTxInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [magicConfig, setMagicConfig] = useState<MagicblockConfig | null>(null)
  const [validators, setValidators] = useState<Array<{ name: string; pubkey: string }>>([])
  const [selectedValidator, setSelectedValidator] = useState('')
  const [executionMode, setExecutionMode] = useState<'per' | 'er'>('per')
  const [verifyTee, setVerifyTee] = useState(true)
  const [autoComplete, setAutoComplete] = useState(true)
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [execLogs, setExecLogs] = useState<string[]>([])
  const [serverLogs, setServerLogs] = useState<Array<{ ts?: string; level?: string; message: string }>>([])
  const [execError, setExecError] = useState('')

  useEffect(() => {
    loadJobs()
    setupSocket()
    loadMagicblockMeta()
    const params = new URLSearchParams(window.location.search)
    const jobId = params.get('job')
    if (jobId) {
      viewJob(jobId).catch(() => undefined)
      params.delete('job')
      const next = params.toString()
      const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}`
      window.history.replaceState({}, '', nextUrl)
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (selectedJob?.execution_mode) {
      setExecutionMode(selectedJob.execution_mode)
    }
  }, [selectedJob])

  function setupSocket() {
    const token = localStorage.getItem('flaek_jwt')
    if (!token) return

    const socket = io(import.meta.env.VITE_API_BASE || 'http://localhost:4000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => setSocketConnected(true))
    socket.on('job:update', (data: any) => {
      setJobs((prev) =>
        prev.map((job) => (job.job_id === data.job_id ? { ...job, ...data } : job))
      )
      setSelectedJob((prev: any) => {
        if (!prev || prev.job_id !== data.job_id) return prev
        if (data?.logs?.length) {
          setServerLogs((prevLogs) => [...prevLogs, ...data.logs])
        }
        return { ...prev, ...data }
      })
    })
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('connect_error', () => setSocketConnected(false))
    socketRef.current = socket
  }

  async function loadJobs() {
    try {
      const data = await apiGetJobs()
      setJobs(data.items)
    } finally {
      setLoading(false)
    }
  }

  async function loadMagicblockMeta() {
    try {
      const [config, validatorRes] = await Promise.all([
        apiGetMagicblockConfig(),
        apiGetMagicblockValidators(),
      ])
      setMagicConfig(config)
      setValidators(validatorRes.validators || [])
      if (!selectedValidator) {
        setSelectedValidator(config.default_validator || validatorRes.validators?.[0]?.pubkey || '')
      }
    } catch {
      setMagicConfig(null)
    }
  }

  async function viewJob(id: string) {
    const data = await apiGetJob(id)
    setSelectedJob(data)
    setTxInput('')
    setShowDetails(true)
    setExecLogs([])
    setServerLogs(data.logs || [])
    setExecError('')
    const wallet = getBrowserWallet()
    if (wallet?.publicKey) {
      try {
        setWalletPubkey(getWalletPublicKey(wallet).toBase58())
      } catch {
        setWalletPubkey(null)
      }
    }
  }

  async function submitJob() {
    if (!selectedJob) return
    const sigs = txInput.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!sigs.length) return
    setSubmitting(true)
    try {
      await apiSubmitJob(selectedJob.job_id, sigs)
      const refreshed = await apiGetJob(selectedJob.job_id)
      setSelectedJob(refreshed)
      await loadJobs()
    } finally {
      setSubmitting(false)
    }
  }

  async function markComplete() {
    if (!selectedJob) return
    setSubmitting(true)
    try {
      await apiCompleteJob(selectedJob.job_id)
      const refreshed = await apiGetJob(selectedJob.job_id)
      setSelectedJob(refreshed)
      await loadJobs()
    } finally {
      setSubmitting(false)
    }
  }

  async function connectWallet() {
    const wallet = getBrowserWallet()
    if (!wallet) {
      setExecError('Wallet not found. Install Phantom or another Solana wallet.')
      return
    }
    try {
      await wallet.connect?.()
      const pk = getWalletPublicKey(wallet)
      setWalletPubkey(pk.toBase58())
    } catch (err: any) {
      setExecError(err?.message || 'Wallet connection failed')
    }
  }

  async function executePlan() {
    if (!selectedJob?.plan?.steps?.length) {
      setExecError('No plan steps available for execution')
      return
    }
    if (!magicConfig) {
      setExecError('MagicBlock config not loaded')
      return
    }
    setExecuting(true)
    setExecError('')
    setExecLogs([])
    try {
      const wallet = getBrowserWallet()
      if (!wallet) {
        throw new Error('Wallet not found')
      }
      const result = await executePlanWithWallet(
        { steps: selectedJob.plan.steps },
        wallet,
        magicConfig,
        {
          mode: executionMode,
          validator: selectedValidator || magicConfig.default_validator,
          verifyTee,
          onLog: (msg) => {
            setExecLogs((prev) => [...prev, msg])
            apiAppendJobLogs(selectedJob.job_id, [{ message: msg }]).catch(() => {})
          },
        },
      )
      setTxInput(result.signatures.join('\\n'))
      await apiSubmitJob(selectedJob.job_id, result.signatures)
      if (autoComplete) {
        await apiCompleteJob(selectedJob.job_id)
      }
      const refreshed = await apiGetJob(selectedJob.job_id)
      setSelectedJob(refreshed)
      await loadJobs()
    } catch (err: any) {
      setExecError(err?.message || 'Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  async function cancelJob(id: string) {
    if (!confirm('Cancel this run?')) return
    await apiCancelJob(id)
    await loadJobs()
  }

  const filteredJobs = jobs.filter((job) =>
    job.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.operation_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold">Runs</h1>
        <p className="text-sm text-white/60 mt-1">MagicBlock execution plans and submissions</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
              placeholder="Search by job or operation id"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => loadJobs()}>
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Badge variant={socketConnected ? 'success' : 'default'}>
            {socketConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const config = statusConfig[job.status]
            const Icon = config?.icon || Clock
            return (
              <Card key={job.job_id} className="p-4 border border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">Run</div>
                  <Badge variant={config?.variant || 'default'}>{config?.label || job.status}</Badge>
                </div>
                <div className="mt-2 font-mono text-xs break-all text-white/80">{job.job_id}</div>
                <div className="mt-2 text-xs text-white/60">Operation: {job.operation_id}</div>
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={() => viewJob(job.job_id)} className="px-3 py-2 text-xs">
                    <Icon size={14} />
                    Details
                  </Button>
                  <Button variant="ghost" onClick={() => cancelJob(job.job_id)} className="px-3 py-2 text-xs">
                    Cancel
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {showDetails && selectedJob && (
        <Modal open={showDetails} onClose={() => setShowDetails(false)} title="Run Details">
          <div className="space-y-4">
            <div className="text-xs text-white/60">Status</div>
            <div className="text-sm font-semibold">{selectedJob.status}</div>
            <div className="text-xs text-white/60">Execution Mode</div>
            <div className="text-sm font-semibold">{selectedJob.execution_mode || 'per'}</div>

            <div className="pt-2 border-t border-white/10">
              <div className="text-xs text-white/60 mb-2">Wallet</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-mono text-white/70">
                  {walletPubkey ? `${walletPubkey.slice(0, 6)}...${walletPubkey.slice(-4)}` : 'Not connected'}
                </div>
                <Button variant="secondary" onClick={connectWallet} className="text-xs">
                  {walletPubkey ? 'Reconnect' : 'Connect Wallet'}
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">Execution Mode</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value as 'per' | 'er')}
                >
                  <option value="per">PER (TEE)</option>
                  <option value="er">ER (Devnet)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Validator</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  value={selectedValidator}
                  onChange={(e) => setSelectedValidator(e.target.value)}
                >
                  {validators.length === 0 && (
                    <option value="">No validators loaded</option>
                  )}
                  {validators.map((v) => (
                    <option key={v.pubkey} value={v.pubkey}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={verifyTee}
                  onChange={(e) => setVerifyTee(e.target.checked)}
                />
                Verify TEE integrity before PER auth
              </label>
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={autoComplete}
                  onChange={(e) => setAutoComplete(e.target.checked)}
                />
                Mark complete after submission
              </label>
              <Button onClick={executePlan} disabled={executing} className="w-full">
                {executing ? 'Executing...' : 'Execute Plan with Wallet'}
              </Button>
              {execError && <div className="text-xs text-red-400">{execError}</div>}
            {(serverLogs.length > 0 || execLogs.length > 0) && (
              <pre className="text-[11px] whitespace-pre-wrap text-white/70 bg-black/30 p-3 rounded-lg">
                  {[
                    ...serverLogs.map((log) => {
                      const ts = log.ts ? new Date(log.ts).toLocaleTimeString() : ''
                      const prefix = ts ? `[${ts}] ` : ''
                      return `${prefix}${log.message}`
                    }),
                    ...execLogs,
                  ].join('\n')}
              </pre>
            )}
            </div>

            <div className="text-xs text-white/60">Plan</div>
            <pre className="text-[11px] whitespace-pre-wrap text-white/80 bg-black/30 p-3 rounded-lg">
              {JSON.stringify(selectedJob.plan || {}, null, 2)}
            </pre>

            <div>
              <label className="text-xs text-white/60">TX Signatures (one per line)</label>
              <textarea
                className="w-full mt-2 h-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                value={txInput}
                onChange={(e) => setTxInput(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submitJob} disabled={submitting || !txInput.trim()}>
                {submitting ? 'Submitting...' : 'Mark Submitted'}
              </Button>
              <Button variant="secondary" onClick={markComplete} disabled={submitting}>
                Mark Complete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
