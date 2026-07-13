import { describe, expect, it, vi } from 'vitest';
import { rememberContractAddress, resolveContractAddress } from './deployment';

const address = '0x1111111111111111111111111111111111111111';

describe('deployment address persistence', () => {
  it('prefers a configured deployment over browser storage', () => {
    const storage = { getItem: vi.fn(() => '0x2222222222222222222222222222222222222222'), setItem: vi.fn() };
    expect(resolveContractAddress(address, storage)).toBe(address);
  });

  it('uses a valid browser deployment and ignores malformed values', () => {
    expect(resolveContractAddress(undefined, { getItem: () => address, setItem: vi.fn() })).toBe(address);
    expect(resolveContractAddress(undefined, { getItem: () => 'broken', setItem: vi.fn() })).toBeUndefined();
  });

  it('stores a successful deployment under the Sepolia key', () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    rememberContractAddress(address, storage);
    expect(storage.setItem).toHaveBeenCalledWith('veilpay.contractAddress.sepolia', address);
  });
});
