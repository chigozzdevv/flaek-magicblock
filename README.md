# Flaek

Flaek lets you build MagicBlock ER/PER flows for Solana. Compose permission and delegation primitives with a visual block graph, then execute on devnet using TEE‑backed RPC with client‑signed transactions.

At a glance:
- flaek-server: TypeScript/Express API that manages tenants, flows (operations), run plans, credits, and MagicBlock config.
- flaek-client: React/Vite UI to design flows and generate execution plans.
- contracts/: Anchor workspace with MagicBlock permission/delegation hooks.

## How to think about it
- Blocks are MagicBlock primitives (permission, delegation, program instructions). You connect them into a flow.
- An Operation is a versioned, saved flow you can reuse.
- A Job is an execution plan plus any submitted transaction signatures.

## Tech stack
- Server: Node.js, TypeScript, Express 5, MongoDB, Socket.IO, Zod, Pino. MagicBlock SDK + Solana web3.
- Client: React + Vite + Tailwind, React Flow.
- Contracts: Anchor + MagicBlock permission/delegation hooks.

---

## Quick start (local dev)

Prerequisites:
- Node.js 20+
- MongoDB and Redis (local or Docker)

Start dependencies with Docker (recommended):
```bash
docker run --name mongo -p 27017:27017 -d mongo:7
docker run --name redis -p 6379:6379 -d redis:7
```

1) Server setup
```bash
cd flaek-server
npm install
cp .env .env.local # or create .env from the template below
# Edit .env to match your local services
npm run dev
# Server listens on http://localhost:4000 by default
```

2) Client setup
```bash
cd ../flaek-client
npm install
cp .env.example .env
echo "VITE_API_BASE=http://localhost:4000" > .env
npm run dev
# UI on http://localhost:5173
```

Login flow (first run):
1. POST /auth/signup to create owner and tenant.
2. POST /auth/login to get a JWT; or create an API key and use that as the Bearer token.

Minimal examples:
```bash
# 1) Signup
curl -X POST http://localhost:4000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"passpass","confirmPassword":"passpass","orgName":"Ada Labs"}'

# 2) Login (returns { jwt })
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"passpass"}'

# 3) Create an API key (optional; use as Bearer token)
curl -X POST http://localhost:4000/tenants/keys \
  -H 'Authorization: Bearer YOUR_JWT' -H 'Content-Type: application/json' -d '{"name":"default"}'
```

---

## Configuration

Server environment (.env) — required keys
```bash
# Base
NODE_ENV=development
PORT=4000

# Datastores
MONGO_URI=mongodb://localhost:27017/flaek
REDIS_URL=redis://localhost:6379

# Auth & security
JWT_SECRET=replace-with-long-random
JWT_EXPIRES_IN=7d
API_KEY_HASH_SALT=replace-with-long-random
JOB_ENC_KEY=replace-with-32+chars
INGEST_TTL_SECONDS=3600

# Cloudinary (used for object storage/assets)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Solana / MagicBlock
HELIUS_DEVNET_RPC=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
MAGICBLOCK_ER_RPC_URL=https://api.devnet.solana.com
MAGICBLOCK_TEE_RPC_URL=https://tee.magicblock.app
MAGICBLOCK_TEE_WS_URL=wss://tee.magicblock.app
MAGICBLOCK_PERMISSION_PROGRAM_ID=ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1
MAGICBLOCK_DELEGATION_PROGRAM_ID=DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
MAGICBLOCK_DEFAULT_VALIDATOR=MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
FLAEK_MB_PROGRAM_ID=H2iGiWPCT13u76WXmK19pK5ssGh5gmR2NqcnKMVBfAFM
```

Client environment (.env)
```bash
VITE_API_BASE=http://localhost:4000
```

Notes:
- The server validates env on boot (Zod). Missing values will fail fast.
- PER flows require TEE authorization and a client‑signed token.

---

## Using the API

Authentication options:
- Bearer JWT (owner user): Authorization: Bearer <JWT>
- Bearer API key (tenant scope): Authorization: Bearer <API_KEY>

Create a context schema
```bash
curl -X POST http://localhost:4000/v1/contexts \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"name":"game-context","schema":{"type":"object","properties":{"playerHash":{"type":"string"},"gameState":{"type":"object"}},"required":["playerHash"]}}'
```

Explore blocks and templates
```bash
curl http://localhost:4000/v1/blocks            # list blocks
curl http://localhost:4000/v1/pipelines/templates # sample pipelines
```

Create a flow from a template
```bash
TEMPLATE=$(curl -s http://localhost:4000/v1/pipelines/templates | jq -c '.templates[0].pipeline')
curl -X POST http://localhost:4000/v1/pipelines/operations \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{
    "name":"demo-flow","version":"1.0.0",
    "pipeline":'"$TEMPLATE"'
  }'
```

Build an execution plan
```bash
curl -X POST http://localhost:4000/v1/pipelines/execute \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{
    "pipeline": {"nodes":[{"id":"create","blockId":"mb_create_permission","data":{"members":[]}}],
                 "edges":[]}
  }'
```

Create a run plan
```bash
curl -X POST http://localhost:4000/v1/jobs \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"operation":"OPERATION_ID","execution_mode":"per","context":{"playerHash":"hex:...","gameState":{"score":12}}}'
```

Check job status
```bash
curl -H 'Authorization: Bearer <TOKEN>' http://localhost:4000/v1/jobs/JOB_ID
```

Credits (simple wallet)
```bash
# Get balance
curl -H 'Authorization: Bearer <TOKEN>' http://localhost:4000/v1/credits
# Top up (cents)
curl -X POST http://localhost:4000/v1/credits/topup \
  -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' \
  -d '{"amount_cents": 10000}'
```

---

## MagicBlock ER/PER (what’s needed)
- ER flows require delegation hooks in your program and a validator pubkey for delegation.
- PER flows require Permission Program hooks plus TEE authorization on the client.
- If you’re only exploring the UI and dry‑run execution, the server will still require the env variables, but won’t submit actual on‑chain transactions without a valid key.

MagicBlock ER/PER runs on devnet validators and the TEE RPC. Configure endpoints and program IDs via the `MAGICBLOCK_*` environment variables above.

---

## Troubleshooting
- 401 unauthorized: use `Authorization: Bearer <JWT>` or `Bearer <API_KEY>` depending on endpoint. Unified auth accepts both for most `/v1/*` routes.
- Job creation fails with quota_exceeded: top up credits via `/v1/credits/topup`.
- Missing env on boot: the server validates .env; copy the template above and fill required fields.
- CORS in dev: server allows `http://localhost:5173` by default; set `VITE_API_BASE` to `http://localhost:4000`.
- Mongo/Redis connection errors: ensure services are running and URIs match.

---

## Useful scripts
Server (`flaek-server`):
- `npm run dev` – start API with hot reload.
- `npm run build && npm start` – build to `dist/` and start.
- `npm run worker` – no-op placeholder (execution is client-signed).

Client (`flaek-client`):
- `npm run dev` – run Vite dev server.
- `npm run build` – production build.

---

## What this gives you
Use Flaek to prototype and ship privacy‑preserving features fast: “calculate a credit score without seeing income,” “price a quote without revealing raw inputs,” or “tally a vote without exposing ballots.” You design a pipeline like you’d describe it to a teammate—inputs, a few blocks, an output—and the system handles encryption, queuing, execution, and logging for you.
