# iExec Nox Tooling Feedback

## What worked well

- The `externalEuint256` plus proof model makes the privacy boundary explicit: encryption must happen before public calldata.
- `Nox.fromExternal`, `Nox.allowThis`, and `Nox.allow` form a small, understandable Solidity surface.
- The Hardhat plugin's `nox.connect()` and `encryptInput()` helpers are a good direction for realistic confidential-contract tests.
- Standard MetaMask and Viem compatibility avoids introducing a special wallet into the user journey.

## Friction encountered

- The hackathon resource link for `iExec-Nox/nox-hardhat-starter` returned 404 on 2026-07-12. The current documentation and published packages were sufficient, but a maintained starter would reduce setup uncertainty.
- The documentation is marked as under development, and examples currently mix Solidity 0.8.27 and 0.8.35. A version compatibility table would help.
- Full local tests require Docker and pull several off-chain services. A lightweight preflight command that checks Docker, ports, and image access before running tests would improve error messages.
- Hardhat 3's generic `hardhat test` did not discover the TypeScript test file in this fresh project until the file path was provided explicitly. A complete reference `package.json` script would prevent this surprise.
- The distinction between entitlement storage and ERC-7984 settlement deserves a complete payroll example, especially around funding, callbacks, and insufficient confidential balances.

## Suggested improvements

1. Restore or replace the starter repository and pin it from the hackathon page.
2. Publish an end-to-end example containing React, Viem, MetaMask, Nox handles, contract ACLs, and Sepolia deployment.
3. Add a `nox doctor` command for Docker and network diagnostics.
4. Document recommended batching limits and gas behavior for arrays of encrypted inputs.
5. Provide a confidential payroll or treasury reference showing ERC-7984 settlement and selective auditor access.
