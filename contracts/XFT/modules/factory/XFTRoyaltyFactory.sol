// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../tokens/Share.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title XFTRoyaltyFactory
 * @dev Factory contract to deploy Share proxies for tokenized music royalties.
 * @author Alexander Reed, XFT Labs 
 */
contract XFTRoyaltyFactory {
    address public immutable implementation;
    address public admin;
    address[] public allShares;

    // Symbol to deployed proxy mapping
    mapping(string => address) public symbolToProxy;

    // Emitted on every proxy creation
    event ShareCreated(address indexed proxy, string name, string symbol, address owner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    /**
     * @param _implementation The address of the deployed Share logic contract
     */
    constructor(address _implementation) {
        require(_implementation != address(0), "invalid implementation");
        implementation = _implementation;
        admin = msg.sender;
    }

    /**
     * @notice Deploy a new Share proxy with name, symbol, owner
     * @param name The name of the new token
     * @param symbol The symbol of the new token
     * @param owner The admin/owner for the new Share proxy
     */
    function createShare(string memory name, string memory symbol, address owner)
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
        allShares.push(proxy);
        symbolToProxy[symbol] = proxy;
        emit ShareCreated(proxy, name, symbol, owner);
    }

    /**
     * @notice Returns all Share proxies deployed by this factory
     */
    function getShares() external view returns (address[] memory) {
        return allShares;
    }

    /**
     * @notice Returns Share proxy for given symbol, or address(0) if not exists
     */
    function getShareBySymbol(string memory symbol) external view returns (address) {
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
