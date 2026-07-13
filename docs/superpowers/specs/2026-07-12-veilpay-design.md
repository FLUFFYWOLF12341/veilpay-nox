# VeilPay Design Specification

## Purpose

VeilPay is a confidential batch-payroll dApp for small teams and DAOs. An employer creates a payroll batch with recipient addresses, amounts, and optional notes; iExec Nox processes the confidential inputs; recipients claim their own payment on Ethereum Sepolia without exposing individual compensation publicly.

The hackathon build focuses on one-time batch payroll. Recurring payroll, streaming payments, Safe multisig integration, fiat on-ramps, and production mainnet deployment are outside the first release.

## Success Criteria

The demonstration must use two MetaMask accounts and complete this flow end to end:

1. An employer connects MetaMask on Ethereum Sepolia.
2. The employer enters or imports recipients and amounts.
3. VeilPay validates and encrypts the payroll details before submission.
4. Nox processes the confidential payroll operation.
5. Sepolia records the batch state and non-reversible commitments without publishing individual amounts or notes.
6. A recipient connects MetaMask, sees only their own entitlement, and claims it once.
7. A public block explorer cannot reveal any individual salary in plaintext.

The product must use real contract interactions and testnet assets. The submission must not depend on mock API responses or hard-coded transaction results.

## User Experience

The first screen is the application workspace, not a marketing page. It has four task-oriented views:

- **Create batch:** enter rows manually or import CSV data, then show recipient count and total funding required.
- **Encrypt and submit:** review validation results, encrypt confidential fields, switch to Sepolia if needed, and sign the transaction in MetaMask.
- **Batch activity:** show batch identifier, lifecycle state, transaction link, creation time, recipient count, and public commitment.
- **Claim payment:** detect the connected recipient, request only that recipient's private entitlement, and submit a one-time claim.

The interface uses a compact operational layout, clear status indicators, accessible form labels, and explicit transaction progress. It never displays another recipient's amount to a connected employee.

## Architecture

### Web Application

A React and TypeScript application owns wallet connection, network checks, CSV parsing, local validation, encryption orchestration, contract calls, and transaction feedback. Domain logic remains separate from React components so it can be unit tested without a browser.

### Confidential Payroll Service

A focused Nox adapter wraps the official Nox client interfaces selected during implementation. It accepts validated payroll entries, produces the confidential request required by Nox, submits the operation, and resolves the connected recipient's entitlement. No component calls Nox packages directly.

The adapter must fail closed: if encryption or Nox submission fails, VeilPay must not submit plaintext payroll data or silently fall back to a transparent transaction.

### Smart Contracts

The Sepolia contracts manage employer-owned batches, public commitments, funding state, claim authorization, and replay protection. Contract storage and events must not contain plaintext individual amounts or notes. Only the batch owner can create or cancel a batch, and each authorized recipient can claim at most once.

The exact confidential contract primitives and package versions will be taken from the current official iExec Nox starter, Hardhat plugin, and documentation before implementation. Unsupported or deprecated APIs must not be invented to satisfy the interface.

## Data Model

A payroll entry contains a recipient Ethereum address, a positive test-token amount, and an optional note. A confidential batch contains an employer address, encrypted entries, a public commitment, recipient count, lifecycle state, and timestamps.

Public state may expose the employer, batch identifier, recipient count, lifecycle state, timestamps, transaction hashes, and cryptographic commitments. Public state must not expose recipient-to-amount mappings, notes, decrypted payloads, encryption keys, or claim secrets.

## Validation And Error Handling

Before encryption, VeilPay rejects malformed addresses, zero or negative amounts, duplicate recipient addresses, empty batches, unsupported CSV columns, totals above the configured test-token balance, and unsafe numeric precision.

The UI distinguishes wrong-network, wallet-rejection, insufficient-funds, encryption, confidential-execution, transaction-revert, and already-claimed errors. Retrying a failed step must not duplicate a successful transaction. Transaction states are idle, awaiting signature, submitted, confirmed, or failed.

## Security And Privacy Boundaries

MetaMask performs all user signatures. Private keys are never requested, stored, logged, or placed in environment files. The frontend must not log plaintext payroll rows after encryption begins. Secrets and RPC credentials are supplied through ignored local environment variables.

The browser is not treated as a trusted privacy boundary by itself. Claims about confidentiality in the demo and documentation must match the actual Nox integration and on-chain data observed during verification.

## Testing

Development follows test-driven development:

- Unit tests cover address and amount validation, duplicate detection, CSV parsing, totals, deterministic public commitments, and error normalization.
- Contract tests cover batch ownership, state transitions, unauthorized access, one-time claims, cancellation rules, and absence of plaintext salary values in emitted public data.
- Integration tests cover the Nox adapter against the official local or Sepolia workflow supported by iExec.
- Browser tests cover wallet-independent UI states and the complete employer and recipient journeys where wallet automation is feasible.
- Final manual verification uses two MetaMask accounts on Sepolia and inspects the resulting public transactions.

## Hackathon Deliverables

The repository will include complete open-source code, contract deployment scripts, automated tests, installation and usage documentation, Sepolia configuration instructions, an architecture and privacy explanation, and `feedback.md` describing concrete experience with iExec tools.

Submission materials will include a public GitHub repository, a maximum four-minute demo script and recording plan, a concise DoraHacks project description, and an X post draft tagging `@iEx_ec`. Account-owned publishing and wallet signatures require the user's final confirmation.

## Release Boundary

The first release is complete when the documented two-wallet Sepolia flow works without mock transaction data and individual payroll amounts remain absent from public contract state, events, and block-explorer inputs. Features outside that boundary are deferred even if they would improve a future production product.
