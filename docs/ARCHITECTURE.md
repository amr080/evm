## Architecture 



### Inheritance

```
BaseModule
-AuthorizationModule
-TransactionModule
-TransferAgentModule
```

BaseModule = parent

### CORE MODULES

1. ```BaseModule``` Parent module template
2. ```AuthorizationModule``` RBAC for shareholder accounts
3. ```TransactionalModule``` Pending transaction queue & clearing
4. ```TransferAgentModule``` Settlement, dividends, corporate actions
5. ```ModuleRegistry``` Module registration & wiring
6. ```TokenRegistry``` Collateral master file & whitelist





### CORE FUNCTION

- Registry manages modules/tokens
- Modules query registries
- AuthorizationModule authorizes TransactionalModule
- TransactionalModule settles via TransferAgentModule
- TransferAgentModule mints/burns Asset Tokens
- Factories create Token proxies
- Routing system creates wallets and mints/burns Dollar
## Contract Catalog

### Registry Layer

**ModuleRegistry.sol**
- registerModule(bytes32 moduleId, address moduleAddress)
- getModuleAddress(bytes32 moduleId) returns address
- getModuleVersion(bytes32 moduleId) returns uint8

**TokenRegistry.sol**
- registerToken(string tokenId, address tokenAddress)
- getTokenAddress(string tokenId) returns address

### Module Layer

**BaseModule.sol** (Abstract)
- __BaseModule_init(address moduleRegistry)
- getVersion() returns uint8

**AuthorizationModule.sol** (RBAC & Account Management)
- authorizeAccount(address account)
- deauthorizeAccount(address account)
- freezeAccount(address account, string memo)
- unfreezeAccount(address account, string memo)
- isAccountAuthorized(address account) returns bool
- isAccountFrozen(address account) returns bool
- isAdminAccount(address account) returns bool
- removeAccountPostRecovery(address from, address to)

**TransactionalModule.sol** (Pending Transaction Queue)
- requestCashPurchase(address account, uint256 amount, uint256 date)
- requestCashLiquidation(address account, uint256 amount, uint256 date)
- requestFullLiquidation(address account, uint256 date)
- requestShareTransfer(address from, address to, uint256 shares, uint256 date)
- requestSelfServiceCashPurchase(uint256 amount)
- requestSelfServiceCashLiquidation(uint256 amount)
- requestSelfServiceFullLiquidation()
- requestSelfServiceShareTransfer(address to, uint256 shares)
- cancelRequest(address account, bytes32 txId, string memo)
- cancelSelfServiceRequest(bytes32 txId, string memo)
- clearTransactionStorage(address account, bytes32 txId)
- getAccountTransactions(address account) returns bytes32[]
- hasTransactions(address account) returns bool
- getExtendedTransactionDetail(bytes32 txId) returns tuple
- enableSelfService(bool enable)

**TransferAgentModule.sol** (Settlement & Corporate Actions)
- distributeDividends(address[] accounts, uint256 date, int256 rate, uint256 price)
- distributeDividends(address[] accounts, uint256[] adjustedShares, uint256 date, int256 rate, uint256 price)
- settleTransactions(address[] accounts, bytes32[] txIds, uint256 date, uint256 price)
- endOfDay(address[] accounts, bytes32[] txIds, uint256 date, int256 rate, uint256 price)
- endOfDay(address[] accounts, uint256[] adjustedShares, bytes32[] txIds, uint256 date, int256 rate, uint256 price)
- settleCXTransaction(address account, bytes32 requestId, uint256 date, uint256 price)
- settleCXTransactions(address account, bytes32[] requestIds, uint256 date, uint256 price)
- adjustBalance(address account, uint256 currentBalance, uint256 newBalance, string memo)
- recoverAccount(address from, address to, string memo)
- recoverAsset(address from, address to, uint256 amount, string memo)

### Token Layer

