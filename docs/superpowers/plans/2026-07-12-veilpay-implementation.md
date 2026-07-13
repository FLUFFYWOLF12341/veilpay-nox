# VeilPay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a MetaMask-compatible confidential batch-payroll dApp that encrypts salary amounts with iExec Nox and runs on Ethereum Sepolia.

**Architecture:** A Vite React client owns workflow and wallet UX, while focused TypeScript domain modules validate and parse payroll data. A Hardhat 3 project contains a Nox confidential payroll contract; one adapter isolates `@iexec-nox/handle` calls from UI code. Viem provides wallet and contract access.

**Tech Stack:** Node.js 22+, TypeScript, React, Vite, Vitest, Testing Library, Viem, Hardhat 3, `@nomicfoundation/hardhat-toolbox-viem`, `@iexec-nox/nox-hardhat-plugin@0.1.0`, `@iexec-nox/nox-protocol-contracts@0.2.4`, `@iexec-nox/handle`, Solidity 0.8.35, Playwright.

## Global Constraints

- Target Ethereum Sepolia and standard MetaMask; never request or persist private keys.
- Encrypt every salary amount before transaction broadcast; plaintext amounts must never enter calldata, events, or public storage.
- Use `externalEuint256`, `Nox.fromExternal`, `Nox.allowThis`, and recipient-scoped `Nox.allow` from the official Nox Solidity SDK.
- Use real contract interactions; no mock transaction responses in the shipped application.
- First release supports one-time batches only; recurring payroll, streams, Safe integration, and mainnet are out of scope.
- The Nox local stack requires Docker; if Docker is unavailable, ordinary unit/build checks continue but Nox integration verification remains explicitly incomplete.
- UI copy is English for hackathon judging, with responsive desktop and mobile layouts.

---

## File Map

- `package.json`, TypeScript/Vite/Vitest/Playwright configs: workspace tooling and commands.
- `contracts/VeilPay.sol`: confidential batch state, encrypted allocations, ACLs, and claim replay protection.
- `test/VeilPay.test.ts`: Nox-backed contract behavior and privacy assertions.
- `scripts/deploy.ts`: Sepolia deployment.
- `src/domain/payroll.ts`: payroll types and validation.
- `src/domain/csv.ts`: strict CSV parsing.
- `src/domain/commitment.ts`: deterministic public batch commitment.
- `src/nox/noxClient.ts`: browser-facing Nox encryption and decryption adapter.
- `src/web3/veilPayClient.ts`: Viem reads, writes, chain checks, and error normalization.
- `src/components/*`: focused workflow components.
- `src/App.tsx`: application state machine and task navigation.
- `README.md`, `feedback.md`, `docs/submission.md`: setup and hackathon deliverables.

### Task 1: Workspace And Payroll Domain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`
- Create: `src/domain/payroll.test.ts`
- Create: `src/domain/payroll.ts`

**Interfaces:**
- Produces: `PayrollEntry`, `PayrollValidation`, `validatePayroll(entries, tokenDecimals, availableBalance?)`.

- [ ] **Step 1: Initialize the package manifest and test configuration** with Node `>=22`, scripts for `dev`, `build`, `test`, `test:contracts`, `lint`, and `typecheck`, and the exact stack listed above.
- [ ] **Step 2: Write failing tests** proving empty batches, invalid addresses, duplicate normalized addresses, zero/negative amounts, excessive decimal precision, and insufficient balance are rejected while a valid batch returns a bigint total.
- [ ] **Step 3: Run `npm test -- src/domain/payroll.test.ts`** and confirm failure because `validatePayroll` does not exist.
- [ ] **Step 4: Implement the minimal payroll validator** using Viem `isAddress` and `parseUnits`, returning field-specific issues rather than throwing.
- [ ] **Step 5: Run the focused test and `npm run typecheck`** and confirm both pass.

### Task 2: CSV Import And Public Commitment

**Files:**
- Create: `src/domain/csv.test.ts`, `src/domain/csv.ts`
- Create: `src/domain/commitment.test.ts`, `src/domain/commitment.ts`

**Interfaces:**
- Consumes: `PayrollEntry`.
- Produces: `parsePayrollCsv(text): CsvParseResult` and `createBatchCommitment(employer, entries, nonce): Hex`.

