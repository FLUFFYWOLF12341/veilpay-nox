import { describe, expect, it } from 'vitest';
import { validatePayroll, type PayrollEntry } from './payroll';

const alice = '0x1111111111111111111111111111111111111111';
const bob = '0x2222222222222222222222222222222222222222';

describe('validatePayroll', () => {
  it('rejects an empty batch', () => {
    expect(validatePayroll([], 6).issues[0]?.code).toBe('empty_batch');
  });

  it('rejects malformed recipient addresses', () => {
    const entries: PayrollEntry[] = [{ recipient: 'not-an-address', amount: '10', note: '' }];
    expect(validatePayroll(entries, 6).issues[0]?.code).toBe('invalid_address');
  });

  it('rejects duplicate recipient addresses after normalization', () => {
    const entries: PayrollEntry[] = [
      { recipient: alice.toLowerCase(), amount: '10', note: '' },
      { recipient: alice.toUpperCase().replace('0X', '0x'), amount: '20', note: '' },
    ];
    expect(validatePayroll(entries, 6).issues.some((issue) => issue.code === 'duplicate_recipient')).toBe(true);
  });

  it.each(['0', '-1'])('rejects non-positive amount %s', (amount) => {
    const entries: PayrollEntry[] = [{ recipient: alice, amount, note: '' }];
    expect(validatePayroll(entries, 6).issues[0]?.code).toBe('invalid_amount');
  });

  it('rejects amount precision beyond token decimals', () => {
    const entries: PayrollEntry[] = [{ recipient: alice, amount: '1.0000001', note: '' }];
    expect(validatePayroll(entries, 6).issues[0]?.code).toBe('invalid_precision');
  });

  it('rejects a total above the available balance', () => {
    const entries: PayrollEntry[] = [
      { recipient: alice, amount: '10', note: '' },
      { recipient: bob, amount: '20', note: '' },
    ];
    expect(validatePayroll(entries, 6, 29_000_000n).issues.at(-1)?.code).toBe('insufficient_balance');
  });

  it('returns the bigint total for a valid batch', () => {
    const entries: PayrollEntry[] = [
      { recipient: alice, amount: '10.5', note: 'Design' },
      { recipient: bob, amount: '20', note: 'Engineering' },
    ];
    expect(validatePayroll(entries, 6)).toEqual({ issues: [], total: 30_500_000n });
  });
});
