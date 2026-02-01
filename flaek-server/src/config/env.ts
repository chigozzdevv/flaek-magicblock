import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGO_URI: z.string(),
  REDIS_URL: z.string(),

  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('7d'),

  WEBHOOK_SECRET: z.string().min(8),

  HELIUS_DEVNET_RPC: z.string(),
  MAGICBLOCK_TEE_RPC_URL: z.string().default('https://tee.magicblock.app'),
  MAGICBLOCK_TEE_WS_URL: z.string().default('wss://tee.magicblock.app'),
  MAGICBLOCK_ER_RPC_URL: z.string().default('https://devnet-router.magicblock.app'),
  MAGICBLOCK_ER_WS_URL: z.string().default('wss://devnet.magicblock.app'),
  MAGICBLOCK_PERMISSION_PROGRAM_ID: z.string().default('ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1'),
  MAGICBLOCK_DELEGATION_PROGRAM_ID: z.string().default('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh'),
  MAGICBLOCK_MAGIC_PROGRAM_ID: z.string().default('Magic11111111111111111111111111111111111111'),
  MAGICBLOCK_MAGIC_CONTEXT_ID: z.string().default('MagicContext1111111111111111111111111111111'),
  MAGICBLOCK_DEFAULT_VALIDATOR: z.string().default('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57'),
  FLAEK_MB_PROGRAM_ID: z.string().default('9H2L2RwoURMv9pVaW2TWx6uasFuHg4PYW92jaVVDaicW'),

  API_KEY_HASH_SALT: z.string().min(8),
  INGEST_TTL_SECONDS: z.coerce.number().default(3600),
  JOB_ENC_KEY: z.string().min(16),
  
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
