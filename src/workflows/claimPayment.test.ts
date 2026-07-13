import { describe, expect, it, vi } from 'vitest';
import type { HandlePort } from '../nox/noxClient';
import { claimPayment, type RecipientPort } from './claimPayment';

describe('claimPayment', () => {
  it('decrypts the authorized allocation before claiming it once', async () => {
    const order: string[] = [];
    const recipientPort: RecipientPort = {
      hasClaimed: vi.fn().mockResolvedValue(false),
      getAllocation: vi.fn(async () => {
        order.push('read');
        return `0x${'11'.repeat(32)}` as const;
      }),
      claim: vi.fn(async () => {
        order.push('claim');
        return '0xabc' as const;
      }),
      waitForReceipt: vi.fn().mockResolvedValue({ status: 'success', blockNumber: 43n }),
    };
    const handleClient: HandlePort = {
      encryptInput: vi.fn(),
      decrypt: vi.fn(async () => {
        order.push('decrypt');
        return { value: 12_500_000n, solidityType: 'uint256' as const };
      }),
    };

    const result = await claimPayment(7n, recipientPort, handleClient);

    expect(order).toEqual(['read', 'decrypt', 'claim']);
    expect(result).toEqual({ amount: 12_500_000n, hash: '0xabc', blockNumber: 43n });
  });

  it('stops before decryption when the payment was already claimed', async () => {
    const recipientPort: RecipientPort = {
      hasClaimed: vi.fn().mockResolvedValue(true),
      getAllocation: vi.fn(), claim: vi.fn(), waitForReceipt: vi.fn(),
    };
    const handleClient: HandlePort = { encryptInput: vi.fn(), decrypt: vi.fn() };

    await expect(claimPayment(7n, recipientPort, handleClient)).rejects.toThrow('This payment was already claimed.');
    expect(handleClient.decrypt).not.toHaveBeenCalled();
  });
});