- [ ] **Step 1: Write failing CSV tests** for the exact header `recipient,amount,note`, quoted notes, blank lines, missing cells, extra columns, and malformed rows.
- [ ] **Step 2: Run the CSV tests** and verify the missing-module failure.
- [ ] **Step 3: Implement strict parsing** with a structured CSV package and row-numbered errors.
- [ ] **Step 4: Write failing commitment tests** proving address case normalization, entry-order independence, nonce sensitivity, and no plaintext note in the returned bytes.
- [ ] **Step 5: Implement canonical sorting and Viem `keccak256(encodeAbiParameters(...))`; run both suites** and confirm green.

### Task 3: Confidential Payroll Contract

**Files:**
- Create: `hardhat.config.ts`
- Create: `contracts/VeilPay.sol`
- Create: `test/VeilPay.test.ts`

**Interfaces:**
- Produces: `createBatch(bytes32 commitment, address[] recipients, externalEuint256[] amounts, bytes[] proofs)`, `claim(uint256 batchId)`, `cancelBatch(uint256 batchId)`, `getAllocation(uint256 batchId, address recipient)`.
- Public event fields: batch ID, employer, commitment, recipient count, and lifecycle only.

- [ ] **Step 1: Configure Hardhat 3** with the Viem toolbox, Nox plugin, Solidity 0.8.35, and default `edr-simulated` network using `chainType: 'op'`.
- [ ] **Step 2: Write a failing ownership test** proving a created batch belongs to its caller and exposes only the approved public metadata.
- [ ] **Step 3: Run `npm run test:contracts`** and confirm failure because the contract is missing.
- [ ] **Step 4: Implement batch creation** by converting every external handle with `Nox.fromExternal`, granting `Nox.allowThis` and `Nox.allow` to the recipient, and storing encrypted allocations without emitting amounts.
- [ ] **Step 5: Write failing tests** for empty/length-mismatched batches, duplicate recipients, unauthorized cancellation, successful cancellation, recipient-only claim, and double-claim rejection.
- [ ] **Step 6: Implement the minimal state machine** (`Active`, `Cancelled`) and claim replay mapping; claims mark authorization consumption without publishing the encrypted value.
- [ ] **Step 7: Add a privacy assertion** that transaction calldata and decoded logs contain no encoded plaintext salary values.
- [ ] **Step 8: Run the contract suite** with Docker-backed Nox and confirm all tests pass; if Docker is absent, record the exact blocked command and continue only with non-Nox checks.

### Task 4: Nox And Viem Adapters

**Files:**
- Create: `src/nox/noxClient.test.ts`, `src/nox/noxClient.ts`
- Create: `src/web3/veilPayClient.test.ts`, `src/web3/veilPayClient.ts`
- Create: `src/web3/contract.ts`, `src/web3/chains.ts`

**Interfaces:**
- Produces: `encryptPayroll(entries, contractAddress): Promise<EncryptedPayroll>`, `decryptAllocation(handle): Promise<bigint>`, `createVeilPayClient(provider)`, and normalized transaction errors.

- [ ] **Step 1: Write failing adapter contract tests** using injected SDK and wallet ports to prove one `encryptInput(amount, 'uint256', contractAddress)` call per validated entry and fail-closed behavior.
- [ ] **Step 2: Implement `NoxClient`** around the official `@iexec-nox/handle` browser API, returning `{handle, handleProof}` pairs and never logging input amounts.
- [ ] **Step 3: Write failing web3 tests** for wrong chain, wallet rejection, insufficient gas, revert, and already-claimed normalization.
- [ ] **Step 4: Implement Viem public/wallet clients** for Sepolia chain ID `11155111`, typed contract reads/writes, receipt waiting, and error mapping.
- [ ] **Step 5: Run adapter tests and typecheck** and confirm green.

### Task 5: Employer Workflow UI

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `src/components/AppShell.tsx`, `WalletButton.tsx`, `PayrollEditor.tsx`, `CsvImport.tsx`, `BatchReview.tsx`, `TransactionStatus.tsx`
- Create: `src/components/employer-flow.test.tsx`

**Interfaces:**
- Consumes: payroll, CSV, commitment, Nox, and Viem interfaces from Tasks 1-4.

