# TransferAgentModule

## Purpose
Settlement, dividend distribution, balance adjustments, account recovery

## Inheritance
- BaseModule
- AccessControlEnumerableUpgradeable
- ITransferAgentExt
- IRecovery
- ITransferAgentXChain

## Constants
```
MAX_ACCOUNT_PAGE_SIZE = 50
MAX_TX_PAGE_SIZE = 50
MAX_CX_TX_PAGE_SIZE = 10
```

## Storage
```
TokenRegistry public tokenRegistry
MoneyMarketFund public moneyMarketFund
string public tokenId
```

## Functions

### Dividend Distribution

**distributeDividends(address[] accounts, uint256 date, int256 rate, uint256 price)**
- onlyAdmin
- Update token price
- For each account:
  - Calculate dividend shares from balance × rate
  - If rate > 0: mint shares (positive yield)
  - If rate < 0: burn shares (negative yield)
- Emit DividendDistributed

**distributeDividends(address[] accounts, uint256[] adjustedShares, uint256 date, int256 rate, uint256 price)**
- onlyAdmin
- Same as above but uses adjustedShares instead of balanceOf
- Allows adjustment for specific accounts

### Transaction Settlement

**settleTransactions(address[] accounts, bytes32[] txIds, uint256 date, uint256 price)**
- onlyAdmin
- Update token price
- For each account:
  - Get pending transactions
  - For each tx with date ≤ settlement date:
    - CASH_PURCHASE or AIP: mint shares
    - CASH_LIQUIDATION: burn shares
    - FULL_LIQUIDATION: burn entire balance
    - SHARE_TRANSFER: transfer shares
  - Clear settled transactions
- Emit TransactionSettled or TransferSettled

### End of Day Settlement

**endOfDay(address[] accounts, bytes32[] txIds, uint256 date, int256 rate, uint256 price)**
- onlyAdmin
- Combined dividend distribution + transaction settlement
- For each account:
  1. Distribute dividends
  2. Settle transactions
- Emit DividendDistributed and TransactionSettled

**endOfDay(address[] accounts, uint256[] adjustedShares, bytes32[] txIds, uint256 date, int256 rate, uint256 price)**
- Same as above but with adjustedShares parameter

### Cross-Chain Settlement

**settleCXTransaction(address account, bytes32 requestId, uint256 date, uint256 price)**
- onlyAdmin
- Settle single cross-chain transaction
- CXFER_OUT: burn shares
- CXFER_IN: mint shares

**settleCXTransactions(address account, bytes32[] requestIds, uint256 date, uint256 price)**
- onlyAdmin
- Batch settle cross-chain transactions

### Balance Adjustments

**adjustBalance(address account, uint256 currentBalance, uint256 newBalance, string memo)**
- onlyAdmin
- onlyShareholder(account)
- Verify currentBalance matches actual balance
- If decreasing: burn difference
- If increasing: mint difference
- Emit BalanceAdjusted

### Account Recovery

**recoverAccount(address from, address to, string memo)**
- onlyAdmin
- Requires no pending transactions on old account
- Transfer entire balance from → to
- Remove authorization from old account
- Emit AccountRecovered

**recoverAsset(address from, address to, uint256 amount, string memo)**
- onlyAdmin
- Both accounts must be authorized
- Transfer specified amount from → to
- Emit AssetRecovered

### Internal Helpers

**_payDividend(address account, uint256 dividendShares)**
- Internal virtual
- Mint shares to account

**_handleNegativeYield(address account, uint256 balance, uint256 dividendShares)**
- Internal
- Burn shares from account (capped at balance)

**_processDividends(address account, uint256 balance, uint256 date, int256 rate, uint256 price)**
- Internal virtual
- Calculate dividend amount and shares
- Call _payDividend or _handleNegativeYield
- Emit DividendDistributed

**_processSettlements(bytes32[] txIds, address account, uint256 date, uint256 price)**
- Internal virtual
- Get pending transactions
- Filter by settlement date
- Mint/burn based on transaction type
- Clear settled transactions

**_processCXSettlement(address account, bytes32 requestId, uint256 date, uint256 price)**
- Internal virtual
- Settle CXFER_OUT or CXFER_IN transactions

**_handleBalanceDecrease(address account, uint256 date, uint256 amount, uint256 price, bytes32 txId, TransactionType txType)**
- Internal virtual
- Burn shares for liquidations or cross-chain out
- FULL_LIQUIDATION: burn entire balance
- Others: calculate shares from amount/price

**_handleBalanceIncrease(address account, uint256 date, uint256 amount, uint256 price, bytes32 txId, TransactionType txType)**
- Internal virtual
- Calculate shares from amount/price
- Mint shares to account

**_handlePurchaseSettlement(bytes32[] txIds, address account, uint256 date, uint256 amount, uint256 price, bytes32 txId, TransactionType txType)**
- Internal virtual
- Filter transactions by whitelist (if provided)
- Call _handleBalanceIncrease
- Clear transaction storage

**_isTypeSupported(TransactionType txType) returns bool**
- Internal pure virtual
- Returns true for supported transaction types

**_isPurchase(TransactionType txType) returns bool**
- Internal pure virtual
- Returns true for AIP or CASH_PURCHASE

**_isLiquidation(TransactionType txType) returns bool**
- Internal pure virtual
- Returns true for CASH_LIQUIDATION or FULL_LIQUIDATION

**_getQuantityOfTokens(uint256 scaleFactor, uint256 amount, uint256 price) returns uint256**
- Internal pure virtual
- Calculate shares: (amount × scaleFactor) / price

**abs(int x) returns int**
- Internal pure virtual
- Absolute value

**getVersion() returns uint8**
- Returns 5

## Events
```
DividendDistributed(address indexed account, uint256 indexed date, int256 rate, uint256 price, uint256 shares, uint256 dividendCashAmount, uint256 dividendBasis, bool isNegativeYield)

TransactionSettled(address indexed account, uint256 indexed date, uint8 indexed transactionType, bytes32 transactionId, uint256 price, uint256 amount, uint256 shares)

TransferSettled(address indexed from, address indexed to, uint256 indexed date, uint8 transactionType, bytes32 transactionId, uint256 price, uint256 shares)

BalanceAdjusted(address indexed account, uint256 amount, string memo)

AccountRecovered(address indexed fromAccount, address indexed toAccount, uint256 amount, string memo)

AssetRecovered(address indexed fromAccount, address indexed toAccount, uint256 amount, string memo)
```

## Dependencies
- AuthorizationModule - check authorization, admin status
- TransactionalModule - get/clear pending transactions
- TokenRegistry - get token address
- MoneyMarketFund - mint/burn/transfer shares

## Settlement Flow
```
1. Admin calls endOfDay with accounts, txIds, date, rate, price
2. For each account:
   a. Distribute dividends (mint/burn based on rate)
   b. Get pending transactions from TransactionalModule
   c. Filter transactions by settlement date
   d. Mint shares for purchases
   e. Burn shares for liquidations
   f. Transfer shares for transfers
   g. Clear settled transactions from TransactionalModule
3. Emit events for audit trail
```