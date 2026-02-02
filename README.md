# Flaek

Flaek is a visual builder + API for composing MagicBlock ER/PER flows, injecting runtime context, and running jobs with user wallets. Build a flow once, publish it as an Operation, and execute it from your app with consistent logs and signatures.

## What you get
- **Visual builder** for MagicBlock state, permission, and delegation blocks
- **Context injection** with `{{placeholders}}` resolved at runtime
- **Operations + Jobs** lifecycle: publish a flow, run jobs, stream logs
- **SDK + API snippets** generated per operation

---

## Core concepts
- **Block**: A MagicBlock primitive (state, permission, delegation, program instruction, magic commit/undelegate).
- **Flow / Pipeline**: A graph of blocks.
- **Operation**: A versioned, published flow you can reuse.
- **Job**: A single execution of an operation with context + wallet.
- **Context**: A JSON schema that defines runtime inputs and powers placeholders.

---

## How it works (end‑to‑end)
1) **Design** a flow in the builder using MagicBlock blocks.
2) **Define context** (JSON schema) for runtime inputs like `roomHash`, `eventPayload`.
3) **Publish** the flow as an operation. Flaek generates SDK/API snippets.
4) **Run** jobs from your app using the SDK with a user wallet.
5) **Track** job status, logs, and signatures in the dashboard.

---

## Example flows

### ER (simple game state update)
**Blocks (order):**
1. `flaek_create_state`
2. `flaek_update_state` (or `flaek_append_state`)
3. `mb_magic_commit_undelegate`

**Configs:**
```json
// create_state
{ "name_hash": "{{roomHash}}", "max_len": 1024, "data": "{{initialState}}" }

// update_state
{ "name_hash": "{{roomHash}}", "data": "{{gameState}}" }

// magic_commit_undelegate
{ "name_hash": "{{roomHash}}" }
```

**Context (runtime):**
```json
{
  "roomHash": "hex:...32bytes...",
  "initialState": { "score": 0, "inventory": [] },
  "gameState": { "score": 12, "inventory": ["sword"] }
}
```

### PER (permissioned flow)
**Blocks (typical order):**
1. `flaek_create_state`
2. `flaek_create_permission` (Flaek)
3. `flaek_delegate_state`
4. `program_instruction` (your program call)
5. `flaek_commit_permission` (Flaek)
6. `mb_magic_commit_undelegate`

Use the same placeholder strategy; PER adds permission blocks and a TEE‑backed execution path.

---

## SDK usage
```ts
import { createFlaekClient } from '@flaek/magicblock'

const flaek = createFlaekClient({
  baseUrl: 'https://api.flaek.dev',
  authToken: '<API_KEY_OR_JWT>',
})

await flaek.runJob({
  operationId: 'op_123',
  wallet: window.solana,
  executionMode: 'er',
  context: {
    roomHash: 'hex:...32bytes...',
    eventPayload: { scoreDelta: 5, itemId: 'sword' },
  },
  onLog: (line) => console.log(line),
})
```

---

## Integration snippets

### SDK job runner (packages/magicblock/src/client.ts)
```ts
// createFlaekClient().runJob(...)
const config = await getMagicblockConfig()
const job = await createJob({ operation: operationId, execution_mode: executionMode, context })

const result = await executePlanWithWallet(
  { steps: plan.steps },
  wallet,
  config,
  { mode: executionMode, validator: validator || config.default_validator, verifyTee, onLog }
)

await submitJob(job.job_id, result.signatures)
if (autoComplete) await completeJob(job.job_id)
```

### Plan execution loop (packages/magicblock/src/magicblock.ts)
```ts
for (const step of plan.steps) {
  const instruction = buildInstructionFromStep(step, { walletPubkey, validator, config })
  const tx = new Transaction().add(instruction)
  const signature = await signAndSendTransaction(connection, wallet, tx, walletPubkey)
  signatures.push(signature)
}
```

### Context substitution (flaek-server/src/features/jobs/job.service.ts)
```ts
const CONTEXT_TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g

function applyContextToPlan(plan: ExecutionPlan, context: Record<string, any>) {
  return {
    ...plan,
    steps: plan.steps.map((step) => ({
      ...step,
      inputs: resolveValueWithContext(step.inputs ?? {}, context),
    })),
  }
}
```

---

## API usage (quick)
```bash
# Create a context schema
curl -X POST https://api.flaek.dev/v1/contexts \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"name":"game-context","schema":{"type":"object","properties":{"roomHash":{"type":"string"},"eventPayload":{"type":"object"}},"required":["roomHash","eventPayload"]}}'

# Create an operation (flow)
curl -X POST https://api.flaek.dev/v1/pipelines/operations \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"name":"game-flow","version":"1.0.0","pipeline":{...},"datasetId":"<contextId>"}'

# Get integration snippet
curl https://api.flaek.dev/v1/operations/<operationId>/snippet \
  -H 'Authorization: Bearer <TOKEN>'

# Create a job
curl -X POST https://api.flaek.dev/v1/jobs \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"operation":"<operationId>","execution_mode":"er","context":{"roomHash":"hex:...","eventPayload":{}}}'
```

---

## Repository structure
```
contracts/          # Anchor programs (Flaek + MagicBlock hooks)
flaek-server/        # API, job orchestration, plans, logs
flaek-client/        # Dashboard + flow builder
packages/magicblock/ # SDK package
```

---

## Local dev setup

Prereqs:
- Node.js 20+
- MongoDB + Redis (local or Docker)

Docker (recommended):
```bash
docker run --name mongo -p 27017:27017 -d mongo:7
docker run --name redis -p 6379:6379 -d redis:7
```

### Server
```bash
cd flaek-server
npm install
cp ../.env ./.env   # ensure env is in this folder
npm run dev
```

### Client
```bash
cd ../flaek-client
npm install
cp .env.example .env
# set API base URL
echo "VITE_API_BASE=http://localhost:4000" > .env
npm run dev
```

> Note: the server loads `.env` from **flaek-server/**. If you keep `.env` at repo root, start with:
> `DOTENV_CONFIG_PATH=../.env npm run dev`

---

## Environment variables (server)
Key values you must set:
```bash
MONGO_URI=mongodb://localhost:27017/flaek
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-long-random
API_KEY_HASH_SALT=replace-with-long-random
JOB_ENC_KEY=replace-with-32+chars
HELIUS_DEVNET_RPC=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```
Other MagicBlock settings are in `.env.example` with defaults.

---

## Troubleshooting
- **401**: make sure `Authorization: Bearer <JWT|API_KEY>` is set.
- **Missing env**: server validates `.env` on boot (Zod).
- **CORS**: set `VITE_API_BASE` to your server URL.

---

## Publish / snippets
After you publish a flow, Flaek can generate:
- SDK snippet
- API snippet
- Required placeholders

You can retrieve it from `/v1/operations/:id/snippet` or via the dashboard.
