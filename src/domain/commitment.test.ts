import { describe, expect, it } from 'vitest';
import { createBatchCommitment } from './commitment';
import type { PayrollEntry } from './payroll';

const employer = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const entries: PayrollEntry[] = [
  { recipient: '0x1111111111111111111111111111111111111111', amount: '10', note: 'Design' },
  { recipient: '0x2222222222222222222222222222222222222222', amount: '20', note: 'Engineering' },
];

describe('createBatchCommitment', () => {
  it('normalizes address case', () => {
    expect(createBatchCommitment(employer, entries, 1n)).toBe(
      createBatchCommitment(employer.toUpperCase().replace('0X', '0x'), entries, 1n),
    );
  });

  it('is independent of entry order', () => {
    expect(createBatchCommitment(employer, entries, 1n)).toBe(
      createBatchCommitment(employer, [...entries].reverse(), 1n),
    );
  });

  it('changes when the nonce changes', () => {
    expect(createBatchCommitment(employer, entries, 1n)).not.toBe(
      createBatchCommitment(employer, entries, 2n),
    );
  });

  it('returns only a fixed-size hash with no plaintext note', () => {
    const commitment = createBatchCommitment(employer, entries, 1n);
    expect(commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(commitment).not.toContain('Design');
  });
});
