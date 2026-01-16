# Documentation

### Table of contents

- [Architecture](./ARCHITECTURE.md)
- [Flows](./FLOWS.md)
- [Contracts](#smart-contracts)
    - [Interfaces](./INTERFACES.md)

### Smart Contracts

| File | Description |
|------|-------------|
| [BaseModule.sol](../contracts/XFT/modules/BaseModule.sol) | module template |
| [TransactionalModule.sol](../contracts/XFT/modules/TransactionalModule.sol) | clearing and settlement |
| [AuthorizationModule.sol](../contracts/XFT/modules/AuthorizationModule.sol) | wallet auth |
| [TransferAgentModule.sol](../contracts/XFT/modules/TransferAgentModule.sol) | issuance/dividends/distributions |
| [TokenRegistry.sol](../contracts/XFT/modules/TokenRegistry.sol) | collateral master file, whitelist |
| [ModuleRegistry.sol](../contracts/XFT/modules/ModuleRegistry.sol) | module wiring |

---

## AuthorizationModule.sol

RBAC for shareholder accounts.

| Function | Description |
|----------|-------------|
| `authorizeAccount` | grant shareholder status |
| `deauthorizeAccount` | revoke shareholder status |
| `freezeAccount` | freeze account activity |
| `unfreezeAccount` | restore account activity |
| `recoverAccount` | transfer holdings post-compromise |

## TransferAgentModule.sol

End-of-day settlement and corporate actions.

| Function | Description |
|----------|-------------|
| `distributeDividends` | mint/burn shares per rate |
| `settleTransactions` | execute pending buy/sell |
| `endOfDay` | dividends + settlements |
| `adjustBalance` | admin balance correction |
| `recoverAsset` | move shares between accounts |

## TransactionalModule.sol

Pending transaction queue.

| Function | Description |
|----------|-------------|
| `requestCashPurchase` | queue buy order |
| `requestCashLiquidation` | queue sell order |
| `requestFullLiquidation` | queue full redemption |
| `requestShareTransfer` | queue transfer |
| `cancelRequest` | remove pending tx |
| `enableSelfService` | allow direct shareholder access |