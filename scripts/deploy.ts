import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { network } from 'hardhat';

const { viem } = await network.create({ network: 'sepolia', chainType: 'l1' });
const publicClient = await viem.getPublicClient();
const [deployer] = await viem.getWalletClients();

if (!deployer) throw new Error('SEPOLIA_PRIVATE_KEY did not provide a deployer account.');

const { contract, deploymentTransaction } = await viem.sendDeploymentTransaction('VeilPay');
const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentTransaction.hash });

if (receipt.status !== 'success') throw new Error('VeilPay deployment reverted.');

const outputPath = resolve('src/generated/deployment.json');
const deployment = {
  address: contract.address,
  chainId: await publicClient.getChainId(),
  deployer: deployer.account.address,
  transactionHash: deploymentTransaction.hash,
  blockNumber: receipt.blockNumber.toString(),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`, 'utf8');

console.log(`VeilPay deployed at ${contract.address}`);
console.log(`Transaction: https://sepolia.etherscan.io/tx/${deploymentTransaction.hash}`);
