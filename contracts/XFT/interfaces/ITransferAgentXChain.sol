// SPDX-License-Identifier: Business Source License 1.1
pragma solidity 0.8.18;

interface ITransferAgentXChain {
    function settleCXTransactions(
        address account,
        bytes32[] calldata requestIds,
        uint256 date,
        uint256 price
    ) external;

    function settleCXTransaction(
        address account,
        bytes32 requestId,
        uint256 date,
        uint256 price
    ) external;
}
