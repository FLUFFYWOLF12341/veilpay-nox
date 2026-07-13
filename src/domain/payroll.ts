import { isAddress, parseUnits } from 'viem';

export interface PayrollEntry {
  recipient: string;
  amount: string;
  note: string;
}

export type PayrollIssueCode =
  | 'empty_batch'
  | 'invalid_address'
  | 'duplicate_recipient'
  | 'invalid_amount'
  | 'invalid_precision'
  | 'insufficient_balance';

export interface PayrollIssue {
  code: PayrollIssueCode;
  row?: number;
}

export interface PayrollValidation {
  issues: PayrollIssue[];
  total: bigint;
}

export function validatePayroll(
  entries: PayrollEntry[],
  tokenDecimals: number,
  availableBalance?: bigint,
): PayrollValidation {
  if (entries.length === 0) {
    return { issues: [{ code: 'empty_batch' }], total: 0n };
  }

  const issues: PayrollIssue[] = [];
  const recipients = new Set<string>();
  let total = 0n;

  entries.forEach((entry, row) => {
    const normalizedRecipient = entry.recipient.toLowerCase();

    if (!isAddress(entry.recipient)) {
      issues.push({ code: 'invalid_address', row });
    } else if (recipients.has(normalizedRecipient)) {
      issues.push({ code: 'duplicate_recipient', row });
    } else {
      recipients.add(normalizedRecipient);
    }

    if (!/^\d+(?:\.\d+)?$/.test(entry.amount) || Number(entry.amount) <= 0) {
      issues.push({ code: 'invalid_amount', row });
      return;
    }

    const fractionalDigits = entry.amount.split('.')[1]?.length ?? 0;
    if (fractionalDigits > tokenDecimals) {
      issues.push({ code: 'invalid_precision', row });
      return;
    }

    total += parseUnits(entry.amount, tokenDecimals);
  });

  if (availableBalance !== undefined && total > availableBalance) {
    issues.push({ code: 'insufficient_balance' });
  }

  return { issues, total };
}
