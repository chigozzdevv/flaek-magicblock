import { getBlockById } from '../blocks/blocks.registry';

export interface PipelineNode {
  id: string;
  blockId: string;
  type?: 'block';
  data?: Record<string, any>;
  position?: { x: number; y: number };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PipelineDefinition {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
  };
}

export interface ExecutionContext {
  values: Map<string, any>;
}

export interface ExecutionPlanStep {
  nodeId: string;
  blockId: string;
  inputs: Record<string, any>;
  dependsOn: string[];
}

export interface ExecutionPlan {
  steps: ExecutionPlanStep[];
}

export interface ExecutionResult {
  plan: ExecutionPlan;
  duration: number;
  status: 'planned' | 'failed';
  error?: string;
}

export class PipelineEngine {
  buildPlan(pipeline: PipelineDefinition): ExecutionResult {
    const startTime = Date.now();
    try {
      this.validatePipeline(pipeline);
      const order = this.topologicalSort(pipeline);
      const steps: ExecutionPlanStep[] = [];

      for (const nodeId of order) {
        const node = pipeline.nodes.find((n) => n.id === nodeId);
        if (!node) continue;
        const block = getBlockById(node.blockId);
        if (!block) {
          throw new Error(`Unknown block: ${node.blockId}`);
        }
        const inputs = node.data ? { ...node.data } : {};
        const dependsOn = pipeline.edges.filter((e) => e.target === nodeId).map((e) => e.source);
        steps.push({ nodeId, blockId: node.blockId, inputs, dependsOn });
      }

      return {
        plan: { steps },
        duration: Date.now() - startTime,
        status: 'planned',
      };
    } catch (error: any) {
      return {
        plan: { steps: [] },
        duration: Date.now() - startTime,
        status: 'failed',
        error: error.message || 'Failed to build plan',
      };
    }
  }

  private topologicalSort(pipeline: PipelineDefinition): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of pipeline.nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of pipeline.edges) {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    const result: string[] = [];

    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(nodeId);
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (result.length !== pipeline.nodes.length) {
      throw new Error('Pipeline contains cycles');
    }

    return result;
  }

  private validatePipeline(pipeline: PipelineDefinition): void {
    if (!pipeline.nodes || pipeline.nodes.length === 0) {
      throw new Error('Pipeline must have at least one node');
    }
    if (!pipeline.edges) {
      throw new Error('Pipeline must have edges');
    }

    for (const node of pipeline.nodes) {
      const block = getBlockById(node.blockId);
      if (!block) {
        throw new Error(`Unknown block: ${node.blockId}`);
      }
    }

    const nodeIds = new Set(pipeline.nodes.map((n) => n.id));
    for (const edge of pipeline.edges) {
      if (!nodeIds.has(edge.source)) {
        throw new Error(`Edge references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        throw new Error(`Edge references unknown target node: ${edge.target}`);
      }
    }
  }
}