- [ ] **Step 1: Write a failing employer-flow test** covering connect, add recipient, validation, review, encrypt, signature pending, confirmation, and visible batch ID.
- [ ] **Step 2: Implement the compact application shell** with Create Batch, Activity, and Claim tabs; use Lucide icons and accessible controls.
- [ ] **Step 3: Implement the payroll editor and CSV import** with stable table dimensions, inline validation, recipient count, and total.
- [ ] **Step 4: Implement review and submission** so encryption precedes every write and failures return the user to a retryable state without duplicate writes.
- [ ] **Step 5: Run component tests, typecheck, and production build** and confirm green with no console warnings.

### Task 6: Recipient Claim And Activity UI

**Files:**
- Create: `src/components/ClaimPanel.tsx`, `BatchActivity.tsx`, `PrivacyReceipt.tsx`
- Create: `src/components/recipient-flow.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: connected address, `getAllocation`, `decryptAllocation`, `claim`, and public batch metadata.

- [ ] **Step 1: Write a failing recipient-flow test** proving a recipient sees only their entitlement, can decrypt it after authorization, can claim once, and sees an already-claimed state thereafter.
- [ ] **Step 2: Implement the claim panel** with network gating, explicit decrypt action, signature state, and one-time claim protection.
- [ ] **Step 3: Implement activity and privacy receipt views** showing public metadata and explorer links without showing other recipients or salary amounts.
- [ ] **Step 4: Add responsive CSS** for 390px mobile and 1440px desktop without overlap or layout shift.
- [ ] **Step 5: Run all frontend tests and build** and confirm green.

### Task 7: Deployment And End-To-End Verification

**Files:**
- Create: `scripts/deploy.ts`, `.env.example`, `src/generated/deployment.json`
- Create: `playwright.config.ts`, `e2e/veilpay.spec.ts`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Deployment writes only public contract address, chain ID, deployer, and transaction hash to `deployment.json`.

- [ ] **Step 1: Write the Sepolia deployment script** using environment RPC configuration and an injected deployer account; never include a real secret in source.
- [ ] **Step 2: Add browser tests** for desktop/mobile layout, CSV validation, wallet-missing state, navigation, and transaction state rendering.
- [ ] **Step 3: Run Playwright at 1440x900 and 390x844** and inspect screenshots for overlap, clipping, blank content, and broken controls.
- [ ] **Step 4: Deploy to Sepolia after user MetaMask authorization** and save the verified public deployment metadata.
- [ ] **Step 5: Execute the two-wallet manual flow** and inspect calldata, logs, and storage in the block explorer to confirm salary plaintext is absent.

### Task 8: Hackathon Submission Package

**Files:**
- Create: `README.md`, `feedback.md`, `docs/architecture.md`, `docs/demo-script.md`, `docs/submission.md`, `LICENSE`

**Interfaces:**
- Produces a repository and submission package matching the WTF Hackathon requirements.

- [ ] **Step 1: Write README setup, Docker/Nox test, local run, Sepolia deploy, usage, privacy model, and troubleshooting instructions** with verified commands only.
- [ ] **Step 2: Write `feedback.md`** with specific observations about the Nox docs, starter 404, Docker requirement, plugin behavior, and developer experience.
- [ ] **Step 3: Write architecture and threat-boundary documentation** that accurately distinguishes confidentiality from anonymity.
- [ ] **Step 4: Write a demo script under four minutes** covering problem, Nox integration, live employer flow, recipient claim, and public explorer inspection.
- [ ] **Step 5: Write DoraHacks and X copy** including repository, demo, Sepolia contract, and `@iEx_ec` placeholders that are replaced only with verified final URLs.
- [ ] **Step 6: Run `npm test`, `npm run test:contracts`, `npm run typecheck`, `npm run build`, and Playwright**; record any environment-blocked check exactly rather than claiming it passed.

## Plan Self-Review

- Every success criterion maps to Tasks 3-7.
- All Nox identifiers match the current official documentation as of 2026-07-12.
- No production feature is scheduled before its focused failing test.
- Docker absence is treated as a verification blocker, not silently replaced with mocked Nox behavior.
- Publishing to GitHub, DoraHacks, or X and signing MetaMask transactions remain user-confirmed external actions.