**Dollar.sol** (Rebasing USD Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- transferFrom(address from, address to, uint256 amount) returns bool
- approve(address spender, uint256 amount) returns bool
- permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
- blockAccounts(address[] accounts)
- unblockAccounts(address[] accounts)
- setRewardMultiplier(uint256 multiplier)
- convertToDollars(uint256 tokens) returns uint256
- convertToTokens(uint256 dollars) returns uint256
- balanceOf(address account) returns uint256
- totalSupply() returns uint256

**Share.sol** (Equity Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- transferFrom(address from, address to, uint256 amount) returns bool
- approve(address spender, uint256 amount) returns bool
- permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
- blockAccounts(address[] accounts)
- unblockAccounts(address[] accounts)
- setRewardMultiplier(uint256 multiplier)
- balanceOf(address account) returns uint256
- totalSupply() returns uint256

**Bond.sol** (Fixed Income Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- transferFrom(address from, address to, uint256 amount) returns bool
- approve(address spender, uint256 amount) returns bool
- setMaturityDate(uint256 date)
- setCouponRate(uint256 rate)
- balanceOf(address account) returns uint256
- totalSupply() returns uint256

**MoneyMarketFund.sol** (NAV-Based Fund Token)
- mintShares(address to, uint256 shares)
- burnShares(address from, uint256 shares)
- transferShares(address from, address to, uint256 shares)
- updateLastKnownPrice(uint256 price)
- getShareHoldings(address account) returns uint256
- balanceOf(address account) returns uint256
- transfer(address to, uint256 amount) returns bool
- transferFrom(address from, address to, uint256 amount) returns bool
- NUMBER_SCALE_FACTOR() returns uint256

**Deposit.sol** (Deposit Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- setRewardMultiplier(uint256 multiplier)

**Loan.sol** (Debt Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- setRewardMultiplier(uint256 multiplier)

**Convert.sol** (Convertible Securities Token)
- mint(address to, uint256 amount)
- burn(address from, uint256 amount)
- transfer(address to, uint256 amount) returns bool
- setRewardMultiplier(uint256 multiplier)

### Factory Layer

**XFTDollarFactory.sol**
- createDollar(string name, string symbol, address admin) returns address
- getDollars() returns address[]
- getDollarBySymbol(string symbol) returns address

**XFTShareFactory.sol**
- createShare(string name, string symbol, address admin) returns address
- getShares() returns address[]
- getShareBySymbol(string symbol) returns address

**XFTBondFactory.sol**
- createBond(string name, string symbol, address admin) returns address
- getBonds() returns address[]
- getBondBySymbol(string symbol) returns address

**XFTDepositFactory.sol**
- createDeposit(string name, string symbol, address admin) returns address

**XFTLoanFactory.sol**
- createLoan(string name, string symbol, address admin) returns address

**XFTRoyaltyFactory.sol**
- createRoyalty(string name, string symbol, address admin) returns address

**XFTRealEstateFactory.sol**
- createRealEstate(string name, string symbol, address admin) returns address

**XFTMuniFactory.sol**
- createMuni(string name, string symbol, address admin) returns address

### Application Layer

**XFTRoutingFactoryV6.sol** (Multi-Rail Routing)
- deployWallet(bytes32 rail, string id) returns address
- mintTo(bytes32 rail, string id, uint256 amount)
- burnFrom(bytes32 rail, string id, uint256 amount)
- transfer(bytes32 fromRail, string fromId, bytes32 toRail, string toId, uint256 amount)
- getWallet(bytes32 rail, string id) returns address
- predictWalletAddress(bytes32 rail, string id) returns address
- allWallets() returns WalletRec[]
- walletsByRail(bytes32 rail) returns WalletRec[]

**RoutingWallet.sol**
- transfer(address token, address to, uint256 amount)
- balance(address token) returns uint256

**XFTMultiAssetSwap_V2.sol** (Atomic Basket Swaps)
- initiateSwap(bytes32 swapId, address participant, address[] initiatorTokens, uint256[] initiatorAmounts, uint256 basketPriceUSD, address participantToken, bytes32 hashlock, uint256 timelock)
- participate(bytes32 swapId)
- complete(bytes32 swapId, bytes32 preimage)
- refund(bytes32 swapId)
- addWhitelistedToken(address token)
- getSwap(bytes32 swapId) returns Swap
- getAllSwaps() returns bytes32[]

**XFTCorpActionFacility.sol** (Bond-to-Share Conversion)
- setConversionRatio(address bondToken, address shareToken, uint256 bondAmount, uint256 shareAmount)
- convert(address bondToken, address shareToken, uint256 bondAmount)
- getConversionRatio(address bondToken, address shareToken) returns tuple
- removeConversionRatio(address bondToken, address shareToken)

### Proxy Infrastructure

**ERC1967Proxy.sol** (OpenZeppelin Standard)
- constructor(address implementation, bytes data)
- _implementation() returns address
- _fallback()

## Sequence Flows

### 1. Account Authorization Flow

```mermaid
sequenceDiagram
    participant Admin
    participant AuthModule
    participant TokenRegistry

    Admin->>AuthModule: authorizeAccount(userAddress)
    AuthModule->>AuthModule: grantRole(ROLE_FUND_AUTHORIZED, userAddress)
    AuthModule->>Admin: emit AccountAuthorized(userAddress)

    Note over Admin,TokenRegistry: User can now interact with TransactionalModule
```

### 2. Cash Purchase Request Flow

```mermaid
sequenceDiagram
    participant User
    participant TransactionalModule
    participant AuthModule
    participant TokenRegistry

    User->>TransactionalModule: requestSelfServiceCashPurchase(amount)
    TransactionalModule->>AuthModule: isAccountAuthorized(user)
    AuthModule-->>TransactionalModule: true
    TransactionalModule->>AuthModule: isAccountFrozen(user)
    AuthModule-->>TransactionalModule: false
    TransactionalModule->>TransactionalModule: store transaction (txId, amount, date)
    TransactionalModule->>TransactionalModule: add to pendingTransactionsMap[user]
    TransactionalModule->>User: emit TransactionSubmitted(user, txId)
```

### 3. Transaction Settlement Flow

```mermaid
sequenceDiagram
    participant Admin
    participant TransferAgentModule
    participant TransactionalModule
    participant MoneyMarketFund
    participant AuthModule

    Admin->>TransferAgentModule: settleTransactions(accounts[], txIds[], date, price)
    loop For each account
        TransferAgentModule->>TransactionalModule: getAccountTransactions(account)
        TransactionalModule-->>TransferAgentModule: txIds[]
        loop For each pending tx
            TransferAgentModule->>TransactionalModule: getExtendedTransactionDetail(txId)
            TransactionalModule-->>TransferAgentModule: (txType, source, dest, date, amount)
            alt Is Purchase
                TransferAgentModule->>MoneyMarketFund: mintShares(account, shares)
                MoneyMarketFund->>MoneyMarketFund: mint tokens
            else Is Liquidation
                TransferAgentModule->>MoneyMarketFund: burnShares(account, shares)
                MoneyMarketFund->>MoneyMarketFund: burn tokens
            end
            TransferAgentModule->>TransactionalModule: clearTransactionStorage(account, txId)
            TransferAgentModule->>Admin: emit TransactionSettled(account, date, txType, txId, price, amount, shares)
        end
        TransferAgentModule->>TransactionalModule: unlistFromAccountsWithPendingTransactions(account)
    end
```

### 4. Dividend Distribution Flow

```mermaid
sequenceDiagram
    participant Admin
    participant TransferAgentModule
    participant MoneyMarketFund
    participant Shareholder

    Admin->>TransferAgentModule: distributeDividends(accounts[], date, rate, price)
    TransferAgentModule->>MoneyMarketFund: updateLastKnownPrice(price)
    loop For each account
        TransferAgentModule->>MoneyMarketFund: balanceOf(account)
        MoneyMarketFund-->>TransferAgentModule: balance
        alt Positive Yield (rate > 0)
            TransferAgentModule->>MoneyMarketFund: mintShares(account, dividendShares)
            MoneyMarketFund->>Shareholder: increase balance
        else Negative Yield (rate < 0)
            TransferAgentModule->>MoneyMarketFund: burnShares(account, dividendShares)
            MoneyMarketFund->>Shareholder: decrease balance
        end
        TransferAgentModule->>Admin: emit DividendDistributed(account, date, rate, price, dividendShares)
    end
```

### 5. End of Day Settlement Flow

```mermaid
sequenceDiagram
    participant Admin
    participant TransferAgentModule
    participant MoneyMarketFund
    participant TransactionalModule

    Admin->>TransferAgentModule: endOfDay(accounts[], txIds[], date, rate, price)
    TransferAgentModule->>MoneyMarketFund: updateLastKnownPrice(price)
    loop For each account
        Note over TransferAgentModule: Step 1: Distribute Dividends
        TransferAgentModule->>MoneyMarketFund: balanceOf(account)
        MoneyMarketFund-->>TransferAgentModule: balance
        TransferAgentModule->>MoneyMarketFund: mintShares(account, dividendShares)
        TransferAgentModule->>Admin: emit DividendDistributed(...)

        Note over TransferAgentModule: Step 2: Settle Pending Transactions
        TransferAgentModule->>TransactionalModule: getAccountTransactions(account)
        TransactionalModule-->>TransferAgentModule: txIds[]
        loop For each tx in date range
            TransferAgentModule->>TransactionalModule: getExtendedTransactionDetail(txId)
            TransferAgentModule->>MoneyMarketFund: mintShares or burnShares
            TransferAgentModule->>TransactionalModule: clearTransactionStorage(account, txId)
            TransferAgentModule->>Admin: emit TransactionSettled(...)
        end
        TransferAgentModule->>TransactionalModule: unlistFromAccountsWithPendingTransactions(account)
    end
```

### 6. Token Factory Deployment Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Factory
    participant ERC1967Proxy
    participant Implementation
    participant TokenRegistry

    Admin->>Factory: createDollar(name, symbol, admin)
    Factory->>Factory: generate salt from symbol
    Factory->>ERC1967Proxy: new ERC1967Proxy{salt}(implementation, initData)
    ERC1967Proxy->>Implementation: delegatecall initialize(name, symbol, admin)
    Implementation->>Implementation: setup roles and state
    Implementation-->>ERC1967Proxy: success
    ERC1967Proxy-->>Factory: proxyAddress
    Factory->>Factory: store in symbolToProxy mapping
    Factory->>Factory: add to allDollars array
    Factory->>Admin: return proxyAddress

    Note over Admin,TokenRegistry: Optionally register in TokenRegistry
    Admin->>TokenRegistry: registerToken(tokenId, proxyAddress)
```

### 7. Multi-Rail Routing Flow

```mermaid
sequenceDiagram
    participant Operator
    participant RoutingFactory
    participant RoutingWallet
    participant DollarToken

    Note over Operator: User sends fiat via IBAN
    Operator->>RoutingFactory: mintTo(IBAN, "DE89370400440532013000", 1000e6)
    RoutingFactory->>RoutingFactory: compute wallet = wallets[IBAN][id]
    alt Wallet doesn't exist
        RoutingFactory->>RoutingWallet: new RoutingWallet{salt}(operator)
        RoutingWallet-->>RoutingFactory: walletAddress
        RoutingFactory->>RoutingFactory: store wallets[IBAN][id] = walletAddress
    end
    RoutingFactory->>DollarToken: mint(walletAddress, 1000e6)
    DollarToken->>RoutingWallet: increase balance
    RoutingFactory->>Operator: emit Mint(IBAN, id, wallet, 1000e6)

    Note over Operator: User pays merchant via FedNow
    Operator->>RoutingFactory: transfer(IBAN, ibanId, FEDNOW, fednowId, 50e6)
    RoutingFactory->>RoutingFactory: fromWallet = wallets[IBAN][ibanId]
    RoutingFactory->>RoutingFactory: toWallet = wallets[FEDNOW][fednowId]
    alt Destination wallet doesn't exist
        RoutingFactory->>RoutingWallet: new RoutingWallet{salt}(operator)
        RoutingFactory->>RoutingFactory: store wallets[FEDNOW][fednowId]
    end
    RoutingFactory->>RoutingWallet: transfer(token, toWallet, 50e6)
    RoutingWallet->>DollarToken: transfer(toWallet, 50e6)
    RoutingFactory->>Operator: emit Transfer(...)

    Note over Operator: Merchant redeems to bank
    Operator->>RoutingFactory: burnFrom(FEDNOW, fednowId, 50e6)
    RoutingFactory->>DollarToken: burn(walletAddress, 50e6)
    RoutingFactory->>Operator: emit Burn(FEDNOW, fednowId, wallet, 50e6)
```

### 8. Multi-Asset Atomic Swap Flow

```mermaid
sequenceDiagram
    participant Alice
    participant SwapContract
    participant Bob
    participant BasketTokens
    participant PaymentToken

    Note over Alice: Alice wants to sell basket for 1000 USDXT
    Alice->>SwapContract: initiateSwap(swapId, bob, [AAPL,TSLA], [10,5], 1000e6, USDXT, hashlock, timelock)
    SwapContract->>BasketTokens: transferFrom(alice, contract, [10 AAPL, 5 TSLA])
    BasketTokens-->>SwapContract: success
    SwapContract->>SwapContract: store swap details
    SwapContract->>SwapContract: initiatorDeposited = true
    SwapContract->>Alice: emit SwapInitiated(swapId, alice, bob, basketPrice, USDXT, hashlock, timelock)

    Note over Bob: Bob reviews and deposits payment
    Bob->>SwapContract: participate(swapId)
    SwapContract->>PaymentToken: transferFrom(bob, contract, 1000e6 USDXT)
    PaymentToken-->>SwapContract: success
    SwapContract->>SwapContract: participantDeposited = true
    SwapContract->>Bob: emit SwapParticipated(swapId, bob, USDXT, 1000e6)

    Note over Alice: Alice reveals preimage to complete
    Alice->>SwapContract: complete(swapId, preimage)
    SwapContract->>SwapContract: verify sha256(preimage) == hashlock
    SwapContract->>BasketTokens: transfer(bob, [10 AAPL, 5 TSLA])
    SwapContract->>PaymentToken: transfer(alice, 1000e6 USDXT)
    SwapContract->>SwapContract: completed = true
    SwapContract->>Alice: emit SwapCompleted(swapId, preimage)

    alt Timelock expires without completion
        Bob->>SwapContract: refund(swapId)
        SwapContract->>SwapContract: require block.timestamp > timelock
        SwapContract->>BasketTokens: transfer(alice, [10 AAPL, 5 TSLA])
        SwapContract->>PaymentToken: transfer(bob, 1000e6 USDXT)
        SwapContract->>SwapContract: refunded = true
        SwapContract->>Bob: emit SwapRefunded(swapId, bob)
    end
```

### 9. Corporate Action (Bond Conversion) Flow

```mermaid
sequenceDiagram
    participant Admin
    participant CorpActionFacility
    participant BondToken
    participant ShareToken
    participant Investor

    Admin->>CorpActionFacility: setConversionRatio(bondToken, shareToken, 1000e6, 100e6)
    CorpActionFacility->>CorpActionFacility: store conversion ratio (1000 bonds = 100 shares)
    CorpActionFacility->>Admin: emit ConversionRatioSet(bondToken, shareToken, 1000e6, 100e6)

    Note over Investor: Investor holds 5000 bonds, wants to convert
    Investor->>BondToken: approve(corpActionFacility, 5000e6)
    Investor->>CorpActionFacility: convert(bondToken, shareToken, 5000e6)
    CorpActionFacility->>CorpActionFacility: calculate shares = (5000 * 100) / 1000 = 500
    CorpActionFacility->>BondToken: burn(investor, 5000e6)
    BondToken->>Investor: decrease balance
    CorpActionFacility->>ShareToken: mint(investor, 500e6)
    ShareToken->>Investor: increase balance
    CorpActionFacility->>Investor: emit Converted(investor, bondToken, shareToken, 5000e6, 500e6)
```

### 10. Account Recovery Flow

```mermaid
sequenceDiagram
    participant Admin
    participant TransferAgentModule
    participant MoneyMarketFund
    participant TransactionalModule
    participant AuthModule
    participant OldAccount
    participant NewAccount

    Note over Admin: User lost access to OldAccount
    Admin->>TransferAgentModule: recoverAccount(oldAccount, newAccount, "Lost private key")
    TransferAgentModule->>TransactionalModule: hasTransactions(oldAccount)
    TransactionalModule-->>TransferAgentModule: false
    TransferAgentModule->>MoneyMarketFund: getShareHoldings(oldAccount)
    MoneyMarketFund-->>TransferAgentModule: balance
    TransferAgentModule->>MoneyMarketFund: transferShares(oldAccount, newAccount, balance)
    MoneyMarketFund->>OldAccount: set balance to 0
    MoneyMarketFund->>NewAccount: increase balance
    TransferAgentModule->>AuthModule: removeAccountPostRecovery(oldAccount, newAccount)
    AuthModule->>AuthModule: revokeRole(ROLE_FUND_AUTHORIZED, oldAccount)
    AuthModule->>AuthModule: grantRole(ROLE_FUND_AUTHORIZED, newAccount)
    TransferAgentModule->>Admin: emit AccountRecovered(oldAccount, newAccount, balance, memo)
```



