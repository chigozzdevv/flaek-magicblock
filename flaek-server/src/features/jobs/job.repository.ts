import { JobModel } from '@/features/jobs/job.model'
import { broadcastJobUpdate } from '@/features/jobs/job.socket'

export const jobRepository = {
  async create(data: any) {
    const job = new JobModel(data)
    return job.save()
  },
  async get(tenantId: string, jobId: string) {
    return JobModel.findOne({ _id: jobId, tenantId }).exec()
  },
  async list(tenantId: string, limit: number = 20, cursor?: string, since?: Date) {
    const query: any = { tenantId }
    if (since) {
      query.createdAt = { $gte: since }
    }
    if (cursor) {
      query._id = { $lt: cursor }
    }
    const items = await JobModel.find(query).sort({ _id: -1 }).limit(limit).exec()
    const nextCursor = items.length === limit ? items[items.length - 1].id : null
    return { items, nextCursor } as const
  },
  async setStatus(jobId: string, status: string, patch: any = {}) {
    const job = await JobModel.findByIdAndUpdate(jobId, { status, ...patch }, { new: true }).exec()

    // Broadcast update via SSE
    if (job) {
      broadcastJobUpdate(job.tenantId, {
        type: 'job.update',
        job_id: job.id,
        status: job.status,
        updated_at: job.updatedAt,
        ...patch,
      })
    }

    return job
  },
  async setResult(jobId: string, result: any) {
    return JobModel.findByIdAndUpdate(jobId, { result }, { new: true }).exec()
  },
  async appendLogs(
    tenantId: string,
    jobId: string,
    logs: Array<{ ts?: Date; level?: string; message: string }>,
  ) {
    if (!logs.length) return null
    const normalized = logs.map((log) => ({
      ts: log.ts || new Date(),
      level: log.level,
      message: log.message,
    }))
    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, tenantId },
      { $push: { logs: { $each: normalized, $slice: -200 } } },
      { new: true },
    ).exec()
    if (job) {
      broadcastJobUpdate(job.tenantId, {
        type: 'job.log',
        job_id: job.id,
        logs: normalized,
        updated_at: job.updatedAt,
      })
    }
    return job
  },
}
