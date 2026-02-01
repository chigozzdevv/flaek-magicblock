import mongoose, { Schema } from 'mongoose'

export type JobDocument = mongoose.Document & {
  tenantId: string
  operationId: string
  status: 'planned' | 'submitted' | 'completed' | 'failed' | 'cancelled'
  plan?: any
  executionMode?: 'er' | 'per'
  txSignatures?: string[]
  result?: any
  error?: any
  logs?: Array<{ ts: Date; level?: string; message: string }>
  callbackUrl?: string
  createdAt: Date
  updatedAt: Date
}

const jobSchema = new Schema<any>(
  {
    tenantId: { type: String, required: true, index: true },
    operationId: { type: String, required: true },
    status: {
      type: String,
      enum: ['planned', 'submitted', 'completed', 'failed', 'cancelled'],
      default: 'planned',
    },
    plan: { type: Schema.Types.Mixed },
    executionMode: { type: String, enum: ['er', 'per'] },
    txSignatures: { type: [String], default: [] },
    result: { type: Schema.Types.Mixed },
    error: { type: Schema.Types.Mixed },
    logs: {
      type: [
        {
          ts: { type: Date, default: Date.now },
          level: { type: String },
          message: { type: String, required: true },
        },
      ],
      default: [],
    },
    callbackUrl: { type: String },
  },
  { timestamps: true },
)

export const JobModel = mongoose.models.Job || mongoose.model<JobDocument>('Job', jobSchema)
