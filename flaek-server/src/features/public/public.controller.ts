import { Request, Response } from 'express';
import { TenantModel } from '@/features/tenants/tenant.model';
import { env } from '@/config/env';

async function getTenantPublic(req: Request, res: Response) {
  const { tenantId } = req.params;
  const tenant = await TenantModel.findById(tenantId).exec();
  if (!tenant) return res.status(404).json({ code: 'not_found', message: 'tenant_not_found' });
  res.json({ publishable_key: tenant.publishableKey, tenant_public_key: tenant.tenantPublicKey, embed_js: 'https://cdn.flaek.dev/embed.min.js' });
}

function getMagicblockConfig(_req: Request, res: Response) {
  res.json({
    tee_rpc_url: env.MAGICBLOCK_TEE_RPC_URL,
    tee_ws_url: env.MAGICBLOCK_TEE_WS_URL,
    er_rpc_url: env.MAGICBLOCK_ER_RPC_URL,
    permission_program_id: env.MAGICBLOCK_PERMISSION_PROGRAM_ID,
    delegation_program_id: env.MAGICBLOCK_DELEGATION_PROGRAM_ID,
    default_validator: env.MAGICBLOCK_DEFAULT_VALIDATOR,
  });
}

function getMagicblockValidators(_req: Request, res: Response) {
  res.json({
    validators: [
      { name: 'Asia (devnet-as.magicblock.app)', pubkey: 'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57' },
      { name: 'EU (devnet-eu.magicblock.app)', pubkey: 'MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e' },
      { name: 'US (devnet-us.magicblock.app)', pubkey: 'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd' },
      { name: 'TEE (tee.magicblock.app)', pubkey: 'FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA' },
      { name: 'Local ER (localhost)', pubkey: 'mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev' },
    ],
  });
}

export const publicController = { getTenantPublic, getMagicblockConfig, getMagicblockValidators };
