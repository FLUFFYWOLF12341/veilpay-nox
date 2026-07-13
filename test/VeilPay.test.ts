import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { nox } from '@iexec-nox/nox-hardhat-plugin';

describe('VeilPay', async () => {
  const { viem } = await network.create();

  it('rejects an empty payroll batch before confidential processing', async () => {
    const contract = await viem.deployContract('VeilPay');

    await viem.assertions.revertWithCustomError(
      contract.write.createBatch([
        `0x${'11'.repeat(32)}`,
        [],
        [],
        [],
      ]),
      contract,
      'EmptyBatch',
    );
  });

  it('keeps salary values out of public events', async () => {
    const artifact = await viem.getContractAt('VeilPay', '0x0000000000000000000000000000000000000001');
    const eventNames = artifact.abi
      .filter((item) => item.type === 'event')
      .map((item) => item.name);

    assert.deepEqual(eventNames.sort(), ['BatchCancelled', 'BatchCreated', 'PaymentClaimed']);
    for (const item of artifact.abi.filter((entry) => entry.type === 'event')) {
      assert.equal(JSON.stringify(item).includes('amount'), false);
    }
  });

  it('exposes a recipient-scoped confidential token balance handle', async () => {
    const artifact = await viem.getContractAt('VeilPay', '0x0000000000000000000000000000000000000001');
    const functionNames = artifact.abi
      .filter((item) => item.type === 'function')
      .map((item) => item.name);

    assert.equal(functionNames.includes('confidentialBalanceOf'), true);
    assert.equal(functionNames.includes('balanceOf'), false);
  });
});

describe('VeilPay Nox integration', () => {
  it('mints a confidential vcUSD balance when the recipient claims', {
    skip: process.env.NOX_INTEGRATION !== '1' ? 'requires the Docker-backed Nox stack' : false,
  }, async () => {
    const { viem } = await nox.connect();
    const wallets = await viem.getWalletClients();
    const employer = wallets[0];
    const recipient = wallets[1];
    assert.ok(employer);
    assert.ok(recipient);
    const contract = await viem.deployContract('VeilPay');
    const encrypted = await nox.encryptInput(12_500_000n, 'uint256', contract.address);

    await contract.write.createBatch([
      `0x${'11'.repeat(32)}`,
      [recipient.account.address],
      [encrypted.handle],
      [encrypted.handleProof],
    ], { account: employer.account });
    await contract.write.claim([0n], { account: recipient.account });

    assert.equal(await contract.read.hasClaimed([0n, recipient.account.address]), true);
    const balanceHandle = await contract.read.confidentialBalanceOf(
      [recipient.account.address],
      { account: recipient.account },
    );
    assert.notEqual(balanceHandle, `0x${'00'.repeat(32)}`);
  });
});
