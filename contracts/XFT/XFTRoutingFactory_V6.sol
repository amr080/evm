// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract RoutingWallet {
    address public factory;
    address public owner;
    event WalletTransfer(address indexed token, address indexed to, uint256 amount);
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner || msg.sender == factory, "not authorized");
        _;
    }
    constructor(address _owner) {
        factory = msg.sender;
        owner = _owner;
    }
    function transfer(address token, address to, uint256 amount) external onlyOwnerOrFactory {
        require(IERC20(token).transfer(to, amount), "transfer failed");
        emit WalletTransfer(token, to, amount);
    }
    function balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}

contract XFTRoutingFactoryV6 {
    IERC20 public immutable token;
    address public operator;
    mapping(bytes32 => mapping(bytes32 => address)) private wallets;
    
    // Rail constants
    bytes32 constant ROUTING = keccak256("ROUTING");
    bytes32 constant IBAN = keccak256("IBAN");
    bytes32 constant SWIFT = keccak256("SWIFT");
    bytes32 constant CIK = keccak256("CIK");
    bytes32 constant LEI = keccak256("LEI");
    bytes32 constant FEDNOW = keccak256("FEDNOW");
    bytes32 constant FEDWIRE = keccak256("FEDWIRE");
    bytes32 constant CHIPS = keccak256("CHIPS");
    bytes32 constant VISA = keccak256("VISA");
    bytes32 constant SUNPASS = keccak256("SUNPASS");
    bytes32 constant ACTCARD = keccak256("ACTCARD");
    bytes32 constant NCQUICKPASS = keccak256("NCQUICKPASS");
    bytes32 constant PAEZPASS = keccak256("PAEZPASS");
    bytes32 constant NJMYTRANSIT = keccak256("NJMYTRANSIT");
    bytes32 constant AMEX = keccak256("AMEX");
    bytes32 constant CITIBIKE = keccak256("CITIBIKE");
    
    // Recording
    struct WalletRec { string rail; string id; address wallet; }
    WalletRec[] private _allWallets;
    mapping(bytes32 => WalletRec[]) private _walletsByRail;
    
    function _record(string memory rail, string memory id, address wallet) internal {
        _allWallets.push(WalletRec(rail, id, wallet));
        _walletsByRail[keccak256(bytes(rail))].push(WalletRec(rail, id, wallet));
    }
    
    // Events
    event DeployWallet(string idType, string idValue, address wallet);
    event Mint(string idType, string idValue, address wallet, uint256 amount);
    event Burn(string idType, string idValue, address wallet, uint256 amount);
    event Transfer(string idType, string fromId, string toId, address fromWallet, address toWallet, uint256 amount);
    
    // Errors
    error NotOperator();
    error WalletExists();
    error WalletNotFound();
    modifier onlyOp() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }
    constructor(address _token) {
        token = IERC20(_token);
        operator = msg.sender;
    }
    
    // Helper to get rail name from constant
    function _railName(bytes32 rail) internal pure returns (string memory) {
        if (rail == ROUTING) return "ROUTING";
        if (rail == IBAN) return "IBAN";
        if (rail == SWIFT) return "SWIFT";
        if (rail == CIK) return "CIK";
        if (rail == LEI) return "LEI";
        if (rail == FEDNOW) return "FEDNOW";
        if (rail == FEDWIRE) return "FEDWIRE";
        if (rail == CHIPS) return "CHIPS";
        if (rail == VISA) return "VISA";
        if (rail == SUNPASS) return "SUNPASS";
        if (rail == ACTCARD) return "ACTCARD";
        if (rail == NCQUICKPASS) return "NCQUICKPASS";
        if (rail == PAEZPASS) return "PAEZPASS";
        if (rail == NJMYTRANSIT) return "NJMYTRANSIT";
        if (rail == AMEX) return "AMEX";
        if (rail == CITIBIKE) return "CITIBIKE";
        return "";
    }
    
    function _key(bytes32 rail, string memory id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(rail, id));
    }
    
    function _predict(bytes32 salt) internal view returns (address) {
        return address(uint160(uint256(keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(type(RoutingWallet).creationCode, abi.encode(operator)))
            )
        ))));
    }
    
    // GENERIC INTERNAL FUNCTIONS
    function _deployWallet(bytes32 rail, string memory id) internal returns (address wallet) {
        bytes32 key = _key(rail, id);
        if (wallets[rail][key] != address(0)) revert WalletExists();
        wallet = address(new RoutingWallet{salt: key}(operator));
        wallets[rail][key] = wallet;
        _record(_railName(rail), id, wallet);
        emit DeployWallet(_railName(rail), id, wallet);
    }
    
    function _mintTo(bytes32 rail, string memory id, uint256 amt) internal {
        bytes32 key = _key(rail, id);
        address wallet = wallets[rail][key];
        if (wallet == address(0)) wallet = _deployWallet(rail, id);
        token.mint(wallet, amt);
        emit Mint(_railName(rail), id, wallet, amt);
    }
    
    function _burnFrom(bytes32 rail, string memory id, uint256 amt) internal {
        bytes32 key = _key(rail, id);
        address wallet = wallets[rail][key];
        if (wallet == address(0)) revert WalletNotFound();
        token.burn(wallet, amt);
        emit Burn(_railName(rail), id, wallet, amt);
    }
    
    function _getWallet(bytes32 rail, string memory id) internal view returns (address) {
        return wallets[rail][_key(rail, id)];
    }
    
    function _predictWallet(bytes32 rail, string memory id) internal view returns (address) {
        return _predict(_key(rail, id));
    }
    
    function _transfer(bytes32 rail, string memory from, string memory to, uint256 amt) internal {
        bytes32 fromKey = _key(rail, from);
        bytes32 toKey = _key(rail, to);
        address fromWallet = wallets[rail][fromKey];
        address toWallet = wallets[rail][toKey];
        if (fromWallet == address(0) || toWallet == address(0)) revert WalletNotFound();
        RoutingWallet(fromWallet).transfer(address(token), toWallet, amt);
        emit Transfer(_railName(rail), from, to, fromWallet, toWallet, amt);
    }


    // ---------------- VISA ----------------
    function predictVISA(string memory visa) public view returns (address) {
        return _predictWallet(VISA, visa);
    }
    function deployVISAWallet(string memory visa) public onlyOp returns (address) {
        return _deployWallet(VISA, visa);
    }
    function mintToVISA(string memory visa, uint256 amt) external onlyOp {
        _mintTo(VISA, visa, amt);
    }
    function burnFromVISA(string memory visa, uint256 amt) external onlyOp {
        _burnFrom(VISA, visa, amt);
    }
    function getVISAWallet(string memory visa) external view returns (address) {
        return _getWallet(VISA, visa);
    }
    function transferVISA(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(VISA, from, to, amt);
    }
    function batchMintVISA(string[] memory visas, uint256[] memory amts) external onlyOp {
        require(visas.length == amts.length, "len mismatch");
        for (uint256 i = 0; i < visas.length; i++) {
            _mintTo(VISA, visas[i], amts[i]);
        }
    }

    // ---------------- CITIBIKE ----------------
    function predictCITIBIKE(string memory citibike) public view returns (address) {
        return _predictWallet(CITIBIKE, citibike);
    }
    function deployCITIBIKEWallet(string memory citibike) public onlyOp returns (address) {
        return _deployWallet(CITIBIKE, citibike);
    }
    function mintToCITIBIKE(string memory citibike, uint256 amt) external onlyOp {
        _mintTo(CITIBIKE, citibike, amt);
    }
    function burnFromCITIBIKE(string memory citibike, uint256 amt) external onlyOp {
        _burnFrom(CITIBIKE, citibike, amt);
    }
    function getCITIBIKEWallet(string memory citibike) external view returns (address) {
        return _getWallet(CITIBIKE, citibike);
    }
    function transferCITIBIKE(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(CITIBIKE, from, to, amt);
    }
    function getCitibikeWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[CITIBIKE];
    }

    // ---------------- AMEX ----------------
    function predictAMEX(string memory amex) public view returns (address) {
        return _predictWallet(AMEX, amex);
    }
    function deployAMEXWallet(string memory amex) public onlyOp returns (address) {
        return _deployWallet(AMEX, amex);
    }
    function mintToAMEX(string memory amex, uint256 amt) external onlyOp {
        _mintTo(AMEX, amex, amt);
    }
    function burnFromAMEX(string memory amex, uint256 amt) external onlyOp {
        _burnFrom(AMEX, amex, amt);
    }
    function getAMEXWallet(string memory amex) external view returns (address) {
        return _getWallet(AMEX, amex);
    }
    function transferAMEX(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(AMEX, from, to, amt);
    }
    function getAMEXWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[AMEX];
    }



    // ---------------- ROUTING ----------------
    function predictRouting(string memory routing) public view returns (address) {
        return _predictWallet(ROUTING, routing);
    }
    function deployRoutingWallet(string memory routing) public onlyOp returns (address) {
        return _deployWallet(ROUTING, routing);
    }
    function mintToRouting(string memory routing, uint256 amt) external onlyOp {
        _mintTo(ROUTING, routing, amt);
    }
    function burnFromRouting(string memory routing, uint256 amt) external onlyOp {
        _burnFrom(ROUTING, routing, amt);
    }
    function getRoutingWallet(string memory routing) external view returns (address) {
        return _getWallet(ROUTING, routing);
    }
    
    // ---------------- IBAN ----------------
    function predictIBAN(string memory iban) public view returns (address) {
        return _predictWallet(IBAN, iban);
    }
    function deployIBANWallet(string memory iban) public onlyOp returns (address) {
        return _deployWallet(IBAN, iban);
    }
    function mintToIBAN(string memory iban, uint256 amt) external onlyOp {
        _mintTo(IBAN, iban, amt);
    }
    function burnFromIBAN(string memory iban, uint256 amt) external onlyOp {
        _burnFrom(IBAN, iban, amt);
    }
    function getIBANWallet(string memory iban) external view returns (address) {
        return _getWallet(IBAN, iban);
    }
    
    // ---------------- SWIFT ----------------
    function predictSWIFT(string memory swift) public view returns (address) {
        return _predictWallet(SWIFT, swift);
    }
    function deploySWIFTWallet(string memory swift) public onlyOp returns (address) {
        return _deployWallet(SWIFT, swift);
    }
    function mintToSWIFT(string memory swift, uint256 amt) external onlyOp {
        _mintTo(SWIFT, swift, amt);
    }
    function burnFromSWIFT(string memory swift, uint256 amt) external onlyOp {
        _burnFrom(SWIFT, swift, amt);
    }
    function getSWIFTWallet(string memory swift) external view returns (address) {
        return _getWallet(SWIFT, swift);
    }
    
    // ---------------- CIK ----------------
    function predictCIK(string memory cik) public view returns (address) {
        return _predictWallet(CIK, cik);
    }
    function deployCIKWallet(string memory cik) public onlyOp returns (address) {
        return _deployWallet(CIK, cik);
    }
    function mintToCIK(string memory cik, uint256 amt) external onlyOp {
        _mintTo(CIK, cik, amt);
    }
    function burnFromCIK(string memory cik, uint256 amt) external onlyOp {
        _burnFrom(CIK, cik, amt);
    }
    function getCIKWallet(string memory cik) external view returns (address) {
        return _getWallet(CIK, cik);
    }
    
    // ---------------- LEI ----------------
    function predictLEI(string memory lei) public view returns (address) {
        return _predictWallet(LEI, lei);
    }
    function deployLEIWallet(string memory lei) public onlyOp returns (address) {
        return _deployWallet(LEI, lei);
    }
    function mintToLEI(string memory lei, uint256 amt) external onlyOp {
        _mintTo(LEI, lei, amt);
    }
    function burnFromLEI(string memory lei, uint256 amt) external onlyOp {
        _burnFrom(LEI, lei, amt);
    }
    function getLEIWallet(string memory lei) external view returns (address) {
        return _getWallet(LEI, lei);
    }
    
    // ---------------- FEDNOW ----------------
    function predictFEDNOW(string memory fednow) public view returns (address) {
        return _predictWallet(FEDNOW, fednow);
    }
    function deployFEDNOWWallet(string memory fednow) public onlyOp returns (address) {
        return _deployWallet(FEDNOW, fednow);
    }
    function mintToFEDNOW(string memory fednow, uint256 amt) external onlyOp {
        _mintTo(FEDNOW, fednow, amt);
    }
    function burnFromFEDNOW(string memory fednow, uint256 amt) external onlyOp {
        _burnFrom(FEDNOW, fednow, amt);
    }
    function getFEDNOWWallet(string memory fednow) external view returns (address) {
        return _getWallet(FEDNOW, fednow);
    }
    
    // ---------------- FEDWIRE ----------------
    function predictFEDWIRE(string memory fedwire) public view returns (address) {
        return _predictWallet(FEDWIRE, fedwire);
    }
    function deployFEDWIREWallet(string memory fedwire) public onlyOp returns (address) {
        return _deployWallet(FEDWIRE, fedwire);
    }
    function mintToFEDWIRE(string memory fedwire, uint256 amt) external onlyOp {
        _mintTo(FEDWIRE, fedwire, amt);
    }
    function burnFromFEDWIRE(string memory fedwire, uint256 amt) external onlyOp {
        _burnFrom(FEDWIRE, fedwire, amt);
    }
    function getFEDWIREWallet(string memory fedwire) external view returns (address) {
        return _getWallet(FEDWIRE, fedwire);
    }
    
    // ---------------- CHIPS ----------------
    function predictCHIPS(string memory chips) public view returns (address) {
        return _predictWallet(CHIPS, chips);
    }
    function deployCHIPSWallet(string memory chips) public onlyOp returns (address) {
        return _deployWallet(CHIPS, chips);
    }
    function mintToCHIPS(string memory chips, uint256 amt) external onlyOp {
        _mintTo(CHIPS, chips, amt);
    }
    function burnFromCHIPS(string memory chips, uint256 amt) external onlyOp {
        _burnFrom(CHIPS, chips, amt);
    }
    function getCHIPSWallet(string memory chips) external view returns (address) {
        return _getWallet(CHIPS, chips);
    }
    
    // ---------------- SUNPASS ----------------
    function predictSUNPASS(string memory sunpass) public view returns (address) {
        return _predictWallet(SUNPASS, sunpass);
    }
    function deploySUNPASSWallet(string memory sunpass) public onlyOp returns (address) {
        return _deployWallet(SUNPASS, sunpass);
    }
    function mintToSUNPASS(string memory sunpass, uint256 amt) external onlyOp {
        _mintTo(SUNPASS, sunpass, amt);
    }
    function burnFromSUNPASS(string memory sunpass, uint256 amt) external onlyOp {
        _burnFrom(SUNPASS, sunpass, amt);
    }
    function getSUNPASSWallet(string memory sunpass) external view returns (address) {
        return _getWallet(SUNPASS, sunpass);
    }
    function transferSUNPASS(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(SUNPASS, from, to, amt);
    }
    
    // ---------------- ACTCARD ----------------
    function predictACTCARD(string memory actcard) public view returns (address) {
        return _predictWallet(ACTCARD, actcard);
    }
    function deployACTCARDWallet(string memory actcard) public onlyOp returns (address) {
        return _deployWallet(ACTCARD, actcard);
    }
    function mintToACTCARD(string memory actcard, uint256 amt) external onlyOp {
        _mintTo(ACTCARD, actcard, amt);
    }
    function burnFromACTCARD(string memory actcard, uint256 amt) external onlyOp {
        _burnFrom(ACTCARD, actcard, amt);
    }
    function getACTCARDWallet(string memory actcard) external view returns (address) {
        return _getWallet(ACTCARD, actcard);
    }
    function transferACTCARD(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(ACTCARD, from, to, amt);
    }
    // ---------------- NCQUICKPASS ----------------
    function predictNCQUICKPASS(string memory ncquickpass) public view returns (address) {
        return _predictWallet(NCQUICKPASS, ncquickpass);
    }
    function deployNCQUICKPASSWallet(string memory ncquickpass) public onlyOp returns (address) {
        return _deployWallet(NCQUICKPASS, ncquickpass);
    }
    function mintToNCQUICKPASS(string memory ncquickpass, uint256 amt) external onlyOp {
        _mintTo(NCQUICKPASS, ncquickpass, amt);
    }
    function burnFromNCQUICKPASS(string memory ncquickpass, uint256 amt) external onlyOp {
        _burnFrom(NCQUICKPASS, ncquickpass, amt);
    }
    function getNCQUICKPASSWallet(string memory ncquickpass) external view returns (address) {
        return _getWallet(NCQUICKPASS, ncquickpass);
    }
    function transferNCQUICKPASS(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(NCQUICKPASS, from, to, amt);
    }
    
    // ---------------- PAEZPASS ----------------
    function predictPAEZPASS(string memory paezpass) public view returns (address) {
        return _predictWallet(PAEZPASS, paezpass);
    }
    function deployPAEZPASSWallet(string memory paezpass) public onlyOp returns (address) {
        return _deployWallet(PAEZPASS, paezpass);
    }
    function mintToPAEZPASS(string memory paezpass, uint256 amt) external onlyOp {
        _mintTo(PAEZPASS, paezpass, amt);
    }
    function burnFromPAEZPASS(string memory paezpass, uint256 amt) external onlyOp {
        _burnFrom(PAEZPASS, paezpass, amt);
    }
    function getPAEZPASSWallet(string memory paezpass) external view returns (address) {
        return _getWallet(PAEZPASS, paezpass);
    }
    function transferPAEZPASS(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(PAEZPASS, from, to, amt);
    }
    
    // ---------------- NJMYTRANSIT ----------------
    function predictNJMYTRANSIT(string memory njmytransit) public view returns (address) {
        return _predictWallet(NJMYTRANSIT, njmytransit);
    }
    function deployNJMYTRANSITWallet(string memory njmytransit) public onlyOp returns (address) {
        return _deployWallet(NJMYTRANSIT, njmytransit);
    }
    function mintToNJMYTRANSIT(string memory njmytransit, uint256 amt) external onlyOp {
        _mintTo(NJMYTRANSIT, njmytransit, amt);
    }
    function burnFromNJMYTRANSIT(string memory njmytransit, uint256 amt) external onlyOp {
        _burnFrom(NJMYTRANSIT, njmytransit, amt);
    }
    function getNJMYTRANSITWallet(string memory njmytransit) external view returns (address) {
        return _getWallet(NJMYTRANSIT, njmytransit);
    }
    function transferNJMYTRANSIT(string memory from, string memory to, uint256 amt) external onlyOp {
        _transfer(NJMYTRANSIT, from, to, amt);
    }
    
    // ---------------- WALLET QUERIES ----------------
    function getAllWallets() external view returns (WalletRec[] memory) {
        return _allWallets;
    }
    function getWalletsByRail(string memory rail) external view returns (WalletRec[] memory) {
        return _walletsByRail[keccak256(bytes(rail))];
    }
    function getVisaWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[VISA];
    }
    function getSunPassWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[SUNPASS];
    }
    function getACTCardWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[ACTCARD];
    }
    function getNCQuickPassWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[NCQUICKPASS];
    }
    function getPAEZPASSWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[PAEZPASS];
    }
    function getNJMyTransitWallets() external view returns (WalletRec[] memory) {
        return _walletsByRail[NJMYTRANSIT];
    }
    function getAllRails() external pure returns (string[] memory) {
        string[] memory rails = new string[](16);
        rails[0]  = "ROUTING";
        rails[1]  = "IBAN";
        rails[2]  = "SWIFT";
        rails[3]  = "CIK";
        rails[4]  = "LEI";
        rails[5]  = "FEDNOW";
        rails[6]  = "FEDWIRE";
        rails[7]  = "CHIPS";
        rails[8]  = "VISA";
        rails[9]  = "SUNPASS";
        rails[10] = "ACTCARD";
        rails[11] = "NCQUICKPASS";
        rails[12] = "PAEZPASS";
        rails[13] = "NJMYTRANSIT";
        rails[14] = "AMEX";
        rails[15] = "CITIBIKE";
        return rails;
    }
}