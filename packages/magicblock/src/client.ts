import type { ExecutePlanResult, MagicblockConfig, WalletProvider } from './magicblock'
import { executePlanWithWallet } from './magicblock'

type RunFlaekJobOptions = {
  operationId: string
  wallet: WalletProvider
  executionMode?: 'per' | 'er'
  validator?: string
  verifyTee?: boolean
  autoComplete?: boolean
  context?: Record<string, any>
  callbackUrl?: string
  onLog?: (message: string) => void
}

type FlaekClientOptions = {
  baseUrl?: string
  authToken?: string
  fetch?: typeof fetch
  headers?: Record<string, string>
}

type JobLog = { message: string; level?: 'info' | 'warn' | 'error'; ts?: string }

type JobPlan = {
  steps: Array<{ nodeId: string; blockId: string; inputs: Record<string, any>; dependsOn?: string[] }>
}

function getDefaultBaseUrl() {
  try {
    return (import.meta as any)?.env?.VITE_API_BASE || ''
  } catch {
    return ''
  }
}

function getStoredToken() {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage.getItem('flaek_jwt') || undefined
  } catch {
    return undefined
  }
}

export function createFlaekClient(options: FlaekClientOptions = {}) {
  const baseUrl = options.baseUrl ?? getDefaultBaseUrl()
  const fetcher = options.fetch ?? fetch

  function getAuthHeader() {
    const token = options.authToken ?? getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function request(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const authHeader = getAuthHeader()
    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization
    }
    Object.assign(headers, options.headers || {})
    Object.assign(headers, (opts.headers as Record<string, string>) || {})

    const res = await fetcher(`${baseUrl}${path}`, {
      ...opts,
      method: opts.method || 'GET',
      headers,
      credentials: 'include',
    })
    const ct = res.headers.get('content-type') || ''
    const body = ct.includes('application/json') ? await res.json() : await res.text()
    if (!res.ok) {
      const message = (body && (body.message || body.error || body.code)) || res.statusText
      throw new Error(typeof message === 'string' ? message : 'Request failed')
    }
    return body
  }

  async function getMagicblockConfig() {
    return request('/v1/public/magicblock/config') as Promise<MagicblockConfig>
  }

  async function createJob(input: {
    operation: string
    execution_mode?: 'er' | 'per'
    context?: Record<string, any>
    callback_url?: string
  }) {
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return request('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Idempotency-Key': idempotencyKey },
    }) as Promise<{ job_id: string; status: string; plan?: JobPlan }>
  }

  async function getJob(id: string) {
    return request(`/v1/jobs/${id}`) as Promise<{
      job_id: string
      status: string
      created_at: string
      updated_at: string
      plan?: JobPlan
      execution_mode?: 'er' | 'per'
      tx_signatures?: string[]
      result?: any
      logs?: JobLog[]
    }>
  }

  async function submitJob(id: string, txSignatures: string[], result?: any) {
    return request(`/v1/jobs/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ tx_signatures: txSignatures, result }),
    }) as Promise<{ job_id: string; status: string }>
  }

  async function completeJob(id: string, result?: any) {
    return request(`/v1/jobs/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ result }),
    }) as Promise<{ job_id: string; status: string }>
  }

  async function appendJobLogs(id: string, logs: JobLog[]) {
    if (!logs.length) return
    return request(`/v1/jobs/${id}/logs`, {
      method: 'POST',
      body: JSON.stringify({ logs }),
    }) as Promise<{ job_id: string; status: string }>
  }

  function createLogReporter(jobId: string, onLog?: (message: string) => void) {
    const pending: JobLog[] = []
    let flushing = false
    let scheduled = false

    const flush = async () => {
      scheduled = false
      if (flushing || pending.length === 0) return
      flushing = true
      const batch = pending.splice(0, pending.length)
      try {
        await appendJobLogs(jobId, batch)
      } catch {
        // ignore
      } finally {
        flushing = false
        if (pending.length > 0 && !scheduled) {
          scheduled = true
          Promise.resolve().then(flush)
        }
      }
    }

    const log = (message: string, level: JobLog['level'] = 'info') => {
      const entry: JobLog = { message, level, ts: new Date().toISOString() }
      pending.push(entry)
      onLog?.(message)
      if (!scheduled) {
        scheduled = true
        Promise.resolve().then(flush)
      }
    }

    return { log, flush }
  }

  async function runJob(options: RunFlaekJobOptions) {
    const {
      operationId,
      wallet,
      executionMode = 'per',
      validator,
      verifyTee = true,
      autoComplete = true,
      context,
      callbackUrl,
      onLog,
    } = options

    const config = await getMagicblockConfig()
    const job = await createJob({
      operation: operationId,
      execution_mode: executionMode,
      context,
      callback_url: callbackUrl,
    })

    let plan = job.plan
    if (!plan) {
      const refreshed = await getJob(job.job_id)
      plan = refreshed.plan
    }
    if (!plan?.steps?.length) {
      throw new Error('No plan steps available')
    }

    const reporter = createLogReporter(job.job_id, onLog)
    try {
      const result: ExecutePlanResult = await executePlanWithWallet(
        { steps: plan.steps },
        wallet,
        config,
        {
          mode: executionMode,
          validator: validator || config.default_validator,
          verifyTee,
          onLog: (message) => reporter.log(message),
        },
      )

      await submitJob(job.job_id, result.signatures)
      if (autoComplete) {
        await completeJob(job.job_id)
      }

      await reporter.flush()

      return {
        jobId: job.job_id,
        signatures: result.signatures,
        authToken: result.authToken,
        plan,
      }
    } catch (error: any) {
      reporter.log(error?.message || 'Execution failed', 'error')
      await reporter.flush()
      throw error
    }
  }

  return {
    runJob,
    createJob,
    getJob,
    submitJob,
    completeJob,
    appendJobLogs,
    getMagicblockConfig,
  }
}

export async function runFlaekJob(options: RunFlaekJobOptions) {
  const client = createFlaekClient()
  return client.runJob(options)
}

export type { RunFlaekJobOptions, FlaekClientOptions, JobLog }
