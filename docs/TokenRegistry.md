# TokenRegistry

## Purpose
Central registry mapping token IDs to deployed token addresses

## Inheritance
- Ownable

## Storage
```
mapping(string => address) private registryMap
```

## Functions

**registerToken(string memory id, address addr)**
- onlyOwner
- Register token ID (string) to token address
- Reverts if address invalid or already registered

**getTokenAddress(string memory id) returns address**
- View function
- Returns token address for given ID
- Returns address(0) if not registered

## Usage Pattern
Modules query registry to find token contracts for mint/burn/transfer operations