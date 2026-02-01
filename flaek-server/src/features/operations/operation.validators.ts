import { z } from 'zod'

export const createOperationSchema = z.object({
  body: z.object({
    name: z.string(),
    version: z.string(),
    pipeline_spec: z.any(),
    pipeline_hash: z.string(),
    artifact_uri: z.string(),
    runtime: z.enum(['magicblock']),
    inputs: z.array(z.string()),
    outputs: z.array(z.string()),
    datasetId: z.string().optional(),
    retentionPolicy: z.any().optional(),
  }),
})
