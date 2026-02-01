import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { expect } from 'chai'
import * as crypto from 'crypto'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const rootDir = path.resolve(__dirname, '..')

function loadDotEnv() {
  const envPath = path.resolve(rootDir, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    if (process.env[key] !== undefined) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadDotEnv()

const PERMISSION_PROGRAM_ID = new PublicKey('ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1')
const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh')
const MAGIC_PROGRAM_ID = new PublicKey('Magic11111111111111111111111111111111111111')
const MAGIC_CONTEXT_ID = new PublicKey('MagicContext1111111111111111111111111111111')

function loadProgramId() {
  const anchorTomlPath = path.resolve(rootDir, 'Anchor.toml')
  const contents = fs.readFileSync(anchorTomlPath, 'utf8')
  const match = contents.match(/flaek_mb\s*=\s*"([A-Za-z0-9]+)"/)
  if (!match) {
    throw new Error('flaek_mb program id not found in Anchor.toml')
  }
  return new PublicKey(match[1])
}


function discriminator(name: string) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest()
  return hash.subarray(0, 8)
}

function serializeU32(value: number) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(value, 0)
  return buf
}

function serializeU64(value: number | bigint) {
  const buf = Buffer.alloc(8)
  const big = typeof value === 'bigint' ? value : BigInt(value)
  buf.writeBigUInt64LE(big, 0)
  return buf
}

function serializeVec(bytes: Uint8Array) {
  return Buffer.concat([serializeU32(bytes.length), Buffer.from(bytes)])
}

function serializeAccountTypeState(owner: PublicKey) {
  return Buffer.concat([Buffer.from([0]), owner.toBytes()])
}

function serializeAccountTypeDynamic(owner: PublicKey, nameHash: Buffer) {
  return Buffer.concat([Buffer.from([1]), owner.toBytes(), nameHash])
}

function serializeOptionNone() {
  return Buffer.from([0])
}

function permissionPdaFromAccount(account: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('permission:'), account.toBuffer()],
    PERMISSION_PROGRAM_ID,
  )[0]
}

function decodeState(data: Buffer) {
  let offset = 8 // discriminator
  const owner = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32
  const nameHash = data.subarray(offset, offset + 32)
  offset += 32
  const maxLen = data.readUInt32LE(offset)
  offset += 4
  const dataLen = data.readUInt32LE(offset)
  offset += 4
  const stateData = data.subarray(offset, offset + dataLen)
  offset += dataLen
  const bump = data.readUInt8(offset)
  return { owner, nameHash, maxLen, stateData, bump }
}

