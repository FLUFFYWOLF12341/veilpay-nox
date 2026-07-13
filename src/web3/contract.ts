import { parseAbi } from 'viem';

export const veilPayAbi = parseAbi([
  'function createBatch(bytes32 commitment, address[] recipients, bytes32[] amounts, bytes[] proofs) returns (uint256 batchId)',
  'function claim(uint256 batchId)',
  'function cancelBatch(uint256 batchId)',
  'function getAllocation(uint256 batchId, address recipient) view returns (bytes32)',
  'function batches(uint256 batchId) view returns (address employer, bytes32 commitment, uint64 recipientCount, uint64 createdAt, uint8 state)',
  'function isRecipient(uint256 batchId, address recipient) view returns (bool)',
  'function hasClaimed(uint256 batchId, address recipient) view returns (bool)',
  'function confidentialBalanceOf(address account) view returns (bytes32)',
  'function nextBatchId() view returns (uint256)',
  'event BatchCreated(uint256 indexed batchId, address indexed employer, bytes32 indexed commitment, uint256 recipientCount)',
  'event BatchCancelled(uint256 indexed batchId)',
  'event PaymentClaimed(uint256 indexed batchId, address indexed recipient)',
]);
