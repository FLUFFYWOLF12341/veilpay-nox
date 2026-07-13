import { createViemHandleClient } from '@iexec-nox/handle';
import type { Address, Hex } from 'viem';
import type { WalletClient } from 'viem';

export interface HandlePort {
  encryptInput(
    value: bigint,
    solidityType: 'uint256',
    applicationContract: Address,
  ): Promise<{ handle: Hex; handleProof: Hex }>;
  decrypt(handle: Hex): Promise<{ value: bigint; solidityType: 'uint256' }>;
}

export interface EncryptablePayrollEntry {
  recipient: Address;
  amount: bigint;
}

export interface EncryptedPayroll {
  recipients: Address[];
  handles: Hex[];
  proofs: Hex[];
}

export function createNoxClient(wallet: WalletClient): Promise<HandlePort>;
export function createNoxClient<T>(wallet: T, factory: (wallet: T) => Promise<HandlePort>): Promise<HandlePort>;
export async function createNoxClient<T>(
  wallet: T,
  factory?: (wallet: T) => Promise<HandlePort>,
): Promise<HandlePort> {
  if (factory) return factory(wallet);
  return createViemHandleClient(wallet as unknown as WalletClient) as unknown as Promise<HandlePort>;
}

export async function encryptPayroll(
  client: HandlePort,
  entries: EncryptablePayrollEntry[],
  contractAddress: Address,
): Promise<EncryptedPayroll> {
  try {
    const encrypted = await Promise.all(entries.map((entry) =>
      client.encryptInput(entry.amount, 'uint256', contractAddress)));

    return {
      recipients: entries.map((entry) => entry.recipient),
      handles: encrypted.map((item) => item.handle),
      proofs: encrypted.map((item) => item.handleProof),
    };
  } catch (error) {
    throw new Error('Payroll encryption failed', { cause: error });
  }
}

export async function decryptAllocation(client: HandlePort, handle: Hex): Promise<bigint> {
  const result = await client.decrypt(handle);
  return result.value;
}
