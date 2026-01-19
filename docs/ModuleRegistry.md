# ModuleRegistry

## Purpose
Central registry mapping module IDs to deployed addresses

## Inheritance
- Ownable

## Storage
```
mapping(bytes32 => address) private registryMap
```

## Functions

**registerModule(bytes32 id, address addr)**
- onlyOwner
- Register module ID to address
- Reverts if ID or address invalid
- Reverts if already registered

**getModuleAddress(bytes32 id) returns address**
- View function
- Returns module address for given ID
- Returns address(0) if not registered

**getModuleVersion(bytes32 id) returns uint8**
- View function
- Calls getVersion() on registered module
- Returns version number

## Module IDs
```
MODULE_AUTHORIZATION = keccak256("MODULE_AUTHORIZATION")
MODULE_TRANSACTIONAL = keccak256("MODULE_TRANSACTIONAL")
MODULE_TRANSFER_AGENT = keccak256("MODULE_TRANSFER_AGENT")
```

## Usage Pattern
Modules query registry to find other modules for inter-module communication