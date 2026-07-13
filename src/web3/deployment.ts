import { isAddress, type Address } from 'viem';

const storageKey = 'veilpay.contractAddress.sepolia';

export interface AddressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function resolveContractAddress(
  configuredAddress: string | undefined,
  storage?: AddressStorage,
): Address | undefined {
  const storedAddress = typeof storage?.getItem === 'function' ? storage.getItem(storageKey) : null;
  const candidate = configuredAddress || storedAddress || undefined;
  return candidate && isAddress(candidate) ? candidate : undefined;
}

export function rememberContractAddress(address: Address, storage: AddressStorage): void {
  if (typeof storage.setItem !== 'function') return;
  storage.setItem(storageKey, address);
}
