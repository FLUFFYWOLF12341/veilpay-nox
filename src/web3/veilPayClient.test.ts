import { describe, expect, it, vi } from 'vitest';
import { assertSepolia, normalizeTransactionError, submitBatch, type VeilPayPort } from './veilPayClient';

describe('assertSepolia', () => {
  it('rejects any chain other than Ethereum Sepolia', () => {
    expect(() => assertSepolia(1)).toThrow('Switch MetaMask to Ethereum Sepolia.');
  });

  it('accepts Ethereum Sepolia', () => {
    expect(() => assertSepolia(11155111)).not.toThrow();
  });
});

describe('normalizeTransactionError', () => {
  it.each([
    [{ code: 4001 }, 'Signature request was declined.'],
    [{ message: 'insufficient funds for gas' }, 'Not enough Sepolia ETH for gas.'],
    [{ message: 'execution reverted: AlreadyClaimed' }, 'This payment was already claimed.'],
    [{ message: 'execution reverted: BatchNotActive' }, 'This payroll batch is no longer active.'],
  ])('normalizes wallet and contract errors', (error, expected) => {
    expect(normalizeTransactionError(error).message).toBe(expected);
  });
});

describe('submitBatch', () => {
  it('writes the encrypted batch and waits for confirmation', async () => {
    const port: VeilPayPort = {
      writeCreateBatch: vi.fn().mockResolvedValue('0xabc'),
      waitForReceipt: vi.fn().mockResolvedValue({ status: 'success', blockNumber: 42n }),
    };
    const request = {
      commitment: `0x${'11'.repeat(32)}` as const,
      recipients: ['0x1111111111111111111111111111111111111111'] as const,
      handles: [`0x${'22'.repeat(32)}`] as const,
      proofs: ['0x01'] as const,
    };

    const result = await submitBatch(port, request);

    expect(port.writeCreateBatch).toHaveBeenCalledWith(request);
    expect(port.waitForReceipt).toHaveBeenCalledWith('0xabc');
    expect(result).toEqual({ hash: '0xabc', blockNumber: 42n });
  });

  it('rejects a reverted receipt', async () => {
    const port: VeilPayPort = {
      writeCreateBatch: vi.fn().mockResolvedValue('0xabc'),
      waitForReceipt: vi.fn().mockResolvedValue({ status: 'reverted', blockNumber: 42n }),
    };

    await expect(submitBatch(port, {
      commitment: `0x${'11'.repeat(32)}`,
      recipients: [], handles: [], proofs: [],
    })).rejects.toThrow('Transaction reverted on Sepolia.');
  });
});
