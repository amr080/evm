# BaseModule

## Purpose
Abstract base class for all UUPS upgradeable modules

## Inheritance
- Initializable
- UUPSUpgradeable

## Storage
```
ModuleRegistry public modules
```

## Functions

**__BaseModule_init(address _moduleRegistry)**
- Internal initializer
- Sets module registry reference
- Initializes UUPS upgradeability

**getVersion() returns uint8**
- Virtual pure function
- Returns module version
- Must be implemented by child contracts

## Dependencies
- ModuleRegistry contract

## Usage
All modules (AuthorizationModule, TransactionalModule, TransferAgentModule) inherit from BaseModule