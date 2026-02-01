import { z } from 'zod';

export const createJobSchema = z.object({
  body: z.object({
    operation: z.string(),
    execution_mode: z.enum(['er', 'per']).default('per'),
    context: z.record(z.string(), z.any()).optional(),
    callback_url: z.string().url().optional(),
  }),
});

export const appendJobLogsSchema = z.object({
  body: z.object({
    logs: z.array(
      z.object({
        message: z.string().min(1),
        level: z.enum(['info', 'warn', 'error']).optional(),
        ts: z.string().datetime().optional(),
      })
    ).min(1),
  }),
});
