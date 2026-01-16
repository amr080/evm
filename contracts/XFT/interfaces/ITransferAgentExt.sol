// SPDX-License-Identifier: Business Source License 1.1
pragma solidity 0.8.18;

interface ITransferAgentExt {
    function adjustBalance(
        address account,
        uint256 currentBalance,
        uint256 newBalance,
        string memory memo
    ) external;

    function distributeDividends(
        address[] memory accounts,
        uint256 date,
        int256 rate,
        uint256 price
    ) external;

    function distributeDividends(
        address[] calldata accounts,
        uint256[] calldata adjustedShares,
        uint256 date,
        int256 rate,
        uint256 price
    ) external;

    function endOfDay(
        address[] calldata accounts,
        bytes32[] calldata txIds,
        uint256 date,
        int256 rate,
        uint256 price
    ) external;

    function endOfDay(
        address[] calldata accounts,
        uint256[] calldata adjustedShares,
        bytes32[] calldata txIds,
        uint256 date,
        int256 rate,
        uint256 price
    ) external;

    function settleTransactions(
        address[] calldata accounts,
        bytes32[] calldata txIds,
        uint256 date,
        uint256 price
    ) external;
}
