# VeilPay Submission Package

## One-line pitch

Private batch payroll for on-chain teams: encrypted salary allocations, recipient-only disclosure, and confidential claim balances using iExec Nox.

## DoraHacks description

Public payroll leaks compensation data, exposes treasury operations, and creates avoidable security and negotiation risks. VeilPay gives small teams and DAOs an operational batch-payroll workflow without publishing individual allocations.

An employer enters recipients manually or imports a CSV. VeilPay validates every row, creates a deterministic public commitment, and uses the iExec Nox Handle SDK to encrypt each `uint256` allocation before MetaMask broadcasts the transaction. The Solidity contract validates external encrypted inputs through `Nox.fromExternal`, retains application access with `Nox.allowThis`, and grants each recipient selective access using `Nox.allow`.

Recipients authenticate with a standard wallet, privately decrypt only their authorized allocation, and claim once. Claiming mints a confidential `vcUSD` test balance through `Nox.mint`. Public events expose lifecycle facts needed for auditability but omit salaries and notes. Encryption failures stop the transaction rather than falling back to plaintext.

VeilPay runs on Ethereum Sepolia with NoxCompute and works with MetaMask. The repository includes domain, UI, workflow, and contract tests plus a Docker-backed integration test that launches the complete Nox off-chain stack and proves confidential minting end to end.

## Technical highlights

- Browser-side Nox input encryption with fail-closed submission
- Confidential Solidity allocations and balances using Nox handles and ACLs
- One-time recipient claim protection and employer cancellation
- MetaMask-only deployment without private-key export
- Strict CSV, address, precision, duplicate, and amount validation
- Public events intentionally exclude salary amounts and private notes
- Reproducible Docker integration test for the Nox gateway, KMS, ingestor, runner, NATS, and object storage

## Verification

```bash
npm install
npm run verify
```

Expected result: 39 application tests and 4 contract tests pass, including the Docker-backed confidential `vcUSD` mint test.

## Final external links

- Repository: `https://github.com/FLUFFYWOLF12341/veilpay-nox`
- Demo video: `[ADD VIDEO URL]`
- Sepolia contract: `[ADD ETHERSCAN ADDRESS URL]`
- Live app: `https://fluffywolf12341.github.io/veilpay-nox/`

## Submission checklist

- [x] Product implementation
- [x] Responsive employer and recipient workflows
- [x] Nox Docker integration test
- [x] MetaMask Sepolia deployment flow
- [x] README, architecture, feedback, demo script, and submission copy
- [x] Publish repository and paste URL
- [ ] Confirm MetaMask deployment and paste Etherscan URL
- [ ] Record and publish the 3:30 demo
- [x] Publish frontend and paste URL
- [ ] Submit BUIDL through DoraHacks account

## X post draft

We built VeilPay for the WTF Hackathon: confidential batch payroll for teams and DAOs using iExec Nox. Salaries are encrypted before calldata, each recipient can access only their allocation, and claiming creates a confidential vcUSD balance. [DEMO] [GITHUB] [CONTRACT] @iEx_ec
