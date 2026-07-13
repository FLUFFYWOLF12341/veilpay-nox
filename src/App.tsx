import { useMemo, useState } from 'react';
import { Check, ChevronRight, ExternalLink, FileUp, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { createPublicClient, createWalletClient, custom, formatUnits, type Abi, type Address, type EIP1193Provider, type Hash, type Hex } from 'viem';
import veilPayArtifact from '../artifacts/contracts/VeilPay.sol/VeilPay.json';
import { validatePayroll, type PayrollEntry } from './domain/payroll';
import { parsePayrollCsv } from './domain/csv';
import { createNoxClient } from './nox/noxClient';
import { veilPayChain, sepoliaExplorer } from './web3/chains';
import { rememberContractAddress, resolveContractAddress } from './web3/deployment';
import { createRecipientClient, createVeilPayClient } from './web3/veilPayClient';
import { claimPayment } from './workflows/claimPayment';
import { submitPayroll } from './workflows/submitPayroll';

type EthereumProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
type SubmissionResult = { hash: Hash; blockNumber: bigint; commitment: Hex };
type SubmitPayrollBatch = (entries: PayrollEntry[], account: Address) => Promise<SubmissionResult>;
type ClaimResult = { amount: bigint; hash: Hash; blockNumber: bigint };
type ClaimPayrollBatch = (batchId: bigint, recipient: Address) => Promise<ClaimResult>;

async function submitWithBrowserWallet(entries: PayrollEntry[], account: Address): Promise<SubmissionResult> {
  const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error('MetaMask is not available in this browser.');
  const contractAddress = resolveContractAddress(import.meta.env.VITE_VEILPAY_ADDRESS, window.localStorage);
  if (!contractAddress) throw new Error('VeilPay has not been deployed to Sepolia yet.');

  const walletClient = createWalletClient({ chain: veilPayChain, transport: custom(provider), account });
  const [handleClient, veilPayClient] = await Promise.all([
    createNoxClient(walletClient),
    createVeilPayClient(provider, contractAddress),
  ]);
  return submitPayroll({
    entries,
    employer: account,
    contractAddress,
    nonce: BigInt(Date.now()),
    handleClient,
    veilPayClient,
  });
}

async function claimWithBrowserWallet(batchId: bigint, recipient: Address): Promise<ClaimResult> {
  const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error('MetaMask is not available in this browser.');
  const contractAddress = resolveContractAddress(import.meta.env.VITE_VEILPAY_ADDRESS, window.localStorage);
  if (!contractAddress) throw new Error('VeilPay has not been deployed to Sepolia yet.');

  const walletClient = createWalletClient({ chain: veilPayChain, transport: custom(provider), account: recipient });
  const [handleClient, recipientClient] = await Promise.all([
    createNoxClient(walletClient),
    createRecipientClient(provider, contractAddress, recipient),
  ]);
  return claimPayment(batchId, recipientClient, handleClient);
}

const blankEntry = (): PayrollEntry => ({ recipient: '', amount: '', note: '' });

export default function App({
  submitPayrollBatch = submitWithBrowserWallet,
  claimPayrollBatch = claimWithBrowserWallet,
}: {
  submitPayrollBatch?: SubmitPayrollBatch;
  claimPayrollBatch?: ClaimPayrollBatch;
}) {
  const [entries, setEntries] = useState<PayrollEntry[]>([blankEntry()]);
  const [account, setAccount] = useState('');
  const [walletError, setWalletError] = useState('');
  const [importError, setImportError] = useState('');
  const [deploymentState, setDeploymentState] = useState<'idle' | 'deploying' | 'confirmed' | 'failed'>('idle');
  const [deploymentAddress, setDeploymentAddress] = useState(() => resolveContractAddress(import.meta.env.VITE_VEILPAY_ADDRESS, window.localStorage));
  const [view, setView] = useState<'create' | 'activity' | 'claim'>('create');
  const [reviewing, setReviewing] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'confirmed' | 'failed'>('idle');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>();
  const [submissionError, setSubmissionError] = useState('');
  const [claimBatchId, setClaimBatchId] = useState('');
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'confirmed' | 'failed'>('idle');
  const [claimResult, setClaimResult] = useState<ClaimResult>();
  const [claimError, setClaimError] = useState('');
  const validation = useMemo(() => validatePayroll(entries, 6), [entries]);
  const validRows = entries.filter((entry) => entry.recipient || entry.amount || entry.note);
  const displayTotal = Number(formatUnits(validation.total, 6)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const updateEntry = (index: number, field: keyof PayrollEntry, value: string) => {
    setEntries((current) => current.map((entry, row) => row === index ? { ...entry, [field]: value } : entry));
  };

  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    const result = parsePayrollCsv(await file.text());
    if (result.errors.length > 0 || result.entries.length === 0) {
      const first = result.errors[0];
      setImportError(`CSV import failed${first?.row ? ` on row ${first.row}` : ''}. Use recipient,amount,note columns.`);
      return;
    }
    setEntries(result.entries);
    setImportError('');
    setReviewing(false);
    setSubmissionState('idle');
  };

  const connectWallet = async () => {
    setWalletError('');
    const provider = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!provider) {
      setWalletError('MetaMask is not available in this browser.');
      return;
    }
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      setAccount(accounts[0] ?? '');
    } catch {
      setWalletError('Wallet connection was declined.');
    }
  };

  const deployWithWallet = async () => {
    const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
    if (!provider || !account) {
      setWalletError('Connect MetaMask before deploying VeilPay.');
      return;
    }
    setDeploymentState('deploying');
    setWalletError('');
    try {
      const walletClient = createWalletClient({ chain: veilPayChain, transport: custom(provider), account: account as Address });
      const publicClient = createPublicClient({ chain: veilPayChain, transport: custom(provider) });
      const hash = await walletClient.deployContract({
        abi: veilPayArtifact.abi as Abi,
        bytecode: veilPayArtifact.bytecode as Hex,
        account: account as Address,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('VeilPay deployment reverted.');
      rememberContractAddress(receipt.contractAddress, window.localStorage);
      setDeploymentAddress(receipt.contractAddress);
      setDeploymentState('confirmed');
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'VeilPay deployment failed.');
      setDeploymentState('failed');
    }
  };

  const submitEncryptedBatch = async () => {
    if (!account) {
      setSubmissionError('Connect MetaMask before submitting payroll.');
      setSubmissionState('failed');
      return;
    }
    setSubmissionState('submitting');
    setSubmissionError('');
    try {
      const result = await submitPayrollBatch(entries, account as Address);
      setSubmissionResult(result);
      setSubmissionState('confirmed');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Payroll submission failed.');
      setSubmissionState('failed');
    }
  };

  const claimPrivatePayment = async () => {
    if (!account) {
      setClaimError('Connect MetaMask before claiming payment.');
      setClaimState('failed');
      return;
    }
    if (!/^\d+$/.test(claimBatchId)) {
      setClaimError('Enter a valid batch ID.');
      setClaimState('failed');
      return;
    }
    setClaimState('claiming');
    setClaimError('');
    try {
      const result = await claimPayrollBatch(BigInt(claimBatchId), account as Address);
      setClaimResult(result);
      setClaimState('confirmed');
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Payment claim failed.');
      setClaimState('failed');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><LockKeyhole size={18} /></span><span>VeilPay</span></div>
        <nav aria-label="Primary navigation">
          <button className={view === 'create' ? 'nav-active' : ''} onClick={() => setView('create')}><Plus size={17} /> Create batch</button>
          <button className={view === 'activity' ? 'nav-active' : ''} onClick={() => setView('activity')}><ShieldCheck size={17} /> Activity</button>
          <button className={view === 'claim' ? 'nav-active' : ''} onClick={() => setView('claim')}><Wallet size={17} /> Claim payment</button>
        </nav>
        <div className="network-card"><span className="status-dot" /> Ethereum Sepolia<small>Nox confidential runtime</small></div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">CONFIDENTIAL PAYROLL</p><h1>{view === 'create' ? 'Create payroll batch' : view === 'activity' ? 'Batch activity' : 'Claim payment'}</h1></div>
          <button className="wallet-button" onClick={connectWallet}><Wallet size={16} />{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect wallet'}</button>
        </header>
        {walletError && <div className="alert" role="alert">{walletError}</div>}
        {!deploymentAddress && account && <div className="deployment-banner">
          <div><b>Deploy VeilPay on Sepolia</b><span>One testnet transaction activates confidential payroll for this browser.</span></div>
          <button disabled={deploymentState === 'deploying'} onClick={deployWithWallet}>{deploymentState === 'deploying' ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />} {deploymentState === 'deploying' ? 'Deploying...' : 'Deploy contract'}</button>
        </div>}
        {deploymentState === 'confirmed' && deploymentAddress && <div className="deployment-success"><Check size={16} /> Contract ready at <a href={`${sepoliaExplorer}/address/${deploymentAddress}`} target="_blank" rel="noreferrer">{deploymentAddress}</a></div>}

        {view === 'create' && (
          <>
            <div className="steps"><span className="step-current">1 <b>Recipients</b></span><ChevronRight /><span>2 <b>Encrypt</b></span><ChevronRight /><span>3 <b>Confirm</b></span></div>
            <section className="workspace">
              <div className="section-heading"><div><h2>Payroll details</h2><p>Amounts are encrypted before they leave your browser.</p></div><label className="secondary file-import"><FileUp size={16} /> Import CSV<input type="file" accept=".csv,text/csv" aria-label="Import payroll CSV" onChange={(event) => void importCsv(event.target.files?.[0])} /></label></div>
              {importError && <div className="import-error" role="alert">{importError}</div>}
              <div className="payroll-table">
                <div className="table-head"><span>RECIPIENT ADDRESS</span><span>AMOUNT</span><span>PRIVATE NOTE</span><span /></div>
                {entries.map((entry, index) => (
                  <div className="payroll-row" key={index}>
                    <input aria-label="Recipient address" placeholder="0x..." value={entry.recipient} onChange={(event) => updateEntry(index, 'recipient', event.target.value)} />
                    <div className="amount-input"><input aria-label="Amount" inputMode="decimal" placeholder="0.00" value={entry.amount} onChange={(event) => updateEntry(index, 'amount', event.target.value)} /><span>vcUSD</span></div>
                    <input aria-label="Private note" placeholder="Optional" value={entry.note} onChange={(event) => updateEntry(index, 'note', event.target.value)} />
                    <button className="icon-button" aria-label="Remove recipient" disabled={entries.length === 1} onClick={() => setEntries((rows) => rows.filter((_, row) => row !== index))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="add-row" onClick={() => setEntries((rows) => [...rows, blankEntry()])}><Plus size={16} /> Add recipient</button>
            </section>

            <div className="bottom-grid">
              <section className="privacy-panel"><ShieldCheck size={22} /><div><h3>Privacy check</h3><p>Amounts are encrypted; notes stay local and are represented only by the batch commitment.</p></div><span className="ready"><Check size={14} /> Nox ready</span></section>
              <section className="summary-panel"><div><span>Batch total</span><strong>{displayTotal} vcUSD</strong><small>{validRows.length} {validRows.length === 1 ? 'recipient' : 'recipients'}</small></div><button disabled={validation.issues.length > 0} onClick={() => setReviewing(true)}>Review encrypted batch <ChevronRight size={17} /></button></section>
            </div>
            {reviewing && <div className={`review-banner ${submissionState}`}>
              {submissionState === 'submitting' ? <LoaderCircle className="spin" size={18} /> : submissionState === 'confirmed' ? <Check size={18} /> : <LockKeyhole size={18} />}
              <div>
                <b>{submissionState === 'confirmed' ? `Confirmed in block ${submissionResult?.blockNumber}` : submissionState === 'submitting' ? 'Encrypting and awaiting confirmation' : submissionState === 'failed' ? 'Submission failed' : 'Ready for encryption'}</b>
                <span>{submissionState === 'failed' ? submissionError : submissionState === 'confirmed' ? 'The confidential payroll batch is now recorded on Sepolia.' : 'Nox encrypts each amount before MetaMask broadcasts the transaction.'}</span>
              </div>
              {submissionState === 'confirmed' && submissionResult ? (
                <a href={`${sepoliaExplorer}/tx/${submissionResult.hash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={14} /></a>
              ) : (
                <button disabled={submissionState === 'submitting'} onClick={submitEncryptedBatch}>{submissionState === 'submitting' ? 'Submitting...' : 'Encrypt and submit'}</button>
              )}
            </div>}
          </>
        )}

        {view === 'activity' && <section className="empty-state"><ShieldCheck size={30} /><h2>No batches yet</h2><p>Confirmed Sepolia batches will appear here with public commitments and transaction links.</p></section>}
        {view === 'claim' && <section className="claim-workspace">
          <div className="claim-icon"><Wallet size={24} /></div>
          <div className="claim-copy"><h2>Claim a private allocation</h2><p>Only the connected recipient can decrypt the allocation. The amount stays encrypted on-chain.</p></div>
          <label>Batch ID<input aria-label="Batch ID" inputMode="numeric" placeholder="e.g. 7" value={claimBatchId} onChange={(event) => setClaimBatchId(event.target.value)} /></label>
          <button disabled={claimState === 'claiming'} onClick={claimPrivatePayment}>{claimState === 'claiming' ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />} {claimState === 'claiming' ? 'Claiming...' : 'Decrypt and claim'}</button>
          {claimState === 'confirmed' && claimResult && <div className="claim-result"><Check size={18} /><div><strong>{Number(formatUnits(claimResult.amount, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vcUSD claimed</strong><span>Confirmed in block {claimResult.blockNumber}</span></div><a href={`${sepoliaExplorer}/tx/${claimResult.hash}`} target="_blank" rel="noreferrer" aria-label="View claim transaction"><ExternalLink size={16} /></a></div>}
          {claimState === 'failed' && <div className="claim-error" role="alert">{claimError}</div>}
        </section>}
      </main>
    </div>
  );
}
