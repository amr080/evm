# TransactionalModule

## Purpose
Pending transaction queue for purchase, liquidation, transfer requests

## Inheritance
- BaseModule
- AccessControlEnumerableUpgradeable
- IShareholderTransaction
- IShareholderSelfServiceTransaction
- IShareholderTransferTransaction
- IShareholderSelfServiceTransferTransaction
- ITransferAgentTransaction
- IExtendedTransactionDetail
- ICancellableTransaction
- ICancellableSelfServiceTransaction

## Transaction Types
```
INVALID = 0
CASH_PURCHASE = 1
CASH_LIQUIDATION = 2
FULL_LIQUIDATION = 3
AIP = 4 (Automatic Investment Plan)
SHARE_TRANSFER = 5
CXFER_OUT = 6 (Cross-chain transfer out)
CXFER_IN = 7 (Cross-chain transfer in)
```

## Storage
```
bool isSelfServiceOn
uint256 requestsCounter
mapping(bytes32 => ExtendedTransactionDetail) transactionDetailMap
mapping(address => EnumerableSet.Bytes32Set) pendingTransactionsMap
EnumerableSet.AddressSet accountsWithTransactions
TokenRegistry tokenRegistry
string tokenId
```

### ExtendedTransactionDetail
```
TransactionType txType
address source
address destination
uint256 date
uint256 amount
bool selfService
```

## Functions

### Self Service Control

**enableSelfService()**
- onlyAdmin
- Set isSelfServiceOn = true

**disableSelfService()**
- onlyAdmin
- Set isSelfServiceOn = false

**isSelfServiceEnabled() returns bool**
- Returns isSelfServiceOn

### Self Service Transactions

**requestSelfServiceCashPurchase(uint256 amount)**
- onlyWithSelfServiceOn
- onlyShareholderAsMsgSender
- accountNotFrozen
- Create CASH_PURCHASE transaction

**requestSelfServiceCashLiquidation(uint256 amount)**
- onlyWithSelfServiceOn
- onlyShareholderAsMsgSender
- accountNotFrozen
- Requires sufficient balance
- Create CASH_LIQUIDATION transaction

**requestSelfServiceFullLiquidation()**
- onlyWithSelfServiceOn
- onlyShareholderAsMsgSender
- accountNotFrozen
- Requires balance > 0
- Create FULL_LIQUIDATION transaction

**requestSelfServiceShareTransfer(uint256 amount, address destination)**
- onlyWithSelfServiceOn
- onlyShareholderAsMsgSender
- onlyShareholder(destination)
- accountNotFrozen(both accounts)
- Requires sufficient balance
- Create SHARE_TRANSFER transaction

**cancelSelfServiceRequest(bytes32 requestId, string memo)**
- onlyShareholderAsMsgSender
- Remove transaction from storage
- Emit TransactionCancelled

### Admin Transactions

**requestCashPurchase(address account, uint256 date, uint256 amount)**
- onlyAdmin
- onlyShareholder(account)
- accountNotFrozen
- Create CASH_PURCHASE transaction

**requestCashLiquidation(address account, uint256 date, uint256 amount)**
- onlyAdmin
- onlyShareholder(account)
- accountNotFrozen
- Requires sufficient balance
- Create CASH_LIQUIDATION transaction

**requestFullLiquidation(address account, uint256 date)**
- onlyAdmin
- onlyShareholder(account)
- accountNotFrozen
- Requires balance > 0
- Create FULL_LIQUIDATION transaction

**requestShareTransfer(address account, address destination, uint256 date, uint256 amount)**
- onlyAdmin
- onlyShareholder(both accounts)
- accountNotFrozen(both accounts)
- Requires sufficient balance
- Create SHARE_TRANSFER transaction

**cancelRequest(address account, bytes32 requestId, string memo)**
- onlyAdmin
- onlyShareholder(account)
- Remove transaction from storage
- Emit TransactionCancelled

### Transfer Agent Operations

**setupAIP(address account, uint256 date, uint256 amount)**
- onlyAdmin
- onlyShareholder(account)
- accountNotFrozen
- Create AIP transaction

**clearTransactionStorage(address account, bytes32 requestId) returns bool**
- Requires ROLE_FUND_ADMIN or WRITE_ACCESS_TRANSACTION
- Remove transaction from storage
- Called by TransferAgentModule after settlement

**unlistFromAccountsWithPendingTransactions(address account)**
- Requires ROLE_FUND_ADMIN or WRITE_ACCESS_TRANSACTION
- Remove account from accountsWithTransactions set
- Called after all transactions cleared

### Views

**getAccountTransactions(address account) returns bytes32[]**
- Returns array of pending transaction IDs for account

**getTransactionDetail(bytes32 requestId) returns (uint8, uint256, uint256, bool)**
- Returns (txType, date, amount, selfService)

**getExtendedTransactionDetail(bytes32 requestId) returns (uint8, address, address, uint256, uint256, bool)**
- Returns (txType, source, destination, date, amount, selfService)

**getAccountsWithTransactions(uint256 pageSize) returns address[]**
- Returns paginated array of accounts with pending transactions

**getAccountsWithTransactionsCount() returns uint256**
- Returns count of accounts with pending transactions

**hasTransactions(address account) returns bool**
- Returns true if account has pending transactions

**isFromAccount(address account, bytes32 requestId) returns bool**
- Returns true if requestId belongs to account

**getVersion() returns uint8**
- Returns 3

## Events
```
TransactionSubmitted(address indexed account, bytes32 transactionId)
TransactionCancelled(address indexed account, bytes32 transactionId, string memo)
```

## Dependencies
- AuthorizationModule - check authorization, frozen status
- TokenRegistry - get token address
- Token contracts - check balances
- TransferAgentModule - settlement operations