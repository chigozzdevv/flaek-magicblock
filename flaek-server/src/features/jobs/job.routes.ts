import { Router } from 'express';
import { unifiedAuth } from '@/middlewares/unified-auth';
import { jobController } from '@/features/jobs/job.controller';
import { schemaValidator } from '@/middlewares/schema-validator';
import { createJobSchema, appendJobLogsSchema } from '@/features/jobs/job.validators';

const router = Router();
router.use(unifiedAuth);
router.post('/', schemaValidator(createJobSchema), jobController.create);
router.get('/', jobController.list);
router.get('/:jobId', jobController.get);
router.post('/:jobId/submit', jobController.submit);
router.post('/:jobId/complete', jobController.complete);
router.post('/:jobId/cancel', jobController.cancel);
router.post('/:jobId/logs', schemaValidator(appendJobLogsSchema), jobController.appendLogs);

export const jobRoutes = router;
