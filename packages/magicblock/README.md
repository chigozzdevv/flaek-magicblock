# @flaek/magicblock

Flaek SDK for building and executing Magicblock jobs.

## Features

- Execute Flaek pipeline jobs with user wallets (PER/ER)
- Context substitution for dynamic game/app events
- Automatic job logging to your Flaek dashboard
- Works in browser and server environments

## Install

```bash
npm install @flaek/magicblock
```

## Usage

```ts
import { createFlaekClient } from '@flaek/magicblock'

const flaek = createFlaekClient({
  baseUrl: 'https://api.flaek.dev',
  authToken: '<API_KEY_OR_JWT>',
})

await flaek.runJob({
  operationId: 'op_123',
  wallet: window.solana,
  executionMode: 'per',
  context: {
    roomHash: 'hex:...32bytes...',
    gameState: { score: 12, items: ['sword'] },
  },
})
```

## API

### createFlaekClient(options)

```ts
const flaek = createFlaekClient({
  baseUrl: 'https://api.flaek.dev',
  authToken: '<API_KEY_OR_JWT>',
})
```

### runJob(options)

```ts
await flaek.runJob({
  operationId,
  wallet,
  executionMode: 'per', // or 'er'
  context,
  onLog: (line) => console.log(line),
})
```

## Context placeholders

In the flow builder, use placeholders like:

```json
{
  "name_hash": "{{roomHash}}",
  "data": "{{gameState}}"
}
```

At runtime, pass `context` with matching keys. Missing placeholders fail fast with `context_missing:<path>`.

## Release

Releases are published from the package root with a new version tag.
