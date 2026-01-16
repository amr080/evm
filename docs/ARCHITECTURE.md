# Architecture

- Modules don't hardcode addresses
- Swap implementations without redeploying dependents
- Single source of truth for addresses

## Foundation: Registries + Base

**ModuleRegistry** → Maps `bytes32` module IDs → addresses  
**TokenRegistry** → Maps `string` token names → addresses  
**BaseModule** → Abstract base: upgradeability (UUPS) + registry reference

## How They Connect

All modules inherit `BaseModule`, which stores `ModuleRegistry modules`.

```solidity
// Every module can find others:
address auth = modules.getModuleAddress(keccak256("MODULE_AUTHORIZATION"));
```

Modules read `TokenRegistry` via initialization params to get token addresses.

## Inheritance Chain

```
BaseModule
├─ Initializable (OpenZeppelin)
└─ UUPSUpgradeable (OpenZeppelin)
   └─ stores: ModuleRegistry modules

AuthorizationModule
├─ BaseModule
├─ AccessControlEnumerableUpgradeable
└─ interfaces: IAuthorization, IAccountManager

TransactionalModule
├─ BaseModule
├─ AccessControlEnumerableUpgradeable
└─ interfaces: IShareholderTransaction, IExtendedTransactionDetail, ...

TransferAgentModule
├─ BaseModule
├─ AccessControlEnumerableUpgradeable
└─ interfaces: ITransferAgentExt, IRecovery, ITransferAgentXChain

MoneyMarketFund
├─ Initializable
├─ ERC20Upgradeable
├─ AccessControlUpgradeable
├─ UUPSUpgradeable
└─ interfaces: IHoldings, IAdminTransfer

ModuleRegistry → Ownable
TokenRegistry → Ownable
```

## Flow

1. Deploy `ModuleRegistry`, `TokenRegistry`
2. Deploy modules (inherit `BaseModule`)
3. Initialize modules with registry addresses
4. Modules use `modules.getModuleAddress()` to find each other
5. Modules use `TokenRegistry.getTokenAddress()` to find tokens





# Data Flow

## The Three Layers

**Registries** → Phone book (where to find things)  
**Modules** → Workers (do the work)  
**Tokens** → Assets (what people own)

## Simple Data Flow

```
1. Admin registers modules/tokens in registries
2. Modules read registries to find each other
3. User requests transaction → stored in TransactionalModule
4. Admin settles → TransferAgentModule reads TransactionalModule, updates Token
```

## Registry Pattern

**ModuleRegistry** = "Where is AuthorizationModule?"  
**TokenRegistry** = "Where is MoneyMarketFund?"

Every module stores `ModuleRegistry` address. When it needs another module:
```solidity
address auth = modules.getModuleAddress("MODULE_AUTHORIZATION");
```

## Data Flow Diagrams

### Setup Flow
```mermaid
graph LR
    A[Deploy ModuleRegistry] --> B[Deploy TokenRegistry]
    B --> C[Deploy Modules]
    C --> D[Register in ModuleRegistry]
    D --> E[Register Tokens in TokenRegistry]
```

### Authorization Flow
```mermaid
sequenceDiagram
    Admin->>AuthModule: authorizeAccount(user)
    AuthModule->>AuthModule: Store: user = authorized
    AuthModule-->>Admin: Done
```

### Transaction Request Flow
```mermaid
sequenceDiagram
    User->>TxModule: requestCashPurchase(amount)
    TxModule->>ModuleRegistry: Where is AuthModule?
    ModuleRegistry-->>TxModule: AuthModule address
    TxModule->>AuthModule: Is user authorized?
    AuthModule-->>TxModule: Yes
    TxModule->>TxModule: Store pending transaction
    TxModule-->>User: Transaction ID
```

### Settlement Flow
```mermaid
sequenceDiagram
    Admin->>TAModule: settleTransactions(users, price)
    TAModule->>ModuleRegistry: Where is TxModule?
    ModuleRegistry-->>TAModule: TxModule address
    TAModule->>TxModule: Get pending transactions
    TxModule-->>TAModule: [tx1, tx2, ...]
    TAModule->>TokenRegistry: Where is MoneyMarketFund?
    TokenRegistry-->>TAModule: MMF address
    TAModule->>MMF: mintShares(user, amount)
    MMF->>MMF: Update balance
    TAModule->>TxModule: Clear transaction
    TxModule->>TxModule: Remove from pending
```

## Key Concept: Registry Lookup

All modules have this pattern:
```solidity
// In any module:
address authModule = modules.getModuleAddress("MODULE_AUTHORIZATION");
address token = tokenRegistry.getTokenAddress("MMF");
```

This lets modules find each other without hardcoded addresses.

## Complete Flow Example

```mermaid
graph TD
    Start[User wants to buy shares] --> Auth{User authorized?}
    Auth -->|No| End1[Reject]
    Auth -->|Yes| Tx[Create transaction request]
    Tx --> Store[Store in TransactionalModule]
    Store --> Wait[Wait for settlement]
    Wait --> Settle[Admin calls settleTransactions]
    Settle --> Read[TransferAgent reads TransactionalModule]
    Read --> Calc[Calculate shares from price]
    Calc --> Mint[Mint shares on MoneyMarketFund]
    Mint --> Clear[Clear transaction from queue]
    Clear --> Done[User has shares]
```

## Inheritance (Simple)

```
BaseModule (abstract)
  ├─ stores ModuleRegistry reference
  ├─ provides upgradeability
  └─ inherited by:
      ├─ AuthorizationModule
      ├─ TransactionalModule
      └─ TransferAgentModule
```

All modules share: upgradeability + registry access.
```

**Takeaway:** Registries are directories. Modules look up addresses, read data, and update tokens. No hardcoded addresses.