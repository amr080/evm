// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../tokens/Deposit.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title XFTDepositFactory
 * @dev Factory contract to deploy Deposit proxies
 * @author Alexander Reed, XFT Labs 
 */
contract XFTDepositFactory {
    address public immutable implementation;
    address public admin;
    address[] public allDeposits;

    // Symbol to deployed proxy mapping
    mapping(string => address) public symbolToProxy;

    // Emitted on every proxy creation
    event DepositCreated(address indexed proxy, string name, string symbol, address owner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    /**
     * @param _implementation The address of the deployed Deposit logic contract
     */
    constructor(address _implementation) {
        require(_implementation != address(0), "invalid implementation");
        implementation = _implementation;
        admin = msg.sender;
    }

    /**
     * @notice Deploy a new Deposit proxy with name, symbol, owner
     * @param name The name of the new token
     * @param symbol The symbol of the new token
     * @param owner The admin/owner for the new Deposit proxy
     */
    function createDeposit(string memory name, string memory symbol, address owner)
        external
        onlyAdmin
        returns (address proxy)
    {
        require(symbolToProxy[symbol] == address(0), "symbol exists");
        require(owner != address(0), "invalid owner");
        bytes memory data = abi.encodeWithSignature(
            "initialize(string,string,address)",
            name,
            symbol,
            owner
        );
        proxy = address(new ERC1967Proxy(implementation, data));
        allDeposits.push(proxy);
        symbolToProxy[symbol] = proxy;
        emit DepositCreated(proxy, name, symbol, owner);
    }

    /**
     * @notice Returns all Deposit proxies deployed by this factory
     */
    function getDeposits() external view returns (address[] memory) {
        return allDeposits;
    }

    /**
     * @notice Returns Deposit proxy for given symbol, or address(0) if not exists
     */
    function getDepositBySymbol(string memory symbol) external view returns (address) {
        return symbolToProxy[symbol];
    }

    /**
     * @notice Transfer admin to a new address
     * @param newAdmin The new admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "invalid admin");
        admin = newAdmin;
    }
}
