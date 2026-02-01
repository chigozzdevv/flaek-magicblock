import { operationRepository } from '@/features/operations/operation.repository';
import { httpError } from '@/shared/errors';
import { sha256Hex } from '@/utils/hash';
import { DatasetModel } from '@/features/datasets/dataset.model';

const CONTEXT_TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const DIRECT_CTX_RE = /^\$ctx\.([A-Za-z0-9_\-\.\[\]"']+)$/;

function normalizePath(rawPath: string) {
  return rawPath
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[['"]([^'"]+)['"]\]/g, '.$1')
    .replace(/^\./, '');
}

function collectPlaceholders(value: any, out: Set<string>) {
  if (typeof value === 'string') {
    const directMatch = value.match(DIRECT_CTX_RE);
    if (directMatch) {
      out.add(normalizePath(directMatch[1]));
    }
    const matches = value.matchAll(CONTEXT_TOKEN_RE);
    for (const match of matches) {
      out.add(normalizePath(String(match[1]).trim()));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPlaceholders(entry, out));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectPlaceholders(entry, out));
  }
}

function sampleValueForPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.includes('hash')) return `hex:${'0'.repeat(64)}`;
  if (lower.includes('pubkey') || lower.includes('address')) return '<PUBLIC_KEY>';
  if (lower.includes('amount') || lower.includes('score') || lower.includes('len') || lower.includes('count')) return 0;
  if (lower.includes('data') || lower.includes('state')) return {};
  return '<value>';
}

function setContextValue(target: Record<string, any>, path: string, value: any) {
  const parts = normalizePath(path).split('.').filter(Boolean);
  if (parts.length === 0) return;
  let current: any = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

function buildContextExample(placeholders: string[]) {
  const context: Record<string, any> = {};
  placeholders.forEach((path) => {
    setContextValue(context, path, sampleValueForPath(path));
  });
  return context;
}

function buildSdkSnippet(operationId: string, context: Record<string, any>) {
  const contextLiteral = JSON.stringify(context, null, 2);
  const contextBlock = contextLiteral.split('\n').map((line) => `  ${line}`).join('\n');
  return [
    "import { createFlaekClient } from '@flaek/magicblock';",
    '',
    'const flaek = createFlaekClient({',
    "  baseUrl: 'https://api.flaek.dev',",
    "  authToken: '<API_KEY_OR_JWT>',",
    '});',
    '',
    'await flaek.runJob({',
    `  operationId: '${operationId}',`,
    '  wallet: window.solana,',
    "  executionMode: 'per',",
    `  context: ${contextBlock.trim() === '{}' ? '{}' : `\n${contextBlock}\n  `}`,
    '});',
  ].join('\n');
}

function buildApiSnippet(operationId: string, context: Record<string, any>) {
  const contextBlock = JSON.stringify(context, null, 2);
  return [
    'curl -X POST https://api.flaek.dev/v1/jobs \\',
    "  -H 'Authorization: Bearer <API_KEY_OR_JWT>' \\",
    "  -H 'Content-Type: application/json' \\",
    `  -d '${JSON.stringify({ operation: operationId, execution_mode: 'per', context }).replace(/'/g, "\\'")}'`,
    '',
    '# Context example:',
    contextBlock,
  ].join('\n');
}

async function create(tenantId: string, body: any) {
  const computed = sha256Hex(JSON.stringify(body.pipeline_spec) + body.artifact_uri);
  if (computed !== body.pipeline_hash) {
    throw httpError(400, 'invalid_body', 'pipeline_hash_mismatch');
  }

  const op = await operationRepository.create(tenantId, {
    name: body.name,
    version: body.version,
    pipelineSpec: body.pipeline_spec,
    pipelineHash: body.pipeline_hash,
    artifactUri: body.artifact_uri,
    runtime: 'magicblock',
    inputs: body.inputs || [],
    outputs: body.outputs || [],
    ...(body.datasetId ? { datasetId: body.datasetId } : {}),
    ...(body.retentionPolicy ? { retentionPolicy: body.retentionPolicy } : {}),
  });
  return { operation_id: op.id, pipeline_hash: op.pipelineHash };
}

async function list(tenantId: string) {
  const items = await operationRepository.list(tenantId);
  return { items: items.map(i => ({ operation_id: i.id, name: i.name, version: i.version, pipeline_hash: i.pipelineHash, created_at: i.createdAt, status: i.status })) };
}

async function get(tenantId: string, operationId: string) {
  const op = await operationRepository.get(tenantId, operationId);
  if (!op) throw httpError(404, 'not_found', 'operation_not_found');
  
  let dataset = null;
  if (op.datasetId) {
    const ds = await DatasetModel.findById(op.datasetId).exec();
    if (ds) {
      dataset = {
        dataset_id: ds._id,
        name: ds.name,
        schema: ds.schema
      };
    }
  }
  
  return {
    operation_id: op.id,
    name: op.name,
    version: op.version,
    pipeline_spec: op.pipelineSpec,
    pipeline_hash: op.pipelineHash,
    artifact_uri: op.artifactUri,
    runtime: op.runtime,
    inputs: op.inputs,
    outputs: op.outputs,
    status: op.status,
    dataset_id: op.datasetId,
    dataset: dataset,
    retention_policy: op.retentionPolicy,
  };
}

async function getSnippet(tenantId: string, operationId: string) {
  const op = await operationRepository.get(tenantId, operationId);
  if (!op) throw httpError(404, 'not_found', 'operation_not_found');
  const placeholders = new Set<string>();
  const pipeline = op.pipelineSpec?.pipeline;
  if (pipeline?.nodes) {
    pipeline.nodes.forEach((node: any) => {
      if (node?.data) collectPlaceholders(node.data, placeholders);
    });
  }
  const placeholderList = Array.from(placeholders);
  const contextExample = buildContextExample(placeholderList);
  return {
    operation_id: op.id,
    placeholders: placeholderList,
    context_example: contextExample,
    sdk_snippet: buildSdkSnippet(op.id, contextExample),
    api_snippet: buildApiSnippet(op.id, contextExample),
  };
}

async function update(tenantId: string, operationId: string, updates: { name?: string; version?: string }) {
  const op = await operationRepository.get(tenantId, operationId);
  if (!op) throw httpError(404, 'not_found', 'operation_not_found');
  await operationRepository.update(operationId, updates);
  return { operation_id: operationId, ...updates };
}

async function deprecate(tenantId: string, operationId: string) {
  await operationRepository.deprecate(tenantId, operationId);
}

export const operationService = { create, list, get, update, deprecate, getSnippet };
