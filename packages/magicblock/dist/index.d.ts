import { Transaction, PublicKey } from '@solana/web3.js';

type ExecutionPlanStep = {
    nodeId: string;
    blockId: string;
    inputs: Record<string, any>;
    dependsOn?: string[];
};
type ExecutionPlan = {
    steps: ExecutionPlanStep[];
};
type MagicblockConfig = {
    tee_rpc_url: string;
    tee_ws_url: string;
    er_rpc_url: string;
    default_validator?: string;
    permission_program_id?: string;
    delegation_program_id?: string;
    flaek_program_id?: string;
};
type WalletProvider = {
    publicKey?: {
        toBase58: () => string;
    } | string;
    isConnected?: boolean;
    connect?: () => Promise<any>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: Uint8Array) => Promise<Uint8Array | {
        signature: Uint8Array;
    }>;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction?: (transaction: Transaction, options?: any) => Promise<{
        signature: string;
    } | string>;
};
type ExecutePlanOptions = {
    mode: 'per' | 'er';
    validator?: string;
    verifyTee?: boolean;
    onLog?: (message: string) => void;
};
type ExecutePlanResult = {
    signatures: string[];
    authToken?: string;
};
declare function getBrowserWallet(): WalletProvider | null;
declare function ensureWalletConnected(wallet: WalletProvider): Promise<PublicKey>;
declare function getWalletPublicKey(wallet: WalletProvider): PublicKey;
declare function executePlanWithWallet(plan: ExecutionPlan, wallet: WalletProvider, config: MagicblockConfig, options: ExecutePlanOptions): Promise<ExecutePlanResult>;

type RunFlaekJobOptions = {
    operationId: string;
    wallet: WalletProvider;
    executionMode?: 'per' | 'er';
    validator?: string;
    verifyTee?: boolean;
    autoComplete?: boolean;
    context?: Record<string, any>;
    callbackUrl?: string;
    onLog?: (message: string) => void;
};
type FlaekClientOptions = {
    baseUrl?: string;
    authToken?: string;
    fetch?: typeof fetch;
    headers?: Record<string, string>;
};
type JobLog = {
    message: string;
    level?: 'info' | 'warn' | 'error';
    ts?: string;
};
type JobPlan = {
    steps: Array<{
        nodeId: string;
        blockId: string;
        inputs: Record<string, any>;
        dependsOn?: string[];
    }>;
};
declare function createFlaekClient(options?: FlaekClientOptions): {
    runJob: (options: RunFlaekJobOptions) => Promise<{
        jobId: string;
        signatures: string[];
        authToken: string | undefined;
        plan: JobPlan;
    }>;
    createJob: (input: {
        operation: string;
        execution_mode?: "er" | "per";
        context?: Record<string, any>;
        callback_url?: string;
    }) => Promise<{
        job_id: string;
        status: string;
        plan?: JobPlan;
    }>;
    getJob: (id: string) => Promise<{
        job_id: string;
        status: string;
        created_at: string;
        updated_at: string;
        plan?: JobPlan;
        execution_mode?: "er" | "per";
        tx_signatures?: string[];
        result?: any;
        logs?: JobLog[];
    }>;
    submitJob: (id: string, txSignatures: string[], result?: any) => Promise<{
        job_id: string;
        status: string;
    }>;
    completeJob: (id: string, result?: any) => Promise<{
        job_id: string;
        status: string;
    }>;
    appendJobLogs: (id: string, logs: JobLog[]) => Promise<{
        job_id: string;
        status: string;
    } | undefined>;
    getMagicblockConfig: () => Promise<MagicblockConfig>;
};
declare function runFlaekJob(options: RunFlaekJobOptions): Promise<{
    jobId: string;
    signatures: string[];
    authToken: string | undefined;
    plan: JobPlan;
}>;

export { type ExecutePlanOptions, type ExecutePlanResult, type ExecutionPlan, type ExecutionPlanStep, type FlaekClientOptions, type JobLog, type MagicblockConfig, type RunFlaekJobOptions, type WalletProvider, createFlaekClient, ensureWalletConnected, executePlanWithWallet, getBrowserWallet, getWalletPublicKey, runFlaekJob };
