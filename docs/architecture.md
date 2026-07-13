# VeilPay Architecture And Privacy Boundary

## Employer path

1. The React workspace validates recipient addresses and decimal amounts locally.
2. A deterministic Keccak commitment binds the employer, sorted payroll entries, notes, and nonce.
3. `@iexec-nox/handle` encrypts each amount as a `uint256` for the deployed VeilPay contract.
4. MetaMask broadcasts only the commitment, recipients, encrypted handles, and handle proofs.
5. `VeilPay.createBatch` validates proofs with `Nox.fromExternal`, retains contract access with `Nox.allowThis`, and grants each recipient viewer access to their own handle.

## Recipient path

1. The connected recipient reads only their allocation handle.
2. The Nox SDK verifies ACL access and requests an EIP-712 authorization to decrypt the amount off-chain.
3. The recipient submits `claim(batchId)` through MetaMask.
4. `Nox.mint` creates a confidential `vcUSD` test-token balance and encrypted total supply.
5. The contract stores replay protection and emits a claim event without an amount.

## Public information

Employer and recipient addresses, batch IDs, recipient counts, commitments, timestamps, lifecycle states, function selectors, and transaction hashes can be public. VeilPay provides confidentiality, not anonymity.

## Confidential information

Individual amounts, notes, decrypted balances, encryption material, and private keys must not appear in calldata, events, application logs, or repository files. Notes are included only inside the one-way batch commitment and are not sent as plaintext contract arguments.

## Trust assumptions

- Nox Handle Gateway and Intel TDX-backed execution follow the guarantees documented by iExec.
- MetaMask protects user signing keys.
- TLS protects plaintext inputs while they travel to the Nox gateway for encryption.
- The demo `vcUSD` token is unbacked test value and must not be described as fiat or USDC.
