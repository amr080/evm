// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IBond {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(address from, uint256 amount) external;
}

interface IShare {
    function mint(address to, uint256 amount) external;
}

contract XFTCorpActionFacility {
    error NotOwner();
    error ZeroAddress();
    error NotConfigured();
    error BadRatio();
    error BadAmount();
    error TransferFailed();
    error Reentrancy();

    event ConversionSet(address indexed bond, address indexed share, uint256 shareQty, uint256 denom);
    event ConversionRemoved(address indexed bond);
    event Converted(address indexed user, address indexed bond, address indexed share, uint256 bondIn, uint256 sharesOut);

    struct Terms {
        address share;
        uint256 shareQty;
        uint256 denom;
        bool exists;
    }

    address public owner;
    mapping(address => Terms) public terms;
    address[] public bonds;

    uint256 private locked = 1;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    constructor(address _owner) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    function setConversion(address bond, address share, uint256 shareQty, uint256 denom) external onlyOwner {
        if (bond == address(0) || share == address(0)) revert ZeroAddress();
        if (shareQty == 0 || denom == 0) revert BadRatio();

        bool isNew = !terms[bond].exists;
        terms[bond] = Terms({share: share, shareQty: shareQty, denom: denom, exists: true});
        if (isNew) bonds.push(bond);

        emit ConversionSet(bond, share, shareQty, denom);
    }

    function removeConversion(address bond) external onlyOwner {
        if (!terms[bond].exists) revert NotConfigured();

        delete terms[bond];

        uint256 n = bonds.length;
        for (uint256 i = 0; i < n; i++) {
            if (bonds[i] == bond) {
                bonds[i] = bonds[n - 1];
                bonds.pop();
                break;
            }
        }

        emit ConversionRemoved(bond);
    }

    function getAllBonds() external view returns (address[] memory) {
        return bonds;
    }

    function preview(address bond, uint256 bondIn) public view returns (uint256 sharesOut) {
        Terms memory t = terms[bond];
        if (!t.exists) revert NotConfigured();
        if (bondIn == 0) revert BadAmount();
        if (bondIn % t.denom != 0) revert BadAmount();
        sharesOut = (bondIn * t.shareQty) / t.denom;
        if (sharesOut == 0) revert BadAmount();
    }

    function convert(address bond, uint256 bondIn) external nonReentrant returns (uint256 sharesOut) {
        Terms memory t = terms[bond];
        if (!t.exists) revert NotConfigured();
        if (bondIn == 0) revert BadAmount();
        if (bondIn % t.denom != 0) revert BadAmount();

        if (!IBond(bond).transferFrom(msg.sender, address(this), bondIn)) revert TransferFailed();

        sharesOut = (bondIn * t.shareQty) / t.denom;
        if (sharesOut == 0) revert BadAmount();

        IBond(bond).burn(address(this), bondIn);
        IShare(t.share).mint(msg.sender, sharesOut);

        emit Converted(msg.sender, bond, t.share, bondIn, sharesOut);
    }
}
