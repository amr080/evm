// SPDX-License-Identifier: Business Source License 1.1
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title IDollar
 * @dev Interface for payment/collateral tokens used in XFT transactions
 * 
 * This interface extends ERC20 to support tokens that can be used as payment
 * or collateral in the XFT transactional system. Dollar tokens can implement
 * this interface to integrate with TransferAgentModule for settlement.
 */
interface IDollar is IERC20Upgradeable {
    /**
     * @notice Transfers tokens from one address to another (for settlement)
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param amount The amount to transfer
     * @return success Whether the transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool success);

    /**
     * @notice Checks if an account is blocked from transfers
     * @param account The account to check
     * @return blocked Whether the account is blocked
     */
    function isBlocked(address account) external view returns (bool blocked);

    /**
     * @notice Checks if the token contract is paused
     * @return paused Whether transfers are paused
     */
    function paused() external view returns (bool paused);
}
