export interface BlockInput {
  name: string
  type: 'pubkey' | 'string' | 'number' | 'bool' | 'json' | 'array'
  description: string
  required: boolean
  default?: any
  min?: number
  max?: number
}

export interface BlockOutput {
  name: string
  type: 'string' | 'json'
  description: string
}

export type BlockCategory = 'permission' | 'delegation' | 'magic' | 'program' | 'state'

export interface BlockDefinition {
  id: string
  name: string
  category: BlockCategory
  description: string
  inputs: BlockInput[]
  outputs: BlockOutput[]
  icon?: string
  color?: string
  tags?: string[]
  examples?: any
}

export const BLOCKS_REGISTRY: BlockDefinition[] = [
  {
    id: 'flaek_create_state',
    name: 'Create State',
    category: 'state',
    description: 'Create a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name',
        required: true,
      },
      { name: 'max_len', type: 'number', description: 'Max bytes for state data', required: true },
      {
        name: 'data',
        type: 'string',
        description: 'Initial data (utf8/base64/hex)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Database',
    color: '#38BDF8',
    tags: ['state', 'flaek'],
  },
  {
    id: 'flaek_update_state',
    name: 'Update State',
    category: 'state',
    description: 'Overwrite data for a Flaek state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name',
        required: true,
      },
      { name: 'data', type: 'string', description: 'New data (utf8/base64/hex)', required: true },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'PenLine',
    color: '#22C55E',
    tags: ['state', 'flaek'],
  },
  {
    id: 'flaek_append_state',
    name: 'Append State',
    category: 'state',
    description: 'Append bytes to a Flaek state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name',
        required: true,
      },
      {
        name: 'data',
        type: 'string',
        description: 'Data to append (utf8/base64/hex)',
        required: true,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Plus',
    color: '#F97316',
    tags: ['state', 'flaek'],
  },
  {
    id: 'flaek_close_state',
    name: 'Close State',
    category: 'state',
    description: 'Close a Flaek state PDA and reclaim rent',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name',
        required: true,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Trash2',
    color: '#EF4444',
    tags: ['state', 'flaek'],
  },
  {
    id: 'flaek_delegate_state',
    name: 'Delegate State',
    category: 'state',
    description: 'Delegate Flaek state PDA to ER/PER',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'payer',
        type: 'pubkey',
        description: 'Fee payer (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name',
        required: true,
      },
      {
        name: 'validator',
        type: 'pubkey',
        description: 'ER validator public key',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'ShieldCheck',
    color: '#A855F7',
    tags: ['state', 'flaek', 'delegation'],
  },
  {
    id: 'flaek_create_permission',
    name: 'Create Permission (Flaek)',
    category: 'permission',
    description: 'Create a Permission account for a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name (optional for static state)',
        required: false,
      },
      {
        name: 'payer',
        type: 'pubkey',
        description: 'Fee payer (defaults to wallet)',
        required: false,
      },
      {
        name: 'members',
        type: 'json',
        description: 'Members array with flags and pubkeys',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Key',
    color: '#0EA5E9',
    tags: ['permission', 'flaek'],
  },
  {
    id: 'flaek_update_permission',
    name: 'Update Permission (Flaek)',
    category: 'permission',
    description: 'Update permission members for a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name (optional for static state)',
        required: false,
      },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority signer (defaults to wallet)',
        required: false,
      },
      {
        name: 'members',
        type: 'json',
        description: 'Members array with flags and pubkeys',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Shield',
    color: '#22C55E',
    tags: ['permission', 'flaek'],
  },
  {
    id: 'flaek_commit_permission',
    name: 'Commit Permission (Flaek)',
    category: 'permission',
    description: 'Commit permission state to base for a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name (optional for static state)',
        required: false,
      },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority signer (defaults to wallet)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'CheckCircle',
    color: '#14B8A6',
    tags: ['permission', 'flaek', 'magic'],
  },
  {
    id: 'flaek_commit_undelegate_permission',
    name: 'Commit + Undelegate Permission (Flaek)',
    category: 'permission',
    description: 'Commit permission state and undelegate for a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name (optional for static state)',
        required: false,
      },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority signer (defaults to wallet)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'CheckCircle2',
    color: '#0EA5E9',
    tags: ['permission', 'flaek', 'magic'],
  },
  {
    id: 'flaek_close_permission',
    name: 'Close Permission (Flaek)',
    category: 'permission',
    description: 'Close permission account for a Flaek-owned state PDA',
    inputs: [
      {
        name: 'owner',
        type: 'pubkey',
        description: 'State owner (defaults to wallet)',
        required: false,
      },
      {
        name: 'name_hash',
        type: 'string',
        description: '32-byte hash (hex/base64) of state name (optional for static state)',
        required: false,
      },
      {
        name: 'payer',
        type: 'pubkey',
        description: 'Fee payer (defaults to wallet)',
        required: false,
      },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority signer (defaults to wallet)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'XCircle',
    color: '#EF4444',
    tags: ['permission', 'flaek'],
  },
  {
    id: 'mb_create_permission',
    name: 'Create Permission',
    category: 'permission',
    description: 'Create a Permission account for a permissioned account',
    inputs: [
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Account to permission',
        required: true,
      },
      {
        name: 'permission',
        type: 'pubkey',
        description: 'Permission account PDA or keypair',
        required: false,
      },
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      {
        name: 'members',
        type: 'json',
        description: 'Members array with flags and pubkeys',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Key',
    color: '#0EA5E9',
    tags: ['permission', 'access-control'],
  },
  {
    id: 'mb_delegate_permission',
    name: 'Delegate Permission',
    category: 'permission',
    description: 'Delegate permission and permissioned account to PER validator',
    inputs: [
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority in permission members',
        required: true,
      },
      {
        name: 'authority_is_signer',
        type: 'bool',
        description: 'Whether authority signs',
        required: false,
      },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Account to permission',
        required: true,
      },
      {
        name: 'permissioned_account_is_signer',
        type: 'bool',
        description: 'Whether permissioned account signs',
        required: false,
      },
      {
        name: 'permission',
        type: 'pubkey',
        description: 'Permission account (optional)',
        required: false,
      },
      {
        name: 'owner_program',
        type: 'pubkey',
        description: 'Permission program ID',
        required: true,
      },
      {
        name: 'validator',
        type: 'pubkey',
        description: 'ER validator public key',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Shield',
    color: '#22C55E',
    tags: ['permission', 'delegation'],
  },
  {
    id: 'mb_update_permission',
    name: 'Update Permission',
    category: 'permission',
    description: 'Update members or make permissioned account visible in PER',
    inputs: [
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority in permission members',
        required: true,
      },
      {
        name: 'authority_is_signer',
        type: 'bool',
        description: 'Whether authority signs',
        required: false,
      },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Account to permission',
        required: true,
      },
      {
        name: 'permissioned_account_is_signer',
        type: 'bool',
        description: 'Whether permissioned account signs',
        required: false,
      },
      {
        name: 'permission',
        type: 'pubkey',
        description: 'Permission account (optional)',
        required: false,
      },
      {
        name: 'members',
        type: 'json',
        description: 'New members array (or empty)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Users',
    color: '#F59E0B',
    tags: ['permission', 'update'],
  },
  {
    id: 'mb_commit_permission',
    name: 'Commit Permission',
    category: 'permission',
    description: 'Commit permissioned state to L1 without undelegation',
    inputs: [
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority in permission members',
        required: true,
      },
      {
        name: 'authority_is_signer',
        type: 'bool',
        description: 'Whether authority signs',
        required: false,
      },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Permissioned account',
        required: true,
      },
      {
        name: 'permissioned_account_is_signer',
        type: 'bool',
        description: 'Whether permissioned account signs',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Upload',
    color: '#6366F1',
    tags: ['permission', 'commit'],
  },
  {
    id: 'mb_commit_undelegate_permission',
    name: 'Commit & Undelegate',
    category: 'permission',
    description: 'Commit state and undelegate permission to Solana L1',
    inputs: [
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority in permission members',
        required: true,
      },
      {
        name: 'authority_is_signer',
        type: 'bool',
        description: 'Whether authority signs',
        required: false,
      },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Account to permission',
        required: true,
      },
      { name: 'permission', type: 'pubkey', description: 'Permission account', required: false },
      {
        name: 'permissioned_account_is_signer',
        type: 'bool',
        description: 'Whether permissioned account signs',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'CheckCircle',
    color: '#8B5CF6',
    tags: ['permission', 'commit'],
  },
  {
    id: 'mb_undelegate_permission',
    name: 'Undelegate Permission',
    category: 'permission',
    description: 'Undelegate a permission PDA back to L1',
    inputs: [
      { name: 'permission', type: 'pubkey', description: 'Permission PDA', required: false },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Permissioned account (to derive PDA)',
        required: false,
      },
      {
        name: 'delegation_buffer',
        type: 'pubkey',
        description: 'Delegation buffer PDA (optional)',
        required: false,
      },
      { name: 'validator', type: 'pubkey', description: 'ER validator public key', required: true },
      {
        name: 'pda_seeds',
        type: 'array',
        description: 'Optional PDA seeds for undelegation',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'CornerDownLeft',
    color: '#A855F7',
    tags: ['permission', 'undelegate'],
  },
  {
    id: 'mb_close_permission',
    name: 'Close Permission',
    category: 'permission',
    description: 'Close permission account and reclaim deposit',
    inputs: [
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      {
        name: 'authority',
        type: 'pubkey',
        description: 'Authority in permission members',
        required: true,
      },
      {
        name: 'authority_is_signer',
        type: 'bool',
        description: 'Whether authority signs',
        required: false,
      },
      {
        name: 'permissioned_account',
        type: 'pubkey',
        description: 'Account to permission',
        required: true,
      },
      { name: 'permission', type: 'pubkey', description: 'Permission account', required: false },
      {
        name: 'permissioned_account_is_signer',
        type: 'bool',
        description: 'Whether permissioned account signs',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'XCircle',
    color: '#EF4444',
    tags: ['permission', 'close'],
  },
  {
    id: 'mb_delegate_pda',
    name: 'Delegate Account',
    category: 'delegation',
    description: 'Delegate an account to ER/PER using the delegation program',
    inputs: [
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      {
        name: 'delegated_account',
        type: 'pubkey',
        description: 'Account to delegate',
        required: true,
      },
      {
        name: 'owner_program',
        type: 'pubkey',
        description: 'Owner program of the delegated account',
        required: true,
      },
      {
        name: 'validator',
        type: 'pubkey',
        description: 'ER validator public key',
        required: false,
      },
      {
        name: 'commit_frequency_ms',
        type: 'number',
        description: 'Commit frequency in ms',
        required: false,
      },
      {
        name: 'seeds',
        type: 'array',
        description: 'Optional PDA seeds (utf8/base64)',
        required: false,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'ArrowRightCircle',
    color: '#06B6D4',
    tags: ['delegation', 'delegate'],
  },
  {
    id: 'mb_topup_escrow',
    name: 'Top-up Ephemeral Balance',
    category: 'delegation',
    description: 'Top up an ephemeral balance escrow for ER',
    inputs: [
      { name: 'escrow', type: 'pubkey', description: 'Escrow account', required: true },
      { name: 'escrow_authority', type: 'pubkey', description: 'Escrow authority', required: true },
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      { name: 'amount', type: 'number', description: 'Lamports to top up', required: true },
      { name: 'index', type: 'number', description: 'Escrow index (optional)', required: false },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Coins',
    color: '#22C55E',
    tags: ['delegation', 'balance'],
  },
  {
    id: 'mb_close_escrow',
    name: 'Close Ephemeral Balance',
    category: 'delegation',
    description: 'Close an ephemeral balance escrow and reclaim funds',
    inputs: [
      { name: 'escrow', type: 'pubkey', description: 'Escrow account', required: true },
      { name: 'escrow_authority', type: 'pubkey', description: 'Escrow authority', required: true },
      { name: 'index', type: 'number', description: 'Escrow index (optional)', required: false },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Wallet',
    color: '#EF4444',
    tags: ['delegation', 'balance'],
  },
  {
    id: 'mb_magic_commit',
    name: 'Magic Commit',
    category: 'magic',
    description: 'Schedule commit for delegated accounts via Magic Program',
    inputs: [
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      { name: 'accounts', type: 'array', description: 'Accounts to commit', required: true },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Sparkles',
    color: '#F97316',
    tags: ['magic', 'commit'],
  },
  {
    id: 'mb_magic_commit_undelegate',
    name: 'Magic Commit & Undelegate',
    category: 'magic',
    description: 'Schedule commit and undelegate via Magic Program',
    inputs: [
      { name: 'payer', type: 'pubkey', description: 'Fee payer', required: true },
      {
        name: 'accounts',
        type: 'array',
        description: 'Accounts to commit & undelegate',
        required: true,
      },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Sparkles',
    color: '#FB923C',
    tags: ['magic', 'commit'],
  },
  {
    id: 'mb_program_instruction',
    name: 'Program Instruction',
    category: 'program',
    description: 'Call a custom program instruction (user-provided program)',
    inputs: [
      { name: 'program_id', type: 'pubkey', description: 'Program ID', required: true },
      { name: 'accounts', type: 'json', description: 'Account metas and signers', required: true },
      { name: 'data', type: 'string', description: 'Instruction data (base64)', required: true },
    ],
    outputs: [{ name: 'tx', type: 'string', description: 'Transaction signature' }],
    icon: 'Code',
    color: '#64748B',
    tags: ['program', 'custom'],
  },
]

export function getBlockById(id: string) {
  return BLOCKS_REGISTRY.find((b) => b.id === id)
}

export function getBlocksByCategory(category: BlockCategory) {
  return BLOCKS_REGISTRY.filter((b) => b.category === category)
}

export function searchBlocks(query: string) {
  const q = query.toLowerCase()
  return BLOCKS_REGISTRY.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.tags?.some((t) => t.toLowerCase().includes(q)),
  )
}
