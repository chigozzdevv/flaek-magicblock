import { Router } from 'express';
import { publicController } from '@/features/public/public.controller';

const router = Router();
router.get('/tenants/:tenantId', publicController.getTenantPublic);
router.get('/magicblock/config', publicController.getMagicblockConfig);
router.get('/magicblock/validators', publicController.getMagicblockValidators);

export const publicRoutes = router;
