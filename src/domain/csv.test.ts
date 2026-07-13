import { describe, expect, it } from 'vitest';
import { parsePayrollCsv } from './csv';

describe('parsePayrollCsv', () => {
  it('parses the exact payroll columns and quoted notes', () => {
    const result = parsePayrollCsv(
      'recipient,amount,note\n0x1111111111111111111111111111111111111111,12.5,"Design, July"',
    );
    expect(result).toEqual({
      entries: [{
        recipient: '0x1111111111111111111111111111111111111111',
        amount: '12.5',
        note: 'Design, July',
      }],
      errors: [],
    });
  });

  it('ignores blank lines', () => {
    const result = parsePayrollCsv(
      'recipient,amount,note\n\n0x1111111111111111111111111111111111111111,1,Ops\n',
    );
    expect(result.entries).toHaveLength(1);
  });

  it('rejects a non-exact header', () => {
    expect(parsePayrollCsv('wallet,amount,note\n0x1,1,Ops').errors[0]?.code).toBe('invalid_header');
  });

  it('reports the source row for missing required cells', () => {
    const result = parsePayrollCsv('recipient,amount,note\n0x1111111111111111111111111111111111111111,,Ops');
    expect(result.errors[0]).toEqual({ code: 'missing_cell', row: 2 });
  });

  it('rejects extra columns', () => {
    const result = parsePayrollCsv(
      'recipient,amount,note\n0x1111111111111111111111111111111111111111,1,Ops,unexpected',
    );
    expect(result.errors[0]).toEqual({ code: 'extra_column', row: 2 });
  });
});
