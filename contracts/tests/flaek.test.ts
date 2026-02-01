import * as anchor from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { expect } from 'chai'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const rootDir = path.resolve(__dirname, '..')

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

function serializeVec(bytes: Uint8Array) {
  return Buffer.concat([serializeU32(bytes.length), Buffer.from(bytes)])
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
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const programId = loadProgramId()
  const owner = provider.wallet.publicKey

  it('creates, updates, and appends state on devnet', async () => {
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

    const [state] = PublicKey.findProgramAddressSync(
      [Buffer.from('state'), owner.toBytes(), nameHash],
      programId,
    )

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

    const createTx = new Transaction().add(createIx)
    await provider.sendAndConfirm(createTx, [])

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

    const updateTx = new Transaction().add(updateIx)
    await provider.sendAndConfirm(updateTx, [])

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

    const appendTx = new Transaction().add(appendIx)
    await provider.sendAndConfirm(appendTx, [])

    const appendedInfo = await provider.connection.getAccountInfo(state)
    const appended = decodeState(Buffer.from(appendedInfo!.data))
    expect(appended.stateData.toString()).to.equal('world!')
  })
})
