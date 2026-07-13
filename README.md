# VeilPay

VeilPay is confidential batch payroll for small teams and DAOs, built for the iExec WTF Hackathon. Employers prepare a payroll in a standard browser wallet while iExec Nox encrypts every allocation before it reaches public calldata. Recipients can access only the allocation authorized for their address.

## What is implemented

- Responsive employer and recipient workspace with MetaMask connection
- MetaMask deployment flow that stores the Sepolia contract address locally
- Working CSV import with strict schema and row validation
- Strict payroll and CSV validation
- Deterministic public batch commitments
- Fail-closed Nox encryption adapter using `@iexec-nox/handle`
- Solidity 0.8.35 contract using `externalEuint256`, `Nox.fromExternal`, `Nox.allowThis`, and recipient ACLs
- Public events that omit salary amounts and private notes
- Employer cancellation and one-time recipient claim state
- Private `vcUSD` test-token minting when an authorized recipient claims
- Unit, UI, type, build, and non-TEE contract tests

## Requirements

- Node.js 22 or newer
- MetaMask for browser interaction
- Docker Desktop for the full local Nox off-chain test stack
- Sepolia ETH for the final deployment transaction

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and connect MetaMask when required.

## Verify

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:contracts
```

The default contract command verifies compilation, pre-Nox guards, and public ABI privacy without Docker. After Docker is running, execute the full Nox stack with:

```bash
NOX_INTEGRATION=1 npm run test:contracts
```

The Nox plugin pulls its off-chain service images on the first run.

Or run the complete suite with Docker Desktop active:

```bash
npm run verify
```

## Deploy to Sepolia with MetaMask

Open the app, connect MetaMask, and use **Deploy contract**. The app switches to Ethereum Sepolia, asks MetaMask to deploy the compiled VeilPay bytecode, and stores the resulting public address in browser local storage. No private key leaves MetaMask.

Nox officially supports Ethereum Sepolia. The SDK and Solidity library resolve NoxCompute at `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF`; the address has deployed proxy bytecode on chain.

## Automated deployment alternative

Copy `.env.example` to `.env`, provide a Sepolia RPC URL and a dedicated test-only deployer key, then run:

```bash
npm run deploy:sepolia
```

The script writes public deployment metadata to `src/generated/deployment.json`. Set `VITE_VEILPAY_ADDRESS` to the resulting address and rebuild the app. Use only a dedicated testnet wallet for deployment automation.

## Privacy model

Nox provides confidentiality, not anonymity. Employer and recipient addresses, function calls, batch state, timestamps, and commitments can remain visible. Salary values are encrypted before broadcast and represented on-chain by 32-byte handles. The contract grants the application continued handle access and grants each recipient viewer access only to their allocation. Claiming mints a private `vcUSD` test-token balance with `Nox.mint`; it does not represent real US dollars or production USDC.

VeilPay fails closed. A gateway or encryption failure stops submission; it never falls back to plaintext calldata. Private keys are never requested or stored by this application.

## Current deployment status

The contract and browser deployment flow are ready for Sepolia. The remaining external step is a MetaMask-confirmed deployment from a testnet-funded account, followed by a two-account transaction check.

## Project structure

- `contracts/VeilPay.sol`: confidential payroll contract
- `src/domain`: payroll validation, CSV parsing, and commitments
- `src/nox`: Nox encryption/decryption boundary
- `src/App.tsx`: employer and recipient workspace
- `test/VeilPay.test.ts`: Hardhat contract tests
- `feedback.md`: iExec developer-tool feedback

## License

MIT
