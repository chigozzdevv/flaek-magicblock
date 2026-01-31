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

  SOLANA_RPC_URL: z.string(),
  MAGICBLOCK_TEE_RPC_URL: z.string().default('https://tee.magicblock.app'),
  MAGICBLOCK_TEE_WS_URL: z.string().default('wss://tee.magicblock.app'),
  MAGICBLOCK_ER_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  MAGICBLOCK_PERMISSION_PROGRAM_ID: z.string().default('ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1'),
  MAGICBLOCK_DELEGATION_PROGRAM_ID: z.string().default('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh'),
  MAGICBLOCK_DEFAULT_VALIDATOR: z.string().default('MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'),

  API_KEY_HASH_SALT: z.string().min(8),
  INGEST_TTL_SECONDS: z.coerce.number().default(3600),
  JOB_ENC_KEY: z.string().min(16),
  
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
