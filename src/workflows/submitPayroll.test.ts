import { describe, expect, it, vi } from 'vitest';
import type { HandlePort } from '../nox/noxClient';
import type { VeilPayPort } from '../web3/veilPayClient';
import { submitPayroll } from './submitPayroll';

describe('submitPayroll', () => {
  it('encrypts every validated salary before writing the batch', async () => {
    const order: string[] = [];
    const handleClient: HandlePort = {
      encryptInput: vi.fn(async () => {
        order.push('encrypt');
        return { handle: `0x${'22'.repeat(32)}` as const, handleProof: '0x01' as const };
      }),
      decrypt: vi.fn(),
    };
    const veilPayClient: VeilPayPort = {
      writeCreateBatch: vi.fn(async () => {
        order.push('write');
        return '0xabc' as const;
      }),
      waitForReceipt: vi.fn().mockResolvedValue({ status: 'success', blockNumber: 42n }),
    };

    const result = await submitPayroll({
      entries: [{
        recipient: '0x1111111111111111111111111111111111111111',
        amount: '12.5',
        note: 'July design',
      }],
      employer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      contractAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      nonce: 1n,
      handleClient,
      veilPayClient,
    });

    expect(order).toEqual(['encrypt', 'write']);
    expect(result.hash).toBe('0xabc');
    expect(result.commitment).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('refuses to encrypt an invalid payroll', async () => {
    const handleClient: HandlePort = { encryptInput: vi.fn(), decrypt: vi.fn() };
    const veilPayClient: VeilPayPort = {
      writeCreateBatch: vi.fn(), waitForReceipt: vi.fn(),
    };

    await expect(submitPayroll({
      entries: [{ recipient: 'bad', amount: '0', note: '' }],
      employer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      contractAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      nonce: 1n,
      handleClient,
      veilPayClient,
    })).rejects.toThrow('Payroll contains validation errors.');
    expect(handleClient.encryptInput).not.toHaveBeenCalled();
  });
});
