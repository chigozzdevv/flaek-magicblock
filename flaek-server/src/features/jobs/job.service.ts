import { jobRepository } from '@/features/jobs/job.repository';
import { httpError } from '@/shared/errors';
import { creditService } from '@/features/credits/credit.service';
import { pipelineService } from '@/features/pipelines/pipeline.service';
import { operationRepository } from '@/features/operations/operation.repository';
import type { ExecutionPlan } from '@/features/pipelines/pipeline.engine';

const CONTEXT_TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const DIRECT_CTX_RE = /^\$ctx\.([A-Za-z0-9_\-\.\[\]"']+)$/;

function getContextValue(context: Record<string, any>, rawPath: string) {
  const normalized = rawPath
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[['"]([^'"]+)['"]\]/g, '.$1')
    .replace(/^\./, '');
  const parts = normalized.split('.').filter(Boolean);
  let current: any = context;
  for (const part of parts) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return { found: false, value: undefined };
    }
  }
  return { found: true, value: current };
}

function stringifyForTemplate(value: any) {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function resolveValueWithContext(value: any, context: Record<string, any>) {
  if (typeof value === 'string') {
    const directMatch = value.match(DIRECT_CTX_RE);
    if (directMatch) {
      const { found, value: resolved } = getContextValue(context, directMatch[1]);
      if (!found) throw new Error(`context_missing:${directMatch[1]}`);
      return resolved;
    }

    const matches = [...value.matchAll(CONTEXT_TOKEN_RE)];
    if (matches.length === 0) return value;

    if (matches.length === 1 && value.trim() === matches[0][0]) {
      const path = matches[0][1].trim();
      const { found, value: resolved } = getContextValue(context, path);
      if (!found) throw new Error(`context_missing:${path}`);
      return resolved;
    }

    return value.replace(CONTEXT_TOKEN_RE, (_token, rawPath) => {
      const path = String(rawPath).trim();
      const { found, value: resolved } = getContextValue(context, path);
      if (!found) throw new Error(`context_missing:${path}`);
      return stringifyForTemplate(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveValueWithContext(entry, context));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = resolveValueWithContext(entry, context);
    }
    return output;
  }

  return value;
}

function applyContextToPlan(plan: ExecutionPlan, context: Record<string, any>) {
  if (!context || Object.keys(context).length === 0) return plan;
  return {
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      inputs: resolveValueWithContext(step.inputs ?? {}, context),
    })),
  };
}

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
  let plan = planResult.plan;
  if (input.context) {
    try {
      plan = applyContextToPlan(plan, input.context);
    } catch (error: any) {
      throw httpError(400, 'invalid_state', error?.message || 'context_substitution_failed');
    }
  }
  const job = await jobRepository.create({
    tenantId: input.tenantId,
    operationId: input.operationId,
    status: 'planned',
    plan,
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
    logs: job.logs || [],
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

async function appendLogs(tenantId: string, jobId: string, logs: Array<{ ts?: Date; level?: string; message: string }>) {
  const job = await jobRepository.appendLogs(tenantId, jobId, logs);
  if (!job) throw httpError(404, 'not_found', 'job_not_found');
  return { job_id: jobId, status: job.status };
}

export const jobService = { createPlan, get, list, submit, complete, cancel, appendLogs };
