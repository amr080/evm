// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../tokens/Bond.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title XFTBondFactory
 * @author Alexander Reed, XFT Labs
 */
contract XFTBondFactory {
    address public immutable implementation;
    address public admin;
    address[] public allBonds;

    mapping(string => address) public symbolToProxy;

    event BondCreated(address indexed proxy, string name, string symbol, address owner);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(address _implementation) {
        require(_implementation != address(0), "invalid implementation");
        implementation = _implementation;
        admin = msg.sender;
    }

    function createBond(
        string memory name,
        string memory symbol,
        address owner,
        uint256 maturityDate,
        uint256 couponRate,
        address moduleRegistry
    ) external onlyAdmin returns (address proxy) {
        return _createBond(name, symbol, owner, maturityDate, couponRate, moduleRegistry);
    }

    function createBondsBatch(
        string[] calldata names,
        string[] calldata symbols,
        address[] calldata owners,
        uint256[] calldata maturityDates,
        uint256[] calldata couponRates,
        address[] calldata moduleRegistries
    ) external onlyAdmin returns (address[] memory proxies) {
        uint256 len = names.length;
        require(
            len == symbols.length && 
            len == owners.length && 
            len == maturityDates.length && 
            len == couponRates.length && 
            len == moduleRegistries.length,
            "length mismatch"
        );
        require(len > 0, "empty arrays");

        proxies = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            proxies[i] = _createBond(
                names[i],
                symbols[i],
                owners[i],
                maturityDates[i],
                couponRates[i],
                moduleRegistries[i]
            );
        }
    }

    function _createBond(
        string memory name,
        string memory symbol,
        address owner,
        uint256 maturityDate,
        uint256 couponRate,
        address moduleRegistry
    ) internal returns (address proxy) {
        require(symbolToProxy[symbol] == address(0), "symbol exists");
        require(owner != address(0), "invalid owner");
        require(moduleRegistry != address(0), "invalid moduleRegistry");

        bytes memory data = abi.encodeWithSignature(
            "initialize(string,string,address,uint256,uint256,address)",
            name,
            symbol,
            owner,
            maturityDate,
            couponRate,
            moduleRegistry
        );
        proxy = address(new ERC1967Proxy(implementation, data));
        allBonds.push(proxy);
        symbolToProxy[symbol] = proxy;
        emit BondCreated(proxy, name, symbol, owner);
    }

    function getBonds() external view returns (address[] memory) {
        return allBonds;
    }

    function getBondsCount() external view returns (uint256) {
        return allBonds.length;
    }

    function getBondBySymbol(string memory symbol) external view returns (address) {
        return symbolToProxy[symbol];
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "invalid admin");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}