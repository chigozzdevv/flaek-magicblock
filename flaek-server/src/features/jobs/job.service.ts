import { jobRepository } from '@/features/jobs/job.repository';
import { httpError } from '@/shared/errors';
import { creditService } from '@/features/credits/credit.service';
import { pipelineService } from '@/features/pipelines/pipeline.service';
import { operationRepository } from '@/features/operations/operation.repository';

async function createPlan(input: {
  tenantId: string;
  operationId: string;
  executionMode: 'er' | 'per';
  context?: Record<string, any>;
  callbackUrl?: string;
}) {
  await creditService.deduct(input.tenantId, 100, 'flow_plan');
  const op = await operationRepository.get(input.tenantId, input.operationId);
  if (!op) throw httpError(404, 'not_found', 'operation_not_found');
  if (op.pipelineSpec?.type !== 'magicblock_graph') {
    throw httpError(400, 'invalid_state', 'operation_is_not_magicblock_graph');
  }
  const pipeline = op.pipelineSpec.pipeline;
  const planResult = await pipelineService.executePipeline(input.tenantId, pipeline as any);
  if (planResult.status !== 'planned') {
    throw httpError(400, 'invalid_state', planResult.error || 'plan_failed');
  }
  const job = await jobRepository.create({
    tenantId: input.tenantId,
    operationId: input.operationId,
    status: 'planned',
    plan: planResult.plan,
    executionMode: input.executionMode,
    callbackUrl: input.callbackUrl,
    result: input.context ? { context: input.context } : undefined,
  });
  return { job_id: job.id, status: job.status, plan: job.plan };
}

async function get(tenantId: string, jobId: string) {
  const job = await jobRepository.get(tenantId, jobId);
  if (!job) throw httpError(404, 'not_found', 'job_not_found');
  return {
    job_id: job.id,
    operation_id: job.operationId,
    status: job.status,
    result: job.result,
    plan: job.plan,
    execution_mode: job.executionMode,
    tx_signatures: job.txSignatures,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

async function list(tenantId: string, opts?: { limit?: number; cursor?: string; since?: Date }) {
  const { items, nextCursor } = await jobRepository.list(tenantId, opts?.limit, opts?.cursor, opts?.since);
  return {
    items: items.map(j => ({
      job_id: j.id,
      operation_id: j.operationId,
      status: j.status,
      created_at: j.createdAt,
      updated_at: j.updatedAt,
      error: j.error,
    })),
    next_cursor: nextCursor || undefined,
  };
}

async function submit(tenantId: string, jobId: string, txSignatures: string[], result?: any) {
  const job = await jobRepository.get(tenantId, jobId);
  if (!job) throw httpError(404, 'not_found', 'job_not_found');
  if (job.status === 'cancelled') throw httpError(400, 'invalid_state', 'job_cancelled');
  await jobRepository.setStatus(jobId, 'submitted', { txSignatures, result });
  return { job_id: jobId, status: 'submitted' };
}

async function complete(tenantId: string, jobId: string, result?: any) {
  const job = await jobRepository.get(tenantId, jobId);
  if (!job) throw httpError(404, 'not_found', 'job_not_found');
  await jobRepository.setStatus(jobId, 'completed', { result });
  return { job_id: jobId, status: 'completed' };
}

async function cancel(tenantId: string, jobId: string) {
  const job = await jobRepository.get(tenantId, jobId);
  if (!job) throw httpError(404, 'not_found', 'job_not_found');
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    throw httpError(400, 'invalid_state', 'job_already_finished');
  }
  await jobRepository.setStatus(jobId, 'cancelled', { error: 'Job cancelled by user' });
  return { job_id: jobId, status: 'cancelled' };
}

export const jobService = { createPlan, get, list, submit, complete, cancel };
