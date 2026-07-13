import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  delete (window as unknown as { ethereum?: unknown }).ethereum;
});

describe('employer payroll workflow', () => {
  it('validates a payroll row and shows its review summary', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: '0x1111111111111111111111111111111111111111' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1250' } });
    fireEvent.change(screen.getByLabelText('Private note'), { target: { value: 'July design' } });

    expect(screen.getByText('1 recipient')).toBeInTheDocument();
    expect(screen.getByText('1,250.00 vcUSD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review encrypted batch' })).toBeEnabled();
  });

  it('explains that MetaMask is required when no provider exists', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
    expect(await screen.findByText('MetaMask is not available in this browser.')).toBeInTheDocument();
  });

  it('submits an encrypted batch and shows its confirmed transaction', async () => {
    (window as unknown as { ethereum: unknown }).ethereum = {
      request: vi.fn().mockResolvedValue(['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']),
    };
    const submitPayrollBatch = vi.fn().mockResolvedValue({
      hash: '0xabc', blockNumber: 42n, commitment: `0x${'11'.repeat(32)}`,
    });
    render(<App submitPayrollBatch={submitPayrollBatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
    await screen.findByText('0xaaaa...aaaa');
    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: '0x1111111111111111111111111111111111111111' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review encrypted batch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt and submit' }));

    expect(await screen.findByText('Confirmed in block 42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View transaction' })).toHaveAttribute(
      'href', 'https://sepolia.etherscan.io/tx/0xabc',
    );
    expect(submitPayrollBatch).toHaveBeenCalledOnce();
  });

  it('lets a recipient decrypt and claim a private allocation', async () => {
    (window as unknown as { ethereum: unknown }).ethereum = {
      request: vi.fn().mockResolvedValue(['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']),
    };
    const claimPayrollBatch = vi.fn().mockResolvedValue({
      amount: 12_500_000n, hash: '0xdef', blockNumber: 43n,
    });
    render(<App claimPayrollBatch={claimPayrollBatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
    await screen.findByText('0xaaaa...aaaa');
    fireEvent.click(screen.getByRole('button', { name: 'Claim payment' }));
    fireEvent.change(screen.getByLabelText('Batch ID'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decrypt and claim' }));

    expect(await screen.findByText('12.50 vcUSD claimed')).toBeInTheDocument();
    expect(claimPayrollBatch).toHaveBeenCalledWith(7n, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });
});