describe('flaek_mb devnet flow', () => {
  const rpcUrl = process.env.HELIUS_DEVNET_RPC || process.env.ANCHOR_PROVIDER_URL
  if (!rpcUrl) {
    throw new Error('HELIUS_DEVNET_RPC is required to run devnet tests')
  }
  const rpcLabel = (() => {
    try {
      const url = new URL(rpcUrl)
      return `${url.protocol}//${url.host}${url.pathname}`
    } catch {
      return rpcUrl
    }
  })()
  if (!process.env.FLAEK_TEST_RPC_LOGGED) {
    console.log(`[flaek test] RPC: ${rpcLabel}`)
    process.env.FLAEK_TEST_RPC_LOGGED = '1'
  }
  const envProvider = anchor.AnchorProvider.env()
  const provider = new anchor.AnchorProvider(
    new Connection(rpcUrl, 'confirmed'),
    envProvider.wallet,
    envProvider.opts,
  )
  anchor.setProvider(provider)

  const programId = loadProgramId()
  const owner = provider.wallet.publicKey

  it('runs full state + delegation + permission flow on devnet', async () => {
    const minLamports = 3 * anchor.web3.LAMPORTS_PER_SOL
    const balance = await provider.connection.getBalance(owner)
    if (balance < minLamports) {
      try {
        const sig = await provider.connection.requestAirdrop(owner, minLamports - balance)
        await provider.connection.confirmTransaction(sig, 'confirmed')
      } catch (err) {
        throw new Error('Insufficient funds for devnet test. Please airdrop SOL to the test wallet.')
      }
    }

    const nameHash = crypto.randomBytes(32)
    const maxLen = 256

    const [staticState] = PublicKey.findProgramAddressSync(
      [Buffer.from('state'), owner.toBytes()],
      programId,
    )
    const [state] = PublicKey.findProgramAddressSync(
      [Buffer.from('state'), owner.toBytes(), nameHash],
      programId,
    )

    const staticInfo = await provider.connection.getAccountInfo(staticState)
    if (!staticInfo) {
      const initData = Buffer.concat([
        discriminator('init_state'),
        serializeU64(1),
      ])
      const initIx = new anchor.web3.TransactionInstruction({
        programId,
        keys: [
          { pubkey: staticState, isWritable: true, isSigner: false },
          { pubkey: owner, isWritable: true, isSigner: true },
          { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        ],
        data: initData,
      })
      await provider.sendAndConfirm(new Transaction().add(initIx), [])
    }

    const createData = Buffer.concat([
      discriminator('create_state'),
      nameHash,
      serializeU32(maxLen),
      serializeVec(Buffer.from('hello')),
    ])
    const createIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
      ],
      data: createData,
    })
    await provider.sendAndConfirm(new Transaction().add(createIx), [])

    const accountInfo = await provider.connection.getAccountInfo(state)
    expect(accountInfo).to.not.equal(null)
    const decoded = decodeState(Buffer.from(accountInfo!.data))
    expect(decoded.owner.toBase58()).to.equal(owner.toBase58())
    expect(Buffer.from(decoded.nameHash).toString('hex')).to.equal(nameHash.toString('hex'))
    expect(decoded.maxLen).to.equal(maxLen)
    expect(decoded.stateData.toString()).to.equal('hello')

    const updateData = Buffer.concat([
      discriminator('update_state'),
      nameHash,
      serializeVec(Buffer.from('world')),
    ])
    const updateIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: false, isSigner: true },
      ],
      data: updateData,
    })
    await provider.sendAndConfirm(new Transaction().add(updateIx), [])

    const updatedInfo = await provider.connection.getAccountInfo(state)
    const updated = decodeState(Buffer.from(updatedInfo!.data))
    expect(updated.stateData.toString()).to.equal('world')

    const appendData = Buffer.concat([
      discriminator('append_state'),
      nameHash,
      serializeVec(Buffer.from('!')),
    ])
    const appendIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: false, isSigner: true },
      ],
      data: appendData,
    })
    await provider.sendAndConfirm(new Transaction().add(appendIx), [])

    const appendedInfo = await provider.connection.getAccountInfo(state)
    const appended = decodeState(Buffer.from(appendedInfo!.data))
    expect(appended.stateData.toString()).to.equal('world!')

    const permissionAccount = permissionPdaFromAccount(staticState)
    const accountType = serializeAccountTypeState(owner)
    const dynamicPermissionAccount = permissionPdaFromAccount(state)
    const dynamicAccountType = serializeAccountTypeDynamic(owner, nameHash)
    const membersNone = serializeOptionNone()

    const permissionInfo = await provider.connection.getAccountInfo(permissionAccount)
    if (!permissionInfo) {
      const createPermissionData = Buffer.concat([
        discriminator('create_permission'),
        accountType,
        membersNone,
      ])
      const createPermissionIx = new anchor.web3.TransactionInstruction({
        programId,
        keys: [
          { pubkey: staticState, isWritable: false, isSigner: false },
          { pubkey: permissionAccount, isWritable: true, isSigner: false },
          { pubkey: owner, isWritable: true, isSigner: true },
          { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        ],
        data: createPermissionData,
      })
      await provider.sendAndConfirm(new Transaction().add(createPermissionIx), [])
    }

    const updatePermissionData = Buffer.concat([
      discriminator('update_permission'),
      accountType,
      membersNone,
    ])
    const updatePermissionIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: staticState, isWritable: false, isSigner: false },
        { pubkey: permissionAccount, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
      ],
      data: updatePermissionData,
    })
    await provider.sendAndConfirm(new Transaction().add(updatePermissionIx), [])

    const dynamicPermissionInfo = await provider.connection.getAccountInfo(dynamicPermissionAccount)
    if (!dynamicPermissionInfo) {
      const createDynamicPermissionData = Buffer.concat([
        discriminator('create_permission'),
        dynamicAccountType,
        membersNone,
      ])
      const createDynamicPermissionIx = new anchor.web3.TransactionInstruction({
        programId,
        keys: [
          { pubkey: state, isWritable: false, isSigner: false },
          { pubkey: dynamicPermissionAccount, isWritable: true, isSigner: false },
          { pubkey: owner, isWritable: true, isSigner: true },
          { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        ],
        data: createDynamicPermissionData,
      })
      await provider.sendAndConfirm(new Transaction().add(createDynamicPermissionIx), [])
    }

    const updateDynamicPermissionData = Buffer.concat([
      discriminator('update_permission'),
      dynamicAccountType,
      membersNone,
    ])
    const updateDynamicPermissionIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: state, isWritable: false, isSigner: false },
        { pubkey: dynamicPermissionAccount, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
      ],
      data: updateDynamicPermissionData,
    })
    await provider.sendAndConfirm(new Transaction().add(updateDynamicPermissionIx), [])

    const bufferState = PublicKey.findProgramAddressSync(
      [Buffer.from('buffer'), state.toBytes()],
      programId,
    )[0]
    const delegationRecord = PublicKey.findProgramAddressSync(
      [Buffer.from('delegation'), state.toBytes()],
      DELEGATION_PROGRAM_ID,
    )[0]
    const delegationMetadata = PublicKey.findProgramAddressSync(
      [Buffer.from('delegation-metadata'), state.toBytes()],
      DELEGATION_PROGRAM_ID,
    )[0]

    const delegateData = Buffer.concat([
      discriminator('delegate_state'),
      nameHash,
      serializeOptionNone(),
    ])
    const delegateIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: bufferState, isWritable: true, isSigner: false },
        { pubkey: delegationRecord, isWritable: true, isSigner: false },
        { pubkey: delegationMetadata, isWritable: true, isSigner: false },
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: owner, isWritable: false, isSigner: true },
        { pubkey: programId, isWritable: false, isSigner: false },
        { pubkey: DELEGATION_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
      ],
      data: delegateData,
    })
    await provider.sendAndConfirm(new Transaction().add(delegateIx), [])

    const delegationRecordInfo = await provider.connection.getAccountInfo(delegationRecord)
    const delegationMetadataInfo = await provider.connection.getAccountInfo(delegationMetadata)
    expect(delegationRecordInfo).to.not.equal(null)
    expect(delegationMetadataInfo).to.not.equal(null)

    const magicProgramInfo = await provider.connection.getAccountInfo(MAGIC_PROGRAM_ID)
    const magicContextInfo = await provider.connection.getAccountInfo(MAGIC_CONTEXT_ID)
    const magicAvailable = !!magicProgramInfo && !!magicContextInfo

    if (magicAvailable) {
      const commitPermissionData = Buffer.concat([
        discriminator('commit_and_undelegate_permission'),
        accountType,
      ])
      const commitPermissionIx = new anchor.web3.TransactionInstruction({
        programId,
        keys: [
          { pubkey: staticState, isWritable: false, isSigner: false },
          { pubkey: permissionAccount, isWritable: true, isSigner: false },
          { pubkey: owner, isWritable: true, isSigner: true },
          { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: MAGIC_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: MAGIC_CONTEXT_ID, isWritable: true, isSigner: false },
        ],
        data: commitPermissionData,
      })
      await provider.sendAndConfirm(new Transaction().add(commitPermissionIx), [])

      const magicCommitData = Buffer.alloc(4)
      magicCommitData.writeUInt32LE(2, 0)
      const magicCommitIx = new anchor.web3.TransactionInstruction({
        programId: MAGIC_PROGRAM_ID,
        keys: [
          { pubkey: owner, isWritable: true, isSigner: true },
          { pubkey: MAGIC_CONTEXT_ID, isWritable: true, isSigner: false },
          { pubkey: state, isWritable: false, isSigner: false },
        ],
        data: magicCommitData,
      })
      await provider.sendAndConfirm(new Transaction().add(magicCommitIx), [])
    }

    const closePermissionData = Buffer.concat([
      discriminator('close_permission'),
      accountType,
    ])
    const closePermissionIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: staticState, isWritable: false, isSigner: false },
        { pubkey: permissionAccount, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
      ],
      data: closePermissionData,
    })
    await provider.sendAndConfirm(new Transaction().add(closePermissionIx), [])

    const closeDynamicPermissionData = Buffer.concat([
      discriminator('close_permission'),
      dynamicAccountType,
    ])
    const closeDynamicPermissionIx = new anchor.web3.TransactionInstruction({
      programId,
      keys: [
        { pubkey: state, isWritable: false, isSigner: false },
        { pubkey: dynamicPermissionAccount, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: PERMISSION_PROGRAM_ID, isWritable: false, isSigner: false },
      ],
      data: closeDynamicPermissionData,
    })
    await provider.sendAndConfirm(new Transaction().add(closeDynamicPermissionIx), [])
  })

  it('runs builder-style plan via SDK (state + permission + commit/undelegate)', async () => {
    const minLamports = 3 * anchor.web3.LAMPORTS_PER_SOL
    const balance = await provider.connection.getBalance(owner)
    if (balance < minLamports) {
      try {
        const sig = await provider.connection.requestAirdrop(owner, minLamports - balance)
        await provider.connection.confirmTransaction(sig, 'confirmed')
      } catch (err) {
        throw new Error('Insufficient funds for devnet test. Please airdrop SOL to the test wallet.')
      }
    }

    const sdkRoot = path.resolve(rootDir, '..', 'packages', 'magicblock')
    let sdkEntry = path.resolve(sdkRoot, 'dist', 'index.cjs')
    if (!fs.existsSync(sdkEntry)) {
      try {
        execSync('npm install', { cwd: sdkRoot, stdio: 'inherit' })
        execSync('npm run build', { cwd: sdkRoot, stdio: 'inherit' })
      } catch (err) {
        throw new Error(
          'Magicblock SDK dist not found and build failed. Run `cd packages/magicblock && npm install && npm run build`.',
        )
      }
    }
    if (!fs.existsSync(sdkEntry)) {
      sdkEntry = path.resolve(sdkRoot, 'dist', 'index.js')
    }
    let sdk: any
    try {
      sdk = require(sdkEntry)
    } catch (err) {
      throw new Error(
        'Magicblock SDK dist not found. Run `cd packages/magicblock && npm install && npm run build`.',
      )
    }

    const { executePlanWithWallet } = sdk
    const wallet = {
      publicKey: owner,
      isConnected: true,
      signTransaction: provider.wallet.signTransaction.bind(provider.wallet),
    }

    const nameHash = crypto.randomBytes(32)
    const nameHashHex = nameHash.toString('hex')
    const [state] = PublicKey.findProgramAddressSync(
      [Buffer.from('state'), owner.toBytes(), nameHash],
      programId,
    )
    const permissionAccount = permissionPdaFromAccount(state)

    const config = {
      tee_rpc_url: 'https://tee.magicblock.app',
      tee_ws_url: 'wss://tee.magicblock.app',
      er_rpc_url: rpcUrl,
      er_ws_url: '',
      default_validator: 'MAS1o5aVQ34MZYboK2h2iuLzfmiZUPs1aJGmZ4b1gQg',
      permission_program_id: PERMISSION_PROGRAM_ID.toBase58(),
      delegation_program_id: DELEGATION_PROGRAM_ID.toBase58(),
      magic_program_id: MAGIC_PROGRAM_ID.toBase58(),
      magic_context_id: MAGIC_CONTEXT_ID.toBase58(),
      flaek_program_id: programId.toBase58(),
    }

    const createPlan = {
      steps: [
        {
          id: 'create',
          blockId: 'flaek_create_state',
          inputs: { name_hash: nameHashHex, max_len: 256, data: 'hello' },
        },
        {
          id: 'update',
          blockId: 'flaek_update_state',
          inputs: { name_hash: nameHashHex, data: 'world' },
        },
        {
          id: 'append',
          blockId: 'flaek_append_state',
          inputs: { name_hash: nameHashHex, data: '!' },
        },
      ],
    }

    await executePlanWithWallet(createPlan, wallet, config, {
      mode: 'er',
      verifyTee: false,
    })

    const afterCreate = await provider.connection.getAccountInfo(state)
    expect(afterCreate).to.not.equal(null)
    const decoded = decodeState(afterCreate!.data)
    expect(decoded.stateData.toString()).to.equal('world!')

    const permissionPlan = {
      steps: [
        {
          id: 'perm-create',
          blockId: 'flaek_create_permission',
          inputs: { name_hash: nameHashHex, members: ['$wallet'] },
        },
        {
          id: 'perm-update',
          blockId: 'flaek_update_permission',
          inputs: { name_hash: nameHashHex, members: [] },
        },
      ],
    }

    await executePlanWithWallet(permissionPlan, wallet, config, {
      mode: 'er',
      verifyTee: false,
    })

    const permissionInfo = await provider.connection.getAccountInfo(permissionAccount)
    expect(permissionInfo).to.not.equal(null)

    const closeOnlyHash = crypto.randomBytes(32)
    const closeOnlyHex = closeOnlyHash.toString('hex')
    const closePlan = {
      steps: [
        {
          id: 'close-create',
          blockId: 'flaek_create_state',
          inputs: { name_hash: closeOnlyHex, max_len: 32, data: 'x' },
        },
        {
          id: 'close-permission-create',
          blockId: 'flaek_create_permission',
          inputs: { name_hash: closeOnlyHex, members: [] },
        },
        {
          id: 'close-permission',
          blockId: 'flaek_close_permission',
          inputs: { name_hash: closeOnlyHex },
        },
        {
          id: 'close-state',
          blockId: 'flaek_close_state',
          inputs: { name_hash: closeOnlyHex },
        },
      ],
    }

    await executePlanWithWallet(closePlan, wallet, config, {
      mode: 'er',
      verifyTee: false,
    })

    const magicProgramInfo = await provider.connection.getAccountInfo(MAGIC_PROGRAM_ID)
    const magicContextInfo = await provider.connection.getAccountInfo(MAGIC_CONTEXT_ID)
    const magicAvailable = !!magicProgramInfo && !!magicContextInfo

    const finalizeSteps: Array<{ id: string; blockId: string; inputs: Record<string, any> }> = [
      { id: 'delegate', blockId: 'flaek_delegate_state', inputs: { name_hash: nameHashHex } },
    ]

    if (magicAvailable) {
      finalizeSteps.push(
        {
          id: 'commit-permission',
          blockId: 'flaek_commit_undelegate_permission',
          inputs: { name_hash: nameHashHex },
        },
        {
          id: 'magic-commit',
          blockId: 'mb_magic_commit_undelegate',
          inputs: { accounts: [state.toBase58()] },
        },
      )
    }

    const finalizePlan = { steps: finalizeSteps }
    await executePlanWithWallet(finalizePlan, wallet, config, {
      mode: 'er',
      verifyTee: false,
    })
  })
})
