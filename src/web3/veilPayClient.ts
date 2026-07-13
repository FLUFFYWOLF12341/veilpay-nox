import {
  createPublicClient,
  createWalletClient,
  custom,
  type Address,
  type EIP1193Provider,
  type Hash,
  type Hex,
} from 'viem';
import { veilPayChain, veilPayChainId } from './chains';
import { veilPayAbi } from './contract';
import type { RecipientPort } from '../workflows/claimPayment';

export interface EncryptedBatchRequest {
  commitment: Hex;
  recipients: readonly Address[];
  handles: readonly Hex[];
  proofs: readonly Hex[];
}

export interface VeilPayPort {
  writeCreateBatch(request: EncryptedBatchRequest): Promise<Hash>;
  waitForReceipt(hash: Hash): Promise<{ status: 'success' | 'reverted'; blockNumber: bigint }>;
}

export function assertSepolia(chainId: number): void {
  if (chainId !== veilPayChainId) {
    throw new Error('Switch MetaMask to Ethereum Sepolia.');
  }
}

export function normalizeTransactionError(error: unknown): Error {
  const candidate = error as { code?: number; message?: string; shortMessage?: string };
  const message = `${candidate.shortMessage ?? ''} ${candidate.message ?? ''}`.toLowerCase();
  if (candidate.code === 4001 || message.includes('user rejected')) {
    return new Error('Signature request was declined.');
  }
  if (message.includes('insufficient funds')) {
    return new Error('Not enough Sepolia ETH for gas.');
  }
  if (message.includes('alreadyclaimed')) {
    return new Error('This payment was already claimed.');
  }
  if (message.includes('batchnotactive')) {
    return new Error('This payroll batch is no longer active.');
  }
  return new Error(candidate.shortMessage ?? candidate.message ?? 'Transaction failed.');
}

export async function submitBatch(
  port: VeilPayPort,
  request: EncryptedBatchRequest,
): Promise<{ hash: Hash; blockNumber: bigint }> {
  const hash = await port.writeCreateBatch(request);
  const receipt = await port.waitForReceipt(hash);
  if (receipt.status !== 'success') {
    throw new Error('Transaction reverted on Sepolia.');
  }
  return { hash, blockNumber: receipt.blockNumber };
}

export async function createVeilPayClient(
  provider: EIP1193Provider,
  contractAddress: Address,
): Promise<VeilPayPort> {
  const transport = custom(provider);
  const walletClient = createWalletClient({ chain: veilPayChain, transport });
  const publicClient = createPublicClient({ chain: veilPayChain, transport });
  const chainId = await walletClient.getChainId();
  assertSepolia(chainId);
  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('Connect MetaMask before submitting payroll.');

  return {
    async writeCreateBatch(request) {
      try {
        return await walletClient.writeContract({
          address: contractAddress,
          abi: veilPayAbi,
          functionName: 'createBatch',
          args: [request.commitment, [...request.recipients], [...request.handles], [...request.proofs]],
          account,
        });
      } catch (error) {
        throw normalizeTransactionError(error);
      }
    },
    async waitForReceipt(hash) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return { status: receipt.status, blockNumber: receipt.blockNumber };
    },
  };
}

export async function createRecipientClient(
  provider: EIP1193Provider,
  contractAddress: Address,
  recipient: Address,
): Promise<RecipientPort> {
  const transport = custom(provider);
  const walletClient = createWalletClient({ chain: veilPayChain, transport, account: recipient });
  const publicClient = createPublicClient({ chain: veilPayChain, transport });
  assertSepolia(await walletClient.getChainId());

  return {
    hasClaimed(batchId) {
      return publicClient.readContract({
        address: contractAddress, abi: veilPayAbi, functionName: 'hasClaimed', args: [batchId, recipient],
      });
    },
    getAllocation(batchId) {
      return publicClient.readContract({
        address: contractAddress, abi: veilPayAbi, functionName: 'getAllocation', args: [batchId, recipient], account: recipient,
      });
    },
    async claim(batchId) {
      try {
        return await walletClient.writeContract({
          address: contractAddress, abi: veilPayAbi, functionName: 'claim', args: [batchId], account: recipient,
        });
      } catch (error) {
        throw normalizeTransactionError(error);
      }
    },
    async waitForReceipt(hash) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return { status: receipt.status, blockNumber: receipt.blockNumber };
    },
  };
}
