import { PipelineEngine, PipelineDefinition, ExecutionResult } from './pipeline.engine';
import { operationRepository } from '../operations/operation.repository';
import { sha256Hex } from '@/utils/hash';

async function createOperationFromPipeline(
  tenantId: string,
  pipeline: PipelineDefinition,
  metadata: {
    name: string;
    version: string;
    datasetId?: string;
  }
): Promise<any> {
  const pipelineSpec = {
    type: 'magicblock_graph',
    pipeline,
  };

  const artifactUri = `pipeline://${metadata.name}@${metadata.version}`;
  const pipelineHash = sha256Hex(JSON.stringify(pipelineSpec) + artifactUri);

  const operation = await operationRepository.create(tenantId, {
    name: metadata.name,
    version: metadata.version,
    pipelineSpec,
    pipelineHash,
    artifactUri,
    runtime: 'magicblock',
    inputs: [],
    outputs: [],
    ...(metadata.datasetId ? { datasetId: metadata.datasetId } : {}),
  });

  return {
    operation_id: operation.id,
    name: operation.name,
    version: operation.version,
    pipeline_spec: operation.pipelineSpec,
    pipeline_hash: operation.pipelineHash,
    artifact_uri: operation.artifactUri,
    inputs: operation.inputs,
    outputs: operation.outputs,
  };
}

async function executePipeline(
  tenantId: string,
  pipeline: PipelineDefinition
): Promise<ExecutionResult> {
  const engine = new PipelineEngine();
  return engine.buildPlan(pipeline);
}

async function validatePipeline(pipeline: PipelineDefinition): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: any;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const engine = new PipelineEngine();
    const executionOrder = (engine as any).topologicalSort(pipeline);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        nodeCount: pipeline.nodes.length,
        edgeCount: pipeline.edges.length,
        executionOrder: executionOrder.length,
      },
    };
  } catch (error: any) {
    errors.push(error.message);
    return {
      valid: false,
      errors,
      warnings,
      stats: {},
    };
  }
}

function getPipelineTemplates() {
  return [
    {
      id: 'permission_flow',
      name: 'Permissioned Account Flow',
      description: 'Create, delegate, update, and commit a permissioned account',
      category: 'permission',
      pipeline: {
        nodes: [
          { id: 'create', blockId: 'mb_create_permission', data: { members: [] } },
          { id: 'delegate', blockId: 'mb_delegate_permission' },
          { id: 'update', blockId: 'mb_update_permission', data: { members: [] } },
          { id: 'commit', blockId: 'mb_commit_undelegate_permission' },
        ],
        edges: [
          { id: 'e1', source: 'create', target: 'delegate' },
          { id: 'e2', source: 'delegate', target: 'update' },
          { id: 'e3', source: 'update', target: 'commit' },
        ],
      },
    },
  ];
}

export const pipelineService = {
  createOperationFromPipeline,
  executePipeline,
  validatePipeline,
  getPipelineTemplates,
};
