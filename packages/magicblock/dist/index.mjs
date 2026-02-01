// src/magicblock.ts
import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram
} from "@solana/web3.js";
import {
  createCreatePermissionInstruction,
  createUpdatePermissionInstruction,
  createDelegatePermissionInstruction,
  createCommitPermissionInstruction,
  createCommitAndUndelegatePermissionInstruction,
  createClosePermissionInstruction,
  createUndelegatePermissionInstruction,
  createDelegateInstruction,
  createCommitInstruction,
  createCommitAndUndelegateInstruction,
  createTopUpEscrowInstruction,
  createCloseEscrowInstruction,
  getAuthToken,
  verifyTeeRpcIntegrity,
  permissionPdaFromAccount,
  undelegateBufferPdaFromDelegatedAccount
} from "@magicblock-labs/ephemeral-rollups-sdk";
function getBrowserWallet() {
  if (typeof window === "undefined") return null;
  const anyWindow = window;
  return anyWindow?.solana || null;
}
async function ensureWalletConnected(wallet) {
  if (!wallet) throw new Error("Wallet not available");
  if (!wallet.publicKey || !wallet.isConnected) {
    if (!wallet.connect) throw new Error("Wallet connect not supported");
    await wallet.connect();
  }
  return getWalletPublicKey(wallet);
}
function getWalletPublicKey(wallet) {
  const pk = wallet.publicKey;
  if (!pk) throw new Error("Wallet not connected");
  if (typeof pk === "string") return new PublicKey(pk);
  return new PublicKey(pk.toBase58());
}
async function executePlanWithWallet(plan, wallet, config, options) {
  const walletPubkey = await ensureWalletConnected(wallet);
  const connection = await createExecutionConnection(wallet, config, options);
  const signatures = [];
  for (const step of plan.steps) {
    const instruction = buildInstructionFromStep(step, {
      walletPubkey,
      validator: options.validator,
      config
    });
    if (!instruction) {
      throw new Error(`Unsupported block: ${step.blockId}`);
    }
    options.onLog?.(`Building ${step.blockId}`);
    const tx = new Transaction().add(instruction);
    const signature = await signAndSendTransaction(connection, wallet, tx, walletPubkey);
    signatures.push(signature);
    options.onLog?.(`Submitted ${step.blockId}: ${signature}`);
  }
  return {
    signatures,
    authToken: options.mode === "per" ? connection.__authToken : void 0
  };
}
async function createExecutionConnection(wallet, config, options) {
  if (options.mode === "per") {
    if (!wallet.signMessage) {
      throw new Error("Wallet does not support signMessage (required for PER auth)");
    }
    if (options.verifyTee) {
      const verified = await verifyTeeRpcIntegrity(config.tee_rpc_url);
      if (!verified) throw new Error("TEE RPC integrity verification failed");
    }
    const walletPubkey = getWalletPublicKey(wallet);
    const signedMessage = async (message) => {
      const res = await wallet.signMessage(message);
      return res instanceof Uint8Array ? res : res.signature;
    };
    const token = await getAuthToken(config.tee_rpc_url, walletPubkey, signedMessage);
    const connection = new Connection(`${config.tee_rpc_url}?token=${token.token}`, {
      wsEndpoint: `${config.tee_ws_url}?token=${token.token}`,
      commitment: "confirmed"
    });
    connection.__authToken = token.token;
    return connection;
  }
  return new Connection(config.er_rpc_url, "confirmed");
}
async function signAndSendTransaction(connection, wallet, transaction, feePayer) {
  transaction.feePayer = feePayer;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  if (wallet.signAndSendTransaction) {
    const result = await wallet.signAndSendTransaction(transaction);
    const signature2 = typeof result === "string" ? result : result.signature;
    await connection.confirmTransaction({ signature: signature2, blockhash, lastValidBlockHeight }, "confirmed");
    return signature2;
  }
  if (!wallet.signTransaction) {
    throw new Error("Wallet does not support transaction signing");
  }
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}
function buildInstructionFromStep(step, ctx) {
  const inputs = step.inputs || {};
  switch (step.blockId) {
    case "mb_create_permission": {
      const permissionedAccount = parsePubkey(resolveInput(inputs.permissioned_account, ctx.walletPubkey), "permissioned_account");
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const members = parseMembers(inputs.members, ctx.walletPubkey);
      return createCreatePermissionInstruction(
        { permissionedAccount, payer },
        { members }
      );
    }
    case "mb_update_permission": {
      const authority = parsePubkeySigner(
        { pubkey: inputs.authority, isSigner: inputs.authority_is_signer },
        true,
        ctx.walletPubkey
      );
      const permissionedAccount = parsePubkeySigner(
        { pubkey: inputs.permissioned_account, isSigner: inputs.permissioned_account_is_signer },
        false,
        ctx.walletPubkey
      );
      const members = parseMembers(inputs.members, ctx.walletPubkey);
      return createUpdatePermissionInstruction(
        { authority, permissionedAccount },
        { members }
      );
    }
    case "mb_delegate_permission": {
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const authority = parsePubkeySigner(
        { pubkey: inputs.authority, isSigner: inputs.authority_is_signer },
        true,
        ctx.walletPubkey
      );
      const permissionedAccount = parsePubkeySigner(
        { pubkey: inputs.permissioned_account, isSigner: inputs.permissioned_account_is_signer },
        false,
        ctx.walletPubkey
      );
      const ownerProgram = inputs.owner_program ? parsePubkey(inputs.owner_program, "owner_program") : void 0;
      const validator = parseOptionalPubkey(inputs.validator ?? ctx.validator);
      return createDelegatePermissionInstruction(
        {
          payer,
          authority,
          permissionedAccount,
          ...ownerProgram ? { ownerProgram } : {},
          ...validator ? { validator } : {}
        },
        validator ? { validator } : void 0
      );
    }
    case "mb_commit_permission": {
      const authority = parsePubkeySigner(
        { pubkey: inputs.authority, isSigner: inputs.authority_is_signer },
        true,
        ctx.walletPubkey
      );
      const permissionedAccount = parsePubkeySigner(
        { pubkey: inputs.permissioned_account, isSigner: inputs.permissioned_account_is_signer },
        false,
        ctx.walletPubkey
      );
      return createCommitPermissionInstruction({ authority, permissionedAccount });
    }
    case "mb_commit_undelegate_permission": {
      const authority = parsePubkeySigner(
        { pubkey: inputs.authority, isSigner: inputs.authority_is_signer },
        true,
        ctx.walletPubkey
      );
      const permissionedAccount = parsePubkeySigner(
        { pubkey: inputs.permissioned_account, isSigner: inputs.permissioned_account_is_signer },
        false,
        ctx.walletPubkey
      );
      return createCommitAndUndelegatePermissionInstruction({ authority, permissionedAccount });
    }
    case "mb_undelegate_permission": {
      const permissionedAccount = inputs.permissioned_account ? parsePubkey(inputs.permissioned_account, "permissioned_account") : null;
      const delegatedPermission = inputs.permission ? parsePubkey(inputs.permission, "permission") : permissionedAccount ? permissionPdaFromAccount(permissionedAccount) : null;
      if (!delegatedPermission) {
        throw new Error("permission or permissioned_account is required");
      }
      const validator = parsePubkey(inputs.validator ?? ctx.validator, "validator");
      const delegationBuffer = inputs.delegation_buffer ? parsePubkey(inputs.delegation_buffer, "delegation_buffer") : undelegateBufferPdaFromDelegatedAccount(delegatedPermission);
      const seeds = parseSeedArgs(inputs.pda_seeds ?? inputs.seeds);
      return createUndelegatePermissionInstruction(
        { delegatedPermission, delegationBuffer, validator },
        seeds ? { pdaSeeds: seeds } : void 0
      );
    }
    case "mb_close_permission": {
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const authority = parsePubkeySigner(
        { pubkey: inputs.authority, isSigner: inputs.authority_is_signer },
        true,
        ctx.walletPubkey
      );
      const permissionedAccount = parsePubkeySigner(
        { pubkey: inputs.permissioned_account, isSigner: inputs.permissioned_account_is_signer },
        false,
        ctx.walletPubkey
      );
      return createClosePermissionInstruction({ payer, authority, permissionedAccount });
    }
    case "flaek_create_permission": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const nameHash = inputs.name_hash ? parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash") : null;
      const permissionedAccount = resolveStatePda(programId, owner, nameHash);
      const permission = permissionPdaFromAccount(permissionedAccount);
      const payer = parsePubkey(resolveInput(inputs.payer ?? "$wallet", ctx.walletPubkey), "payer");
      const members = parseMembers(inputs.members, ctx.walletPubkey);
      const accountType = serializeAccountType(owner, nameHash);
      const membersArgs = serializeMembersArgs(members);
      const ixData = Buffer.concat([
        Buffer.from([190, 182, 26, 164, 156, 221, 8, 0]),
        accountType,
        membersArgs
      ]);
      const keys = [
        { pubkey: permissionedAccount, isWritable: false, isSigner: false },
        { pubkey: permission, isWritable: true, isSigner: false },
        { pubkey: payer, isWritable: true, isSigner: true },
        { pubkey: parsePubkey(ctx.config.permission_program_id, "permission_program_id"), isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_update_permission": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const nameHash = inputs.name_hash ? parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash") : null;
      const permissionedAccount = resolveStatePda(programId, owner, nameHash);
      const permission = permissionPdaFromAccount(permissionedAccount);
      const authority = parsePubkey(resolveInput(inputs.authority ?? "$wallet", ctx.walletPubkey), "authority");
      const members = parseMembers(inputs.members, ctx.walletPubkey);
      const accountType = serializeAccountType(owner, nameHash);
      const membersArgs = serializeMembersArgs(members);
      const ixData = Buffer.concat([
        Buffer.from([1, 120, 111, 126, 237, 61, 41, 61]),
        accountType,
        membersArgs
      ]);
      const keys = [
        { pubkey: permissionedAccount, isWritable: false, isSigner: false },
        { pubkey: permission, isWritable: true, isSigner: false },
        { pubkey: authority, isWritable: true, isSigner: true },
        { pubkey: parsePubkey(ctx.config.permission_program_id, "permission_program_id"), isWritable: false, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_commit_permission": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const nameHash = inputs.name_hash ? parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash") : null;
      const permissionedAccount = resolveStatePda(programId, owner, nameHash);
      const permission = permissionPdaFromAccount(permissionedAccount);
      const authority = parsePubkey(resolveInput(inputs.authority ?? "$wallet", ctx.walletPubkey), "authority");
      const accountType = serializeAccountType(owner, nameHash);
      const ixData = Buffer.concat([
        Buffer.from([173, 8, 171, 138, 163, 171, 62, 223]),
        accountType
      ]);
      const keys = [
        { pubkey: permissionedAccount, isWritable: false, isSigner: false },
        { pubkey: permission, isWritable: true, isSigner: false },
        { pubkey: authority, isWritable: true, isSigner: true },
        { pubkey: parsePubkey(ctx.config.permission_program_id, "permission_program_id"), isWritable: false, isSigner: false },
        { pubkey: parsePubkey(ctx.config.magic_program_id ?? "Magic11111111111111111111111111111111111111", "magic_program_id"), isWritable: false, isSigner: false },
        { pubkey: parsePubkey(ctx.config.magic_context_id ?? "MagicContext1111111111111111111111111111111", "magic_context_id"), isWritable: true, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_commit_undelegate_permission": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const nameHash = inputs.name_hash ? parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash") : null;
      const permissionedAccount = resolveStatePda(programId, owner, nameHash);
      const permission = permissionPdaFromAccount(permissionedAccount);
      const authority = parsePubkey(resolveInput(inputs.authority ?? "$wallet", ctx.walletPubkey), "authority");
      const accountType = serializeAccountType(owner, nameHash);
      const ixData = Buffer.concat([
        Buffer.from([67, 87, 223, 139, 187, 5, 93, 241]),
        accountType
      ]);
      const keys = [
        { pubkey: permissionedAccount, isWritable: false, isSigner: false },
        { pubkey: permission, isWritable: true, isSigner: false },
        { pubkey: authority, isWritable: true, isSigner: true },
        { pubkey: parsePubkey(ctx.config.permission_program_id, "permission_program_id"), isWritable: false, isSigner: false },
        { pubkey: parsePubkey(ctx.config.magic_program_id ?? "Magic11111111111111111111111111111111111111", "magic_program_id"), isWritable: false, isSigner: false },
        { pubkey: parsePubkey(ctx.config.magic_context_id ?? "MagicContext1111111111111111111111111111111", "magic_context_id"), isWritable: true, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_close_permission": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const nameHash = inputs.name_hash ? parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash") : null;
      const permissionedAccount = resolveStatePda(programId, owner, nameHash);
      const permission = permissionPdaFromAccount(permissionedAccount);
      const payer = parsePubkey(resolveInput(inputs.payer ?? "$wallet", ctx.walletPubkey), "payer");
      const authority = parsePubkey(resolveInput(inputs.authority ?? "$wallet", ctx.walletPubkey), "authority");
      const accountType = serializeAccountType(owner, nameHash);
      const ixData = Buffer.concat([
        Buffer.from([17, 241, 212, 43, 238, 201, 203, 210]),
        accountType
      ]);
      const keys = [
        { pubkey: permissionedAccount, isWritable: false, isSigner: false },
        { pubkey: permission, isWritable: true, isSigner: false },
        { pubkey: payer, isWritable: true, isSigner: true },
        { pubkey: authority, isWritable: true, isSigner: true },
        { pubkey: parsePubkey(ctx.config.permission_program_id, "permission_program_id"), isWritable: false, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "mb_delegate_pda": {
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const delegatedAccount = parsePubkey(inputs.delegated_account, "delegated_account");
      const ownerProgram = parsePubkey(inputs.owner_program, "owner_program");
      const validator = parseOptionalPubkey(inputs.validator ?? ctx.validator);
      const seeds = parseSeedArgs(inputs.seeds ?? inputs.pda_seeds);
      const commitFrequencyMs = parseOptionalNumber(inputs.commit_frequency_ms);
      return createDelegateInstruction(
        { delegatedAccount, payer, ownerProgram },
        {
          seeds,
          ...validator ? { validator } : {},
          ...commitFrequencyMs ? { commitFrequencyMs } : {}
        }
      );
    }
    case "mb_magic_commit": {
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const accounts = parsePubkeyList(inputs.accounts ?? inputs.accounts_to_commit, ctx.walletPubkey);
      return createCommitInstruction(payer, accounts);
    }
    case "mb_magic_commit_undelegate": {
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const accounts = parsePubkeyList(inputs.accounts ?? inputs.accounts_to_commit, ctx.walletPubkey);
      return createCommitAndUndelegateInstruction(payer, accounts);
    }
    case "mb_topup_escrow": {
      const escrow = parsePubkey(inputs.escrow, "escrow");
      const escrowAuthority = parsePubkey(resolveInput(inputs.escrow_authority, ctx.walletPubkey), "escrow_authority");
      const payer = parsePubkey(resolveInput(inputs.payer, ctx.walletPubkey), "payer");
      const amount = parseRequiredNumber(inputs.amount, "amount");
      const index = parseOptionalNumber(inputs.index);
      return createTopUpEscrowInstruction(escrow, escrowAuthority, payer, amount, index);
    }
    case "mb_close_escrow": {
      const escrow = parsePubkey(inputs.escrow, "escrow");
      const escrowAuthority = parsePubkey(resolveInput(inputs.escrow_authority, ctx.walletPubkey), "escrow_authority");
      const index = parseOptionalNumber(inputs.index);
      return createCloseEscrowInstruction(escrow, escrowAuthority, index);
    }
    case "mb_program_instruction": {
      const programId = parsePubkey(inputs.program_id, "program_id");
      const keys = parseAccountMetas(inputs.accounts, ctx.walletPubkey);
      const data = parseInstructionData(inputs.data);
      return new TransactionInstruction({ programId, keys, data });
    }
    case "flaek_create_state": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(
        resolveInput(inputs.owner ?? inputs.payer ?? "$wallet", ctx.walletPubkey),
        "owner"
      );
      const nameHash = parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash");
      const maxLen = parseRequiredNumber(inputs.max_len ?? inputs.maxLen, "max_len");
      const data = parseInstructionData(inputs.data ?? "");
      const [state] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)],
        programId
      );
      const ixData = Buffer.concat([
        Buffer.from([214, 211, 209, 79, 107, 105, 247, 222]),
        Buffer.from(nameHash),
        serializeU32(maxLen),
        serializeVec(data)
      ]);
      const keys = [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_update_state": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(
        resolveInput(inputs.owner ?? inputs.payer ?? "$wallet", ctx.walletPubkey),
        "owner"
      );
      const nameHash = parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash");
      const data = parseInstructionData(inputs.data ?? "");
      const [state] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)],
        programId
      );
      const ixData = Buffer.concat([
        Buffer.from([135, 112, 215, 75, 247, 185, 53, 176]),
        Buffer.from(nameHash),
        serializeVec(data)
      ]);
      const keys = [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: false, isSigner: true }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_append_state": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(
        resolveInput(inputs.owner ?? inputs.payer ?? "$wallet", ctx.walletPubkey),
        "owner"
      );
      const nameHash = parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash");
      const data = parseInstructionData(inputs.data ?? "");
      const [state] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)],
        programId
      );
      const ixData = Buffer.concat([
        Buffer.from([117, 27, 130, 11, 65, 184, 88, 92]),
        Buffer.from(nameHash),
        serializeVec(data)
      ]);
      const keys = [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: false, isSigner: true }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_close_state": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const owner = parsePubkey(
        resolveInput(inputs.owner ?? inputs.payer ?? "$wallet", ctx.walletPubkey),
        "owner"
      );
      const nameHash = parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash");
      const [state] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)],
        programId
      );
      const ixData = Buffer.concat([
        Buffer.from([25, 1, 184, 101, 200, 245, 210, 246]),
        Buffer.from(nameHash)
      ]);
      const keys = [
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: owner, isWritable: true, isSigner: true }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    case "flaek_delegate_state": {
      const programId = parsePubkey(ctx.config.flaek_program_id, "flaek_program_id");
      const delegationProgramId = parsePubkey(ctx.config.delegation_program_id, "delegation_program_id");
      const owner = parsePubkey(resolveInput(inputs.owner ?? "$wallet", ctx.walletPubkey), "owner");
      const payer = parsePubkey(
        resolveInput(inputs.payer ?? owner.toBase58(), ctx.walletPubkey),
        "payer"
      );
      const nameHash = parseHash32(inputs.name_hash ?? inputs.nameHash, "name_hash");
      const validator = parseOptionalPubkey(inputs.validator ?? ctx.validator);
      const state = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)],
        programId
      )[0];
      const buffer = PublicKey.findProgramAddressSync(
        [Buffer.from("buffer"), state.toBytes()],
        programId
      )[0];
      const delegationRecord = PublicKey.findProgramAddressSync(
        [Buffer.from("delegation"), state.toBytes()],
        delegationProgramId
      )[0];
      const delegationMetadata = PublicKey.findProgramAddressSync(
        [Buffer.from("delegation-metadata"), state.toBytes()],
        delegationProgramId
      )[0];
      const ixData = Buffer.concat([
        Buffer.from([47, 115, 98, 67, 249, 81, 123, 119]),
        Buffer.from(nameHash),
        serializeOptionPubkey(validator)
      ]);
      const keys = [
        { pubkey: buffer, isWritable: true, isSigner: false },
        { pubkey: delegationRecord, isWritable: true, isSigner: false },
        { pubkey: delegationMetadata, isWritable: true, isSigner: false },
        { pubkey: state, isWritable: true, isSigner: false },
        { pubkey: payer, isWritable: true, isSigner: true },
        { pubkey: owner, isWritable: false, isSigner: true },
        { pubkey: programId, isWritable: false, isSigner: false },
        { pubkey: delegationProgramId, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }
      ];
      return new TransactionInstruction({ programId, keys, data: ixData });
    }
    default:
      return null;
  }
}
function resolveInput(value, walletPubkey) {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "$wallet" || lower === "$payer" || lower === "$authority") {
      return walletPubkey.toBase58();
    }
  }
  return value;
}
function parsePubkey(value, label) {
  if (!value) throw new Error(`${label} is required`);
  if (value instanceof PublicKey) return value;
  return new PublicKey(value);
}
function parseOptionalPubkey(value) {
  if (!value) return void 0;
  if (value instanceof PublicKey) return value;
  return new PublicKey(value);
}
function parsePubkeySigner(value, defaultSigner, walletPubkey) {
  if (Array.isArray(value) && value.length >= 2) {
    return [parsePubkey(resolveInput(value[0], walletPubkey), "pubkey"), Boolean(value[1])];
  }
  if (value && typeof value === "object" && "pubkey" in value) {
    const pk2 = parsePubkey(resolveInput(value.pubkey, walletPubkey), "pubkey");
    const signer = Boolean(value.isSigner ?? value.signer ?? defaultSigner);
    return [pk2, signer];
  }
  const pk = parsePubkey(resolveInput(value, walletPubkey), "pubkey");
  return [pk, defaultSigner];
}
function parseMembers(value, walletPubkey) {
  if (value === void 0 || value === null) return null;
  if (!Array.isArray(value)) {
    throw new Error("members must be an array");
  }
  return value.map((member) => {
    const pubkey = parsePubkey(resolveInput(member.pubkey ?? member.key ?? member, walletPubkey), "member.pubkey");
    const flags = Number(member.flags ?? member.flag ?? 0);
    return { pubkey, flags };
  });
}
function resolveStatePda(programId, owner, nameHash) {
  return PublicKey.findProgramAddressSync(
    nameHash ? [Buffer.from("state"), owner.toBytes(), Buffer.from(nameHash)] : [Buffer.from("state"), owner.toBytes()],
    programId
  )[0];
}
function serializeAccountType(owner, nameHash) {
  if (nameHash) {
    return Buffer.concat([Buffer.from([1]), owner.toBytes(), Buffer.from(nameHash)]);
  }
  return Buffer.concat([Buffer.from([0]), owner.toBytes()]);
}
function serializeMembersArgs(members) {
  if (!members || members.length === 0) {
    return Buffer.from([0]);
  }
  const header = Buffer.alloc(1 + 4);
  header.writeUInt8(1, 0);
  header.writeUInt32LE(members.length, 1);
  const entries = members.map((member) => {
    const flags = Buffer.from([member.flags ?? 0]);
    const pubkey = parsePubkey(member.pubkey, "member.pubkey").toBytes();
    return Buffer.concat([flags, Buffer.from(pubkey)]);
  });
  return Buffer.concat([header, ...entries]);
}
function parsePubkeyList(value, walletPubkey) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("accounts list is required");
  }
  return value.map((entry) => parsePubkey(resolveInput(entry, walletPubkey), "account"));
}
function parseAccountMetas(value, walletPubkey) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") {
      return {
        pubkey: parsePubkey(resolveInput(entry, walletPubkey), "account"),
        isSigner: false,
        isWritable: false
      };
    }
    const pubkey = parsePubkey(resolveInput(entry.pubkey ?? entry.address, walletPubkey), "account");
    return {
      pubkey,
      isSigner: Boolean(entry.isSigner ?? entry.signer ?? false),
      isWritable: Boolean(entry.isWritable ?? entry.writable ?? false)
    };
  });
}
function parseInstructionData(value) {
  if (value === void 0 || value === null || value === "") return Buffer.alloc(0);
  if (typeof value !== "string") {
    if (typeof value === "number" || typeof value === "boolean") {
      return Buffer.from(new TextEncoder().encode(String(value)));
    }
    return Buffer.from(new TextEncoder().encode(JSON.stringify(value)));
  }
  if (value.startsWith("base64:")) {
    return Buffer.from(decodeBase64(value.slice(7)));
  }
  if (value.startsWith("hex:")) {
    return Buffer.from(value.slice(4), "hex");
  }
  if (isBase64(value)) {
    return Buffer.from(decodeBase64(value));
  }
  return Buffer.from(new TextEncoder().encode(value));
}
function parseRequiredNumber(value, label) {
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error(`${label} must be a number`);
  return num;
}
function parseOptionalNumber(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const num = Number(value);
  if (Number.isNaN(num)) return void 0;
  return num;
}
function parseHash32(value, label) {
  if (!value) throw new Error(`${label} is required`);
  if (value instanceof Uint8Array) {
    if (value.length !== 32) throw new Error(`${label} must be 32 bytes`);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length !== 32) throw new Error(`${label} must be 32 bytes`);
    return Uint8Array.from(value);
  }
  if (typeof value === "string") {
    if (value.startsWith("base64:")) {
      const bytes = decodeBase64(value.slice(7));
      if (bytes.length !== 32) throw new Error(`${label} must be 32 bytes`);
      return bytes;
    }
    if (value.startsWith("hex:")) {
      const bytes = Uint8Array.from(Buffer.from(value.slice(4), "hex"));
      if (bytes.length !== 32) throw new Error(`${label} must be 32 bytes`);
      return bytes;
    }
    if (/^[0-9a-fA-F]{64}$/.test(value)) {
      const bytes = Uint8Array.from(Buffer.from(value, "hex"));
      return bytes;
    }
    if (isBase64(value)) {
      const bytes = decodeBase64(value);
      if (bytes.length !== 32) throw new Error(`${label} must be 32 bytes`);
      return bytes;
    }
  }
  throw new Error(`${label} must be a 32-byte hex/base64 string`);
}
function serializeU32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}
function serializeVec(bytes) {
  return Buffer.concat([serializeU32(bytes.length), Buffer.from(bytes)]);
}
function serializeOptionPubkey(value) {
  if (!value) return Buffer.from([0]);
  return Buffer.concat([Buffer.from([1]), value.toBytes()]);
}
function parseSeedArgs(value) {
  if (!value) return void 0;
  if (!Array.isArray(value)) throw new Error("seeds must be an array");
  return value.map((entry) => {
    if (typeof entry === "string") {
      if (entry.startsWith("base64:")) {
        return decodeBase64(entry.slice(7));
      }
      if (entry.startsWith("hex:")) {
        return Uint8Array.from(Buffer.from(entry.slice(4), "hex"));
      }
      return new TextEncoder().encode(entry);
    }
    if (Array.isArray(entry)) return Uint8Array.from(entry);
    if (entry instanceof Uint8Array) return entry;
    throw new Error("seed must be string/bytes");
  });
}
function decodeBase64(value) {
  if (typeof atob === "function") {
    const bin = atob(value);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return Uint8Array.from(Buffer.from(value, "base64"));
}
function isBase64(value) {
  if (!value || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

// src/client.ts
function getDefaultBaseUrl() {
  try {
    return import.meta?.env?.VITE_API_BASE || "https://api.flaek.dev";
  } catch {
    return "https://api.flaek.dev";
  }
}
function getStoredToken() {
  try {
    return typeof localStorage === "undefined" ? void 0 : localStorage.getItem("flaek_jwt") || void 0;
  } catch {
    return void 0;
  }
}
function createFlaekClient(options = {}) {
  const baseUrl = options.baseUrl ?? getDefaultBaseUrl();
  const fetcher = options.fetch ?? fetch;
  function getAuthHeader() {
    const token = options.authToken ?? getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  async function request(path, opts = {}) {
    const headers = {
      "Content-Type": "application/json"
    };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }
    Object.assign(headers, options.headers || {});
    Object.assign(headers, opts.headers || {});
    const res = await fetcher(`${baseUrl}${path}`, {
      ...opts,
      method: opts.method || "GET",
      headers,
      credentials: "include"
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) {
      const message = body && (body.message || body.error || body.code) || res.statusText;
      throw new Error(typeof message === "string" ? message : "Request failed");
    }
    return body;
  }
  async function getMagicblockConfig() {
    return request("/v1/public/magicblock/config");
  }
  async function createJob(input) {
    const idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return request("/v1/jobs", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": idempotencyKey }
    });
  }
  async function getJob(id) {
    return request(`/v1/jobs/${id}`);
  }
  async function submitJob(id, txSignatures, result) {
    return request(`/v1/jobs/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ tx_signatures: txSignatures, result })
    });
  }
  async function completeJob(id, result) {
    return request(`/v1/jobs/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ result })
    });
  }
  async function appendJobLogs(id, logs) {
    if (!logs.length) return;
    return request(`/v1/jobs/${id}/logs`, {
      method: "POST",
      body: JSON.stringify({ logs })
    });
  }
  function createLogReporter(jobId, onLog) {
    const pending = [];
    let flushing = false;
    let scheduled = false;
    const flush = async () => {
      scheduled = false;
      if (flushing || pending.length === 0) return;
      flushing = true;
      const batch = pending.splice(0, pending.length);
      try {
        await appendJobLogs(jobId, batch);
      } catch {
      } finally {
        flushing = false;
        if (pending.length > 0 && !scheduled) {
          scheduled = true;
          Promise.resolve().then(flush);
        }
      }
    };
    const log = (message, level = "info") => {
      const entry = { message, level, ts: (/* @__PURE__ */ new Date()).toISOString() };
      pending.push(entry);
      onLog?.(message);
      if (!scheduled) {
        scheduled = true;
        Promise.resolve().then(flush);
      }
    };
    return { log, flush };
  }
  async function runJob(options2) {
    const {
      operationId,
      wallet,
      executionMode = "per",
      validator,
      verifyTee = true,
      autoComplete = true,
      context,
      callbackUrl,
      onLog
    } = options2;
    const config = await getMagicblockConfig();
    const job = await createJob({
      operation: operationId,
      execution_mode: executionMode,
      context,
      callback_url: callbackUrl
    });
    let plan = job.plan;
    if (!plan) {
      const refreshed = await getJob(job.job_id);
      plan = refreshed.plan;
    }
    if (!plan?.steps?.length) {
      throw new Error("No plan steps available");
    }
    const reporter = createLogReporter(job.job_id, onLog);
    try {
      const result = await executePlanWithWallet(
        { steps: plan.steps },
        wallet,
        config,
        {
          mode: executionMode,
          validator: validator || config.default_validator,
          verifyTee,
          onLog: (message) => reporter.log(message)
        }
      );
      await submitJob(job.job_id, result.signatures);
      if (autoComplete) {
        await completeJob(job.job_id);
      }
      await reporter.flush();
      return {
        jobId: job.job_id,
        signatures: result.signatures,
        authToken: result.authToken,
        plan
      };
    } catch (error) {
      reporter.log(error?.message || "Execution failed", "error");
      await reporter.flush();
      throw error;
    }
  }
  return {
    runJob,
    createJob,
    getJob,
    submitJob,
    completeJob,
    appendJobLogs,
    getMagicblockConfig
  };
}
async function runFlaekJob(options) {
  const client = createFlaekClient();
  return client.runJob(options);
}
export {
  createFlaekClient,
  ensureWalletConnected,
  executePlanWithWallet,
  getBrowserWallet,
  getWalletPublicKey,
  runFlaekJob
};
