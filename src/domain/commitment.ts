import { keccak256, stringToHex, type Hex } from 'viem';
import type { PayrollEntry } from './payroll';

export function createBatchCommitment(
  employer: string,
  entries: PayrollEntry[],
  nonce: bigint,
): Hex {
  const canonicalEntries = entries
    .map((entry) => ({
      recipient: entry.recipient.toLowerCase(),
      amount: entry.amount,
      note: entry.note,
    }))
    .sort((left, right) => left.recipient.localeCompare(right.recipient));

  return keccak256(stringToHex(JSON.stringify({
    employer: employer.toLowerCase(),
    nonce: nonce.toString(),
    entries: canonicalEntries,
  })));
}
