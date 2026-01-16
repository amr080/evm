// SPDX-License-Identifier: Business Source License 1.1
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ModuleRegistry} from "./ModuleRegistry.sol";

abstract contract BaseModule is Initializable, UUPSUpgradeable {
    ModuleRegistry public modules;
    
    function __BaseModule_init(address _moduleRegistry) internal onlyInitializing {
        require(_moduleRegistry != address(0), "INVALID_REGISTRY");
        modules = ModuleRegistry(_moduleRegistry);
        __UUPSUpgradeable_init();
    }
    
    function getVersion() external pure virtual returns (uint8);
}
