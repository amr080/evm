# AuthorizationModule

## Purpose
RBAC and account management for shareholders

## Inheritance
- BaseModule
- AccessControlEnumerableUpgradeable
- IAuthorization
- IAccountManager

## Roles
```
ROLE_MODULE_OWNER - upgrade authority
ROLE_AUTHORIZATION_ADMIN - manage accounts
ROLE_FUND_ADMIN - fund administrator
ROLE_FUND_AUTHORIZED - authorized shareholder
ACCESS_CONTROL_FROZEN - frozen account flag
WRITE_ACCESS_TRANSACTION - inter-module write permission
WRITE_ACCESS_TOKEN - token write permission
```

## Storage
```
address tokenAddress
```

## Functions

### Account Authorization

**authorizeAccount(address account)**
- onlyRole(ROLE_AUTHORIZATION_ADMIN)
- Grant ROLE_FUND_AUTHORIZED to account
- Emit AccountAuthorized

**deauthorizeAccount(address account)**
- onlyRole(ROLE_AUTHORIZATION_ADMIN)
- Revoke ROLE_FUND_AUTHORIZED from account
- Requires no pending transactions
- Requires zero balance
- Emit AccountDeauthorized

**renounceRole(bytes32 role, address account)**
- Override AccessControl renounceRole
- For ROLE_FUND_AUTHORIZED requires ROLE_AUTHORIZATION_ADMIN caller
- Otherwise requires msg.sender == account

### Account Freezing

**freezeAccount(address account, string memo)**
- onlyRole(ROLE_AUTHORIZATION_ADMIN)
- Grant ACCESS_CONTROL_FROZEN to account
- Prevents transaction requests

**unfreezeAccount(address account, string memo)**
- onlyRole(ROLE_AUTHORIZATION_ADMIN)
- Revoke ACCESS_CONTROL_FROZEN from account

**isAccountFrozen(address account) returns bool**
- View function
- Returns true if account has ACCESS_CONTROL_FROZEN

### Account Recovery

**removeAccountPostRecovery(address from, address to)**
- Called by TransferAgentModule after account recovery
- Removes ACCESS_CONTROL_FROZEN if present
- Revokes ROLE_FUND_AUTHORIZED from old account

### Views

**isAccountAuthorized(address account) returns bool**
- Returns true if account has ROLE_FUND_AUTHORIZED

**isAdminAccount(address account) returns bool**
- Returns true if account has ROLE_FUND_ADMIN

**getAuthorizedAccountsCount() returns uint256**
- Returns count of authorized accounts

**getAuthorizedAccountAt(uint256 index) returns address**
- Returns authorized account at index

**getVersion() returns uint8**
- Returns 1

## Events
```
AccountAuthorized(address indexed account)
AccountDeauthorized(address indexed account)
```

## Dependencies
- ModuleRegistry - query transactional module
- TokenRegistry - query token contracts
- TransactionalModule - check pending transactions
- Token contracts - check balances