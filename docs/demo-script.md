# VeilPay Demo Script (3:30 target)

## 0:00-0:30 - Problem

Public blockchains expose payroll amounts, creating compensation, security, and negotiation risks. VeilPay gives teams a familiar batch-payroll workflow while keeping individual allocations confidential.

## 0:30-1:15 - Employer workflow

Connect MetaMask on Sepolia. If this browser has no saved deployment, deploy VeilPay with one MetaMask transaction. Import `examples/payroll.csv`, replace the sample addresses with two controlled test accounts, and show validation, total, and privacy receipt.

## 1:15-2:05 - Nox integration

Submit the batch. Explain that `@iexec-nox/handle` encrypts each `uint256` for the VeilPay contract and sends only handles and proofs. Show `Nox.fromExternal`, `Nox.allowThis`, and recipient-specific `Nox.allow` in the contract.

## 2:05-2:45 - Recipient claim

Switch MetaMask to a recipient account. Open Claim Payment, decrypt the authorized allocation with a gasless signature, and submit the one-time claim. Show the resulting confidential `vcUSD` test-token balance and attempt a second claim to demonstrate replay protection.

## 2:45-3:20 - Public verification

Open the Sepolia transaction in a block explorer. Show the employer, commitment, status, and recipient address, then confirm that neither salary amount nor note appears in events. Explain that encrypted handles and proofs appear in calldata instead of plaintext amounts.

## 3:20-3:30 - Close

VeilPay brings private, verifiable payroll to standard Ethereum wallets without sacrificing composability.
