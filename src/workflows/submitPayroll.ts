import { parseUnits, type Address, type Hash, type Hex } from 'viem';
import { createBatchCommitment } from '../domain/commitment';
import { validatePayroll, type PayrollEntry } from '../domain/payroll';
import { encryptPayroll, type HandlePort } from '../nox/noxClient';
import { submitBatch, type VeilPayPort } from '../web3/veilPayClient';

export interface SubmitPayrollInput {
  entries: PayrollEntry[];
  employer: Address;
  contractAddress: Address;
  nonce: bigint;
  handleClient: HandlePort;
  veilPayClient: VeilPayPort;
}

export interface SubmitPayrollResult {
  hash: Hash;
  blockNumber: bigint;
  commitment: Hex;
}

export async function submitPayroll(input: SubmitPayrollInput): Promise<SubmitPayrollResult> {
  const validation = validatePayroll(input.entries, 6);
  if (validation.issues.length > 0) {
    throw new Error('Payroll contains validation errors.');
  }

  const commitment = createBatchCommitment(input.employer, input.entries, input.nonce);
  const encrypted = await encryptPayroll(
    input.handleClient,
    input.entries.map((entry) => ({
      recipient: entry.recipient as Address,
      amount: parseUnits(entry.amount, 6),
    })),
    input.contractAddress,
  );
  const transaction = await submitBatch(input.veilPayClient, {
    commitment,
    recipients: encrypted.recipients,
    handles: encrypted.handles,
    proofs: encrypted.proofs,
  });

  return { ...transaction, commitment };
}
