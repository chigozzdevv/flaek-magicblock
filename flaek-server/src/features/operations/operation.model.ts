import mongoose, { Schema } from 'mongoose'

export type OperationDocument = mongoose.Document & {
  tenantId: string
  name: string
  version: string
  pipelineSpec: any
  pipelineHash: string
  artifactUri: string
  runtime: 'magicblock'
  inputs: string[]
  outputs: string[]
  status: 'active' | 'deprecated'
  datasetId?: string
  retentionPolicy?: {
    jobRetentionDays: number
    resultRetentionDays: number
    autoDeleteAfter: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const operationSchema = new Schema<any>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    pipelineSpec: { type: Schema.Types.Mixed, required: true },
    pipelineHash: { type: String, required: true, index: true },
    artifactUri: { type: String, required: true },
    runtime: { type: String, enum: ['magicblock'], default: 'magicblock' },
    inputs: { type: [String], default: [] },
    outputs: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'deprecated'], default: 'active' },
    datasetId: { type: String, index: true },
    retentionPolicy: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

export const OperationModel =
  mongoose.models.Operation || mongoose.model<OperationDocument>('Operation', operationSchema)
