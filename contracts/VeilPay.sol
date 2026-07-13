// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

contract VeilPay {
    enum BatchState {
        Active,
        Cancelled
    }

    struct Batch {
        address employer;
        bytes32 commitment;
        uint64 recipientCount;
        uint64 createdAt;
        BatchState state;
    }

    error EmptyBatch();
    error LengthMismatch();
    error DuplicateRecipient(address recipient);
    error InvalidRecipient();
    error UnknownBatch();
    error NotEmployer();
    error BatchNotActive();
    error NotRecipient();
    error AlreadyClaimed();

    event BatchCreated(
        uint256 indexed batchId,
        address indexed employer,
        bytes32 indexed commitment,
        uint256 recipientCount
    );
    event BatchCancelled(uint256 indexed batchId);
    event PaymentClaimed(uint256 indexed batchId, address indexed recipient);

    uint256 public nextBatchId;
    string public constant name = "VeilPay Confidential USD";
    string public constant symbol = "vcUSD";
    uint8 public constant decimals = 6;
    mapping(uint256 batchId => Batch batch) public batches;
    mapping(uint256 batchId => mapping(address recipient => euint256 allocation)) private _allocations;
    mapping(uint256 batchId => mapping(address recipient => bool included)) public isRecipient;
    mapping(uint256 batchId => mapping(address recipient => bool claimed)) public hasClaimed;
    mapping(address account => euint256 balance) private _confidentialBalances;
    euint256 private _confidentialTotalSupply;

    function createBatch(
        bytes32 commitment,
        address[] calldata recipients,
        externalEuint256[] calldata amounts,
        bytes[] calldata proofs
    ) external returns (uint256 batchId) {
        uint256 length = recipients.length;
        if (length == 0) revert EmptyBatch();
        if (length != amounts.length || length != proofs.length) revert LengthMismatch();

        batchId = nextBatchId++;
        batches[batchId] = Batch({
            employer: msg.sender,
            commitment: commitment,
            recipientCount: uint64(length),
            createdAt: uint64(block.timestamp),
            state: BatchState.Active
        });

        for (uint256 i; i < length; ++i) {
            address recipient = recipients[i];
            if (recipient == address(0)) revert InvalidRecipient();
            if (isRecipient[batchId][recipient]) revert DuplicateRecipient(recipient);

            euint256 allocation = Nox.fromExternal(amounts[i], proofs[i]);
            Nox.allowThis(allocation);
            Nox.allow(allocation, recipient);
            _allocations[batchId][recipient] = allocation;
            isRecipient[batchId][recipient] = true;
        }

        emit BatchCreated(batchId, msg.sender, commitment, length);
    }

    function getAllocation(uint256 batchId, address recipient) external view returns (euint256) {
        if (batches[batchId].employer == address(0)) revert UnknownBatch();
        if (msg.sender != recipient) revert NotRecipient();
        if (!isRecipient[batchId][recipient]) revert NotRecipient();
        return _allocations[batchId][recipient];
    }

    function claim(uint256 batchId) external {
        Batch storage batch = batches[batchId];
        if (batch.employer == address(0)) revert UnknownBatch();
        if (batch.state != BatchState.Active) revert BatchNotActive();
        if (!isRecipient[batchId][msg.sender]) revert NotRecipient();
        if (hasClaimed[batchId][msg.sender]) revert AlreadyClaimed();

        (, euint256 newBalance, euint256 newTotalSupply) = Nox.mint(
            _confidentialBalances[msg.sender],
            _allocations[batchId][msg.sender],
            _confidentialTotalSupply
        );
        _confidentialBalances[msg.sender] = newBalance;
        _confidentialTotalSupply = newTotalSupply;
        Nox.allowThis(newBalance);
        Nox.allow(newBalance, msg.sender);
        Nox.allowThis(newTotalSupply);

        hasClaimed[batchId][msg.sender] = true;
        emit PaymentClaimed(batchId, msg.sender);
    }

    function confidentialBalanceOf(address account) external view returns (euint256) {
        if (msg.sender != account) revert NotRecipient();
        return _confidentialBalances[account];
    }

    function cancelBatch(uint256 batchId) external {
        Batch storage batch = batches[batchId];
        if (batch.employer == address(0)) revert UnknownBatch();
        if (msg.sender != batch.employer) revert NotEmployer();
        if (batch.state != BatchState.Active) revert BatchNotActive();

        batch.state = BatchState.Cancelled;
        emit BatchCancelled(batchId);
    }
}
