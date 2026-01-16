// SPDX-License-Identifier: Business Source License 1.1
pragma solidity 0.8.18;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {BaseModule} from "./BaseModule.sol";

import {IAuthorization} from "../interfaces/IAuthorization.sol";
import {IAdminTransfer} from "../interfaces/IAdminTransfer.sol";
import {ITransactionStorage} from "../interfaces/TransactionIfaces.sol";
import {IExtendedTransactionDetail} from "../interfaces/TransactionIfaces.sol";
import {ITransferAgentExt} from "../interfaces/ITransferAgentExt.sol";
import {ITransferAgentXChain} from "../interfaces/ITransferAgentXChain.sol";
import {IRecovery} from "../interfaces/IRecovery.sol";
import {IAccountManager} from "../interfaces/IAccountManager.sol";
import {MoneyMarketFund} from "./tokens/MoneyMarketFund.sol";
import {TokenRegistry} from "./TokenRegistry.sol";

contract TransferAgentModule is
    BaseModule,
    AccessControlEnumerableUpgradeable,
    ITransferAgentExt,
    IRecovery,
    ITransferAgentXChain
{
    bytes32 public constant MODULE_ID = keccak256("MODULE_TRANSFER_AGENT");
    bytes32 public constant ROLE_MODULE_OWNER = keccak256("ROLE_MODULE_OWNER");
    bytes32 constant AUTHORIZATION_MODULE = keccak256("MODULE_AUTHORIZATION");
    bytes32 constant TRANSACTIONAL_MODULE = keccak256("MODULE_TRANSACTIONAL");

    uint256 public constant MAX_ACCOUNT_PAGE_SIZE = 50;
    uint256 public constant MAX_TX_PAGE_SIZE = 50;
    uint256 public constant MAX_CX_TX_PAGE_SIZE = 10;

    TokenRegistry public tokenRegistry;
    MoneyMarketFund public moneyMarketFund;
    string public tokenId;

    // -------------------- custom errors (replaces revert strings) --------------------
    error CallerNotAdmin();
    error ShareholderDoesNotExist();
    error InvalidDivRate();
    error InvalidPaginationSize();
    error ArrayLengthMismatch();
    error InvalidPrice();
    error InvalidTransactionType();
    error CurrentBalanceMismatch();
    error NoAdjustmentRequired();
    error PendingTransactionsExist();
    error AccountHasNoBalance();
    error NotEnoughBalance();
    error ArithmeticOverflow();

    // -------------------- events --------------------
    event DividendDistributed(
        address indexed account,
        uint256 indexed date,
        int256 rate,
        uint256 price,
        uint256 shares,
        uint256 dividendCashAmount,
        uint256 dividendBasis,
        bool isNegativeYield
    );

    event TransactionSettled(
        address indexed account,
        uint256 indexed date,
        uint8 indexed transactionType,
        bytes32 transactionId,
        uint256 price,
        uint256 amount,
        uint256 shares
    );

    event TransferSettled(
        address indexed from,
        address indexed to,
        uint256 indexed date,
        uint8 transactionType,
        bytes32 transactionId,
        uint256 price,
        uint256 shares
    );

    event BalanceAdjusted(address indexed account, uint256 amount, string memo);

    event AccountRecovered(
        address indexed fromAccount,
        address indexed toAccount,
        uint256 amount,
        string memo
    );

    event AssetRecovered(
        address indexed fromAccount,
        address indexed toAccount,
        uint256 amount,
        string memo
    );

    // -------------------- constructor / upgrades --------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _moduleRegistry,
        address _tokenRegistry,
        string memory _defaultTokenId,
        address _moduleOwner
    ) public initializer {
        require(_moduleRegistry != address(0), "INVALID_REGISTRY_ADDRESS");
        require(_tokenRegistry != address(0), "INVALID_REGISTRY_ADDRESS");
        require(_moduleOwner != address(0), "INVALID_ADDRESS");
        __BaseModule_init(_moduleRegistry);
        __AccessControlEnumerable_init();
        tokenRegistry = TokenRegistry(_tokenRegistry);
        tokenId = _defaultTokenId;
        address tokenAddr = tokenRegistry.getTokenAddress(tokenId);
        require(tokenAddr != address(0), "INVALID_TOKEN_ADDRESS");
        moneyMarketFund = MoneyMarketFund(tokenAddr);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _moduleOwner);
        _setRoleAdmin(ROLE_MODULE_OWNER, ROLE_MODULE_OWNER);
        _grantRole(ROLE_MODULE_OWNER, _moduleOwner);
    }

    function _authorizeUpgrade(address) internal virtual override onlyRole(ROLE_MODULE_OWNER) {}

    function getVersion() external pure virtual override returns (uint8) {
        return 5;
    }

    // -------------------- internal guards (replaces modifiers) --------------------
    function _checkAdmin() internal view {
        address authAddr = modules.getModuleAddress(AUTHORIZATION_MODULE);
        if (!IAuthorization(authAddr).isAdminAccount(msg.sender)) revert CallerNotAdmin();
    }

    function _checkShareholderExists(address account) internal view {
        address authAddr = modules.getModuleAddress(AUTHORIZATION_MODULE);
        if (!IAuthorization(authAddr).isAccountAuthorized(account)) revert ShareholderDoesNotExist();
    }

    function _checkValidRate(int256 rate) internal pure {
        if (rate == 0) revert InvalidDivRate();
    }

    function _checkMax(uint256 len, uint256 maxLen) internal pure {
        if (len > maxLen) revert InvalidPaginationSize();
    }

    // -------------------- TA operations (keep signatures; route to shared internals) --------------------

    function distributeDividends(
        address[] memory accounts,
        uint256 date,
        int256 rate,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkValidRate(rate);
        _checkMax(accounts.length, MAX_ACCOUNT_PAGE_SIZE);

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < accounts.length; ) {
            uint256 bal = moneyMarketFund.balanceOf(accounts[i]);
            _processDividends(accounts[i], bal, date, rate, price);
            unchecked { ++i; }
        }
    }

    function distributeDividends(
        address[] calldata accounts,
        uint256[] calldata adjustedShares,
        uint256 date,
        int256 rate,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkValidRate(rate);
        _checkMax(accounts.length, MAX_ACCOUNT_PAGE_SIZE);
        _checkMax(adjustedShares.length, MAX_ACCOUNT_PAGE_SIZE);
        if (accounts.length != adjustedShares.length) revert ArrayLengthMismatch();

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < accounts.length; ) {
            uint256 bal = adjustedShares[i] == 0
                ? moneyMarketFund.balanceOf(accounts[i])
                : adjustedShares[i];
            _processDividends(accounts[i], bal, date, rate, price);
            unchecked { ++i; }
        }
    }

    function endOfDay(
        address[] calldata accounts,
        bytes32[] calldata txIds,
        uint256 date,
        int256 rate,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkValidRate(rate);
        _checkMax(accounts.length, MAX_ACCOUNT_PAGE_SIZE);
        _checkMax(txIds.length, MAX_TX_PAGE_SIZE);

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < accounts.length; ) {
            uint256 bal = moneyMarketFund.balanceOf(accounts[i]);
            _processDividends(accounts[i], bal, date, rate, price);
            _processSettlements(txIds, accounts[i], date, price);
            unchecked { ++i; }
        }
    }

    function endOfDay(
        address[] calldata accounts,
        uint256[] calldata adjustedShares,
        bytes32[] calldata txIds,
        uint256 date,
        int256 rate,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkValidRate(rate);
        _checkMax(accounts.length, MAX_ACCOUNT_PAGE_SIZE);
        _checkMax(adjustedShares.length, MAX_ACCOUNT_PAGE_SIZE);
        _checkMax(txIds.length, MAX_TX_PAGE_SIZE);
        if (accounts.length != adjustedShares.length) revert ArrayLengthMismatch();

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < accounts.length; ) {
            uint256 bal = adjustedShares[i] == 0
                ? moneyMarketFund.balanceOf(accounts[i])
                : adjustedShares[i];
            _processDividends(accounts[i], bal, date, rate, price);
            _processSettlements(txIds, accounts[i], date, price);
            unchecked { ++i; }
        }
    }

    function settleTransactions(
        address[] calldata accounts,
        bytes32[] calldata txIds,
        uint256 date,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkMax(accounts.length, MAX_ACCOUNT_PAGE_SIZE);
        _checkMax(txIds.length, MAX_TX_PAGE_SIZE);

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < accounts.length; ) {
            _processSettlements(txIds, accounts[i], date, price);
            unchecked { ++i; }
        }
    }

    // -------------------- TA Cross-chain operations --------------------

    function settleCXTransactions(
        address account,
        bytes32[] memory requestIds,
        uint256 date,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkShareholderExists(account);
        _checkMax(requestIds.length, MAX_CX_TX_PAGE_SIZE);

        moneyMarketFund.updateLastKnownPrice(price);
        for (uint256 i; i < requestIds.length; ) {
            _processCXSettlement(account, requestIds[i], date, price);
            unchecked { ++i; }
        }
    }

    function settleCXTransaction(
        address account,
        bytes32 requestId,
        uint256 date,
        uint256 price
    ) external virtual override {
        _checkAdmin();
        _checkShareholderExists(account);

        moneyMarketFund.updateLastKnownPrice(price);
        _processCXSettlement(account, requestId, date, price);
    }

    // -------------------- TA Admin operations --------------------

    function adjustBalance(
        address account,
        uint256 currentBalance,
        uint256 newBalance,
        string memory memo
    ) external virtual override {
        _checkAdmin();
        _checkShareholderExists(account);

        uint256 actual = moneyMarketFund.balanceOf(account);
        if (currentBalance != actual) revert CurrentBalanceMismatch();
        if (newBalance == actual) revert NoAdjustmentRequired();

        if (currentBalance > newBalance) {
            uint256 delta = currentBalance - newBalance;
            moneyMarketFund.burnShares(account, delta);
            emit BalanceAdjusted(account, delta, memo);
        } else {
            uint256 delta = newBalance - currentBalance;
            moneyMarketFund.mintShares(account, delta);
            emit BalanceAdjusted(account, delta, memo);
        }
    }

    function recoverAccount(
        address from,
        address to,
        string memory memo
    ) external virtual override {
        _checkAdmin();

        address txStore = modules.getModuleAddress(TRANSACTIONAL_MODULE);
        if (ITransactionStorage(txStore).hasTransactions(from)) revert PendingTransactionsExist();

        uint256 bal = moneyMarketFund.getShareHoldings(from);
        if (bal == 0) revert AccountHasNoBalance();

        IAdminTransfer(address(moneyMarketFund)).transferShares(from, to, bal);

        address authAddr = modules.getModuleAddress(AUTHORIZATION_MODULE);
        IAccountManager(authAddr).removeAccountPostRecovery(from, to);

        emit AccountRecovered(from, to, bal, memo);
    }

    function recoverAsset(
        address from,
        address to,
        uint256 amount,
        string memory memo
    ) external virtual override {
        _checkAdmin();

        address authAddr = modules.getModuleAddress(AUTHORIZATION_MODULE);
        IAuthorization A = IAuthorization(authAddr);
        if (!A.isAccountAuthorized(from) || !A.isAccountAuthorized(to)) revert ShareholderDoesNotExist();

        uint256 bal = moneyMarketFund.getShareHoldings(from);
        if (bal < amount) revert NotEnoughBalance();

        IAdminTransfer(address(moneyMarketFund)).transferShares(from, to, amount);

        emit AssetRecovered(from, to, amount, memo);
    }

    // -------------------- Dividends internals --------------------

    function _payDividend(address account, uint256 dividendShares) internal virtual {
        moneyMarketFund.mintShares(account, dividendShares);
    }

    function _handleNegativeYield(address account, uint256 balance, uint256 dividendShares) internal {
        uint256 negativeYield = dividendShares < balance ? dividendShares : balance;
        moneyMarketFund.burnShares(account, negativeYield);
    }

    function _processDividends(
        address account,
        uint256 balance,
        uint256 date,
        int256 rate,
        uint256 price
    ) internal virtual {
        if (price == 0) revert InvalidPrice();
        if (balance == 0) return;

        uint256 dividendAmount = balance * uint256(abs(rate));
        uint256 dividendShares = dividendAmount / price;
        uint256 scaleFactor = moneyMarketFund.NUMBER_SCALE_FACTOR();

        bool isNegativeYield;
        if (rate > 0) {
            isNegativeYield = false;
            _payDividend(account, dividendShares);
        } else {
            isNegativeYield = true;
            _handleNegativeYield(account, balance, dividendShares);
        }

        emit DividendDistributed(
            account,
            date,
            rate,
            price,
            dividendShares,
            dividendAmount / scaleFactor,
            balance,
            isNegativeYield
        );
    }

    // -------------------- Transactions internals (refactored for size) --------------------

    function _processSettlements(
        bytes32[] calldata txIds,
        address account,
        uint256 date,
        uint256 price
    ) internal virtual {
        address txStore = modules.getModuleAddress(TRANSACTIONAL_MODULE);
        ITransactionStorage ts = ITransactionStorage(txStore);

        if (!ts.hasTransactions(account)) return;

        IExtendedTransactionDetail td = IExtendedTransactionDetail(txStore);

        bytes32[] memory pendingTxs = ts.getAccountTransactions(account);
        for (uint256 i; i < pendingTxs.length; ) {
            bytes32 id = pendingTxs[i];

            (uint8 txType, address source, address destination, uint256 txDate, uint256 amount,) =
                td.getExtendedTransactionDetail(id);

            // Process transactions on or before settlement date (allow same-day settlement)
            if (txDate > date) { unchecked { ++i; } continue; }

            ITransactionStorage.TransactionType t = ITransactionStorage.TransactionType(txType);
            if (!_isTypeSupported(t)) revert InvalidTransactionType();

            if (t == ITransactionStorage.TransactionType.SHARE_TRANSFER) {
                IAdminTransfer(tokenRegistry.getTokenAddress(tokenId)).transferShares(source, destination, amount);
                ts.clearTransactionStorage(account, id);
                emit TransferSettled(source, destination, date, txType, id, price, amount);
            } else if (_isLiquidation(t)) {
                _handleBalanceDecrease(account, date, amount, price, id, t);
                ts.clearTransactionStorage(account, id);
            } else if (_isPurchase(t)) {
                _handlePurchaseSettlement(txIds, account, date, amount, price, id, t);
            }

            unchecked { ++i; }
        }

        ts.unlistFromAccountsWithPendingTransactions(account);
    }

    function _processCXSettlement(
        address account,
        bytes32 requestId,
        uint256 date,
        uint256 price
    ) internal virtual {
        address txStore = modules.getModuleAddress(TRANSACTIONAL_MODULE);
        ITransactionStorage ts = ITransactionStorage(txStore);

        if (!ts.hasTransactions(account)) return;

        IExtendedTransactionDetail td = IExtendedTransactionDetail(txStore);

        (uint8 txType,, , uint256 txDate, uint256 amount,) =
            td.getExtendedTransactionDetail(requestId);

        if (txDate > date) return;

        ITransactionStorage.TransactionType t = ITransactionStorage.TransactionType(txType);
        if (!_isTypeSupported(t)) revert InvalidTransactionType();

        if (t == ITransactionStorage.TransactionType.CXFER_OUT) {
            _handleBalanceDecrease(account, date, amount, price, requestId, t);
            ts.clearTransactionStorage(account, requestId);
        } else if (t == ITransactionStorage.TransactionType.CXFER_IN) {
            _handleBalanceIncrease(account, date, amount, price, requestId, t);
            ts.clearTransactionStorage(account, requestId);
        }

        ts.unlistFromAccountsWithPendingTransactions(account);
    }

    function _handleBalanceDecrease(
        address account,
        uint256 date,
        uint256 amount,
        uint256 price,
        bytes32 txId,
        ITransactionStorage.TransactionType txType
    ) internal virtual {
        uint256 scaleFactor = moneyMarketFund.NUMBER_SCALE_FACTOR();

        if (txType == ITransactionStorage.TransactionType.FULL_LIQUIDATION) {
            uint256 lastBalance = moneyMarketFund.balanceOf(account);
            moneyMarketFund.burnShares(account, lastBalance);
            emit TransactionSettled(
                account,
                date,
                uint8(txType),
                txId,
                price,
                (lastBalance * price) / scaleFactor,
                lastBalance
            );
        } else {
            uint256 shares = _getQuantityOfTokens(scaleFactor, amount, price);
            moneyMarketFund.burnShares(account, shares);
            emit TransactionSettled(account, date, uint8(txType), txId, price, amount, shares);
        }
    }

    function _handleBalanceIncrease(
        address account,
        uint256 date,
        uint256 amount,
        uint256 price,
        bytes32 txId,
        ITransactionStorage.TransactionType txType
    ) internal virtual {
        require(amount > 0, "INVALID_AMOUNT");
        require(price > 0, "INVALID_PRICE");
        uint256 shares = _getQuantityOfTokens(moneyMarketFund.NUMBER_SCALE_FACTOR(), amount, price);
        require(shares > 0, "INVALID_SHARES_CALCULATION");
        emit TransactionSettled(account, date, uint8(txType), txId, price, amount, shares);
        moneyMarketFund.mintShares(account, shares);
    }

    function _handlePurchaseSettlement(
        bytes32[] calldata txIds,
        address account,
        uint256 date,
        uint256 amount,
        uint256 price,
        bytes32 txId,
        ITransactionStorage.TransactionType txType
    ) internal virtual {
        // If txIds array provided, only process transactions in the array (whitelist)
        // If empty array, process all transactions (backward compatibility)
        if (txIds.length != 0) {
            bool found = false;
            for (uint256 i; i < txIds.length; ) {
                if (txIds[i] == txId) {
                    found = true;
                    break;
                }
                unchecked { ++i; }
            }
            if (!found) return; // Skip if txId not in whitelist
        }

        _handleBalanceIncrease(account, date, amount, price, txId, txType);

        address txStore = modules.getModuleAddress(TRANSACTIONAL_MODULE);
        ITransactionStorage(txStore).clearTransactionStorage(account, txId);
    }

    function _isTypeSupported(ITransactionStorage.TransactionType txType) internal pure virtual returns (bool) {
        return (
            txType == ITransactionStorage.TransactionType.AIP ||
            txType == ITransactionStorage.TransactionType.CASH_PURCHASE ||
            txType == ITransactionStorage.TransactionType.CASH_LIQUIDATION ||
            txType == ITransactionStorage.TransactionType.FULL_LIQUIDATION ||
            txType == ITransactionStorage.TransactionType.SHARE_TRANSFER ||
            txType == ITransactionStorage.TransactionType.CXFER_OUT ||
            txType == ITransactionStorage.TransactionType.CXFER_IN
        );
    }

    function _isPurchase(ITransactionStorage.TransactionType txType) internal pure virtual returns (bool) {
        return (txType == ITransactionStorage.TransactionType.AIP ||
                txType == ITransactionStorage.TransactionType.CASH_PURCHASE);
    }

    function _isLiquidation(ITransactionStorage.TransactionType txType) internal pure virtual returns (bool) {
        return (txType == ITransactionStorage.TransactionType.CASH_LIQUIDATION ||
                txType == ITransactionStorage.TransactionType.FULL_LIQUIDATION);
    }

    function _getQuantityOfTokens(uint256 scaleFactor, uint256 amount, uint256 price)
        internal
        pure
        virtual
        returns (uint256)
    {
        return (amount * scaleFactor) / price;
    }

    function abs(int x) internal pure virtual returns (int) {
        if (x == type(int256).min) revert ArithmeticOverflow();
        return x >= 0 ? x : -x;
    }
}
