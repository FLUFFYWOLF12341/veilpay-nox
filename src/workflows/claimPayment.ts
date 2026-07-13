import type { Hash, Hex } from 'viem';
import { decryptAllocation, type HandlePort } from '../nox/noxClient';

export interface RecipientPort {
  hasClaimed(batchId: bigint): Promise<boolean>;
  getAllocation(batchId: bigint): Promise<Hex>;
  claim(batchId: bigint): Promise<Hash>;
  waitForReceipt(hash: Hash): Promise<{ status: 'success' | 'reverted'; blockNumber: bigint }>;
}

export async function claimPayment(
  batchId: bigint,
  recipientPort: RecipientPort,
  handleClient: HandlePort,
): Promise<{ amount: bigint; hash: Hash; blockNumber: bigint }> {
  if (await recipientPort.hasClaimed(batchId)) {
    throw new Error('This payment was already claimed.');
  }
  const handle = await recipientPort.getAllocation(batchId);
  const amount = await decryptAllocation(handleClient, handle);
  const hash = await recipientPort.claim(batchId);
  const receipt = await recipientPort.waitForReceipt(hash);
  if (receipt.status !== 'success') throw new Error('Claim transaction reverted on Sepolia.');
  return { amount, hash, blockNumber: receipt.blockNumber };
}
