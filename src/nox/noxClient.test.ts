import { describe, expect, it, vi } from 'vitest';
import { createNoxClient, encryptPayroll, type HandlePort } from './noxClient';

const contract = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('encryptPayroll', () => {
  it('encrypts every salary for the payroll contract', async () => {
    const encryptInput = vi.fn()
      .mockResolvedValueOnce({ handle: `0x${'11'.repeat(32)}`, handleProof: '0x01' })
      .mockResolvedValueOnce({ handle: `0x${'22'.repeat(32)}`, handleProof: '0x02' });
    const client: HandlePort = { encryptInput, decrypt: vi.fn() };

    const result = await encryptPayroll(client, [
      { recipient: '0x1111111111111111111111111111111111111111', amount: 10_000_000n },
      { recipient: '0x2222222222222222222222222222222222222222', amount: 20_000_000n },
    ], contract);

    expect(encryptInput).toHaveBeenNthCalledWith(1, 10_000_000n, 'uint256', contract);
    expect(encryptInput).toHaveBeenNthCalledWith(2, 20_000_000n, 'uint256', contract);
    expect(result.proofs).toEqual(['0x01', '0x02']);
  });

  it('fails closed when any salary cannot be encrypted', async () => {
    const client: HandlePort = {
      encryptInput: vi.fn().mockRejectedValue(new Error('gateway offline')),
      decrypt: vi.fn(),
    };

    await expect(encryptPayroll(client, [
      { recipient: '0x1111111111111111111111111111111111111111', amount: 1n },
    ], contract)).rejects.toThrow('Payroll encryption failed');
  });
});

describe('createNoxClient', () => {
  it('creates the official handle client from the connected Viem wallet', async () => {
    const wallet = { account: '0x1' };
    const handleClient: HandlePort = { encryptInput: vi.fn(), decrypt: vi.fn() };
    const factory = vi.fn().mockResolvedValue(handleClient);

    await expect(createNoxClient(wallet, factory)).resolves.toBe(handleClient);
    expect(factory).toHaveBeenCalledWith(wallet);
  });
});
