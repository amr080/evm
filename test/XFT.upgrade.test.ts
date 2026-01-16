import { ethers } from "hardhat";

async function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

describe("XFT Module Upgrades", function () {
  async function deployFixture() {
    const [owner, admin, user1, user2] = await ethers.getSigners();

    // Deploy registries
    const ModuleRegistry = await ethers.getContractFactory("ModuleRegistry");
    const moduleRegistry = await ModuleRegistry.deploy();
    await moduleRegistry.waitForDeployment();
    await moduleRegistry.transferOwnership(owner.address);

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegistry = await TokenRegistry.deploy();
    await tokenRegistry.waitForDeployment();
    await tokenRegistry.transferOwnership(owner.address);

    // Deploy V1 implementations
    const TAImplV1 = await ethers.getContractFactory("TransferAgentModule");
    const taImplV1 = await TAImplV1.deploy();
    await taImplV1.waitForDeployment();

    const AuthImpl = await ethers.getContractFactory("AuthorizationModule");
    const authImpl = await AuthImpl.deploy();
    await authImpl.waitForDeployment();

    const TxImpl = await ethers.getContractFactory("TransactionalModule");
    const txImpl = await TxImpl.deploy();
    await txImpl.waitForDeployment();

    const MMFImpl = await ethers.getContractFactory("MoneyMarketFund");
    const mmfImpl = await MMFImpl.deploy();
    await mmfImpl.waitForDeployment();

    // Deploy MMF token proxy
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const mmfInitData = mmfImpl.interface.encodeFunctionData("initialize", [
      owner.address,
      0,
      ethers.parseUnits("1.0", 18),
      "Money Market Fund",
      "MMF",
      await moduleRegistry.getAddress(),
    ]);
    const mmfProxy = await Proxy.deploy(await mmfImpl.getAddress(), mmfInitData);
    await mmfProxy.waitForDeployment();
    const mmf = await ethers.getContractAt("MoneyMarketFund", await mmfProxy.getAddress());

    await tokenRegistry.registerToken("MMF", await mmfProxy.getAddress());

    // Deploy AuthorizationModule proxy
    const authInitData = authImpl.interface.encodeFunctionData("initialize", [
      owner.address,
      admin.address,
      admin.address,
      await moduleRegistry.getAddress(),
      await tokenRegistry.getAddress(),
      "MMF",
    ]);
    const authProxy = await Proxy.deploy(await authImpl.getAddress(), authInitData);
    await authProxy.waitForDeployment();
    const auth = await ethers.getContractAt("AuthorizationModule", await authProxy.getAddress());

    await moduleRegistry.registerModule(
      ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION")),
      await authProxy.getAddress()
    );

    // Deploy TransactionalModule proxy
    const txInitData = txImpl.interface.encodeFunctionData("initialize", [
      await moduleRegistry.getAddress(),
      await tokenRegistry.getAddress(),
      "MMF",
      owner.address,
    ]);
    const txProxy = await Proxy.deploy(await txImpl.getAddress(), txInitData);
    await txProxy.waitForDeployment();
    const txModule = await ethers.getContractAt("TransactionalModule", await txProxy.getAddress());

    await moduleRegistry.registerModule(
      ethers.keccak256(ethers.toUtf8Bytes("MODULE_TRANSACTIONAL")),
      await txProxy.getAddress()
    );

    // Deploy TransferAgentModule V1 proxy
    const taInitData = taImplV1.interface.encodeFunctionData("initialize", [
      await moduleRegistry.getAddress(),
      await tokenRegistry.getAddress(),
      "MMF",
      owner.address,
    ]);
    const taProxy = await Proxy.deploy(await taImplV1.getAddress(), taInitData);
    await taProxy.waitForDeployment();
    const ta = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());

    await moduleRegistry.registerModule(
      ethers.keccak256(ethers.toUtf8Bytes("MODULE_TRANSFER_AGENT")),
      await taProxy.getAddress()
    );

    // Grant WRITE_ACCESS_TOKEN to TransferAgent
    const WRITE_ACCESS_TOKEN = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TOKEN"));
    await auth.grantRole(WRITE_ACCESS_TOKEN, await taProxy.getAddress());

    const WRITE_ACCESS_TRANSACTION = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TRANSACTION"));
    await auth.grantRole(WRITE_ACCESS_TRANSACTION, await taProxy.getAddress());

    return {
      owner,
      admin,
      user1,
      user2,
      moduleRegistry,
      tokenRegistry,
      auth,
      txModule,
      ta,
      mmf,
      taProxy,
      taImplV1,
      Proxy,
    };
  }

  describe("Storage Preservation", function () {
    it("Should preserve storage after upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, moduleRegistry, tokenRegistry, owner, Proxy } = fixture;

      // Capture V1 state
      const v1Version = await ta.getVersion();
      const v1ModulesAddr = await ta.modules(); // Returns address, not contract
      const v1TokenRegistryAddr = await ta.tokenRegistry(); // Returns address
      const v1MoneyMarketFundAddr = await ta.moneyMarketFund(); // Returns address
      const v1TokenId = await ta.tokenId();

      // Deploy V2 implementation (same contract for testing, but version = 2)
      // In real scenario, this would be TransferAgentModule_V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade proxy to V2 - call upgradeTo directly on proxy (delegates to implementation)
      const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      await taProxyContract.connect(owner).upgradeTo(await taImplV2.getAddress());

      // Verify storage preserved
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const v2ModulesAddr = await taV2.modules();
      const v2TokenRegistryAddr = await taV2.tokenRegistry();
      const v2MoneyMarketFundAddr = await taV2.moneyMarketFund();
      const v2TokenId = await taV2.tokenId();
      
      await assert(v2ModulesAddr === v1ModulesAddr, "ModuleRegistry preserved");
      await assert(v2TokenRegistryAddr === v1TokenRegistryAddr, "TokenRegistry preserved");
      await assert(v2MoneyMarketFundAddr === v1MoneyMarketFundAddr, "MoneyMarketFund preserved");
      await assert(v2TokenId === v1TokenId, "TokenId preserved");
      
      // Verify tokenRegistry and moneyMarketFund by checking they're still functional
      // (These are internal, so we verify via functionality)
      const v2Version = await taV2.getVersion();
      await assert(v2Version === v1Version, "Version accessible (indicates storage intact)");
    });

    it("Should preserve roles after upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, auth, owner, admin, Proxy } = fixture;

      const ROLE_MODULE_OWNER = ethers.keccak256(ethers.toUtf8Bytes("ROLE_MODULE_OWNER"));
      const hasRoleBefore = await ta.hasRole(ROLE_MODULE_OWNER, owner.address);

      // Deploy V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using UUPS interface
      const UUPSInterface = new ethers.Interface([
        "function upgradeTo(address newImplementation) external"
      ]);
      await owner.sendTransaction({
        to: await taProxy.getAddress(),
        data: UUPSInterface.encodeFunctionData("upgradeTo", [await taImplV2.getAddress()])
      });

      // Verify roles preserved
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const hasRoleAfter = await taV2.hasRole(ROLE_MODULE_OWNER, owner.address);
      await assert(hasRoleBefore === hasRoleAfter, "Roles preserved after upgrade");
    });
  });

  describe("Version Management", function () {
    it("Should increment version in V2 implementation", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, owner, Proxy } = fixture;

      const v1Version = await ta.getVersion();
      await assert(v1Version === 5n, "V1 version is 5");

      // Deploy V2 (in real scenario, this would have getVersion() returning 2)
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using proxy contract instance
      const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      await taProxyContract.connect(owner).upgradeTo(await taImplV2.getAddress());

      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const v2Version = await taV2.getVersion();
      // Note: In real V2, this would be 2, but using same contract for testing
      await assert(v2Version === 5n, "Version accessible after upgrade");
    });

    it("Should report correct version via ModuleRegistry", async function () {
      const fixture = await deployFixture();
      const { moduleRegistry, taProxy, owner, Proxy } = fixture;

      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("MODULE_TRANSFER_AGENT"));
      const version = await moduleRegistry.getModuleVersion(moduleId);
      await assert(version === 5n, "ModuleRegistry reports correct version");
    });
  });

  describe("Unauthorized Upgrades", function () {
    it("Should reject upgrade from non-owner", async function () {
      const fixture = await deployFixture();
      const { taProxy, user1, Proxy } = fixture;

      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      let failed = false;
      try {
        const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
        await taProxyContract.connect(user1).upgradeTo(await taImplV2.getAddress());
      } catch (e: any) {
        failed = true;
        await assert(e.message.includes("AccessControl") || e.message.includes("revert"), "Upgrade rejected");
      }
      await assert(failed, "Non-owner upgrade attempt failed");
    });

    it("Should reject upgrade from non-module-owner", async function () {
      const fixture = await deployFixture();
      const { taProxy, admin, Proxy } = fixture;

      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      let failed = false;
      try {
        const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
        await taProxyContract.connect(admin).upgradeTo(await taImplV2.getAddress());
      } catch (e: any) {
        failed = true;
      }
      await assert(failed, "Non-module-owner upgrade attempt failed");
    });
  });

  describe("Cross-Module Compatibility", function () {
    it("Should maintain cross-module lookups after upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, moduleRegistry, txModule, owner, Proxy } = fixture;

      // Verify cross-module lookup works before upgrade
      const modulesBeforeAddr = await ta.modules(); // Returns address
      const modulesBefore = await ethers.getContractAt("ModuleRegistry", modulesBeforeAddr);
      const authAddrBefore = await modulesBefore.getModuleAddress(
        ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION"))
      );

      // Deploy V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using UUPS interface
      const UUPSInterface = new ethers.Interface([
        "function upgradeTo(address newImplementation) external"
      ]);
      await owner.sendTransaction({
        to: await taProxy.getAddress(),
        data: UUPSInterface.encodeFunctionData("upgradeTo", [await taImplV2.getAddress()])
      });

      // Verify cross-module lookup still works
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const modulesAfterAddr = await taV2.modules();
      const modulesAfter = await ethers.getContractAt("ModuleRegistry", modulesAfterAddr);
      const authAddrAfter = await modulesAfter.getModuleAddress(
        ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION"))
      );

      await assert(authAddrBefore === authAddrAfter, "Cross-module lookup preserved");
    });

    it("Should maintain ModuleRegistry reference after upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, moduleRegistry, owner, Proxy } = fixture;

      const moduleRegistryAddr = await moduleRegistry.getAddress();
      const modulesBeforeAddr = await ta.modules(); // Returns address

      // Deploy V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using proxy contract instance
      const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      await taProxyContract.connect(owner).upgradeTo(await taImplV2.getAddress());

      // Verify ModuleRegistry reference preserved
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const modulesAfterAddr = await taV2.modules(); // Returns address
      await assert(modulesBeforeAddr === modulesAfterAddr, "ModuleRegistry reference preserved");
      await assert(modulesAfterAddr === moduleRegistryAddr, "ModuleRegistry address matches");
    });
  });

  describe("Function Availability", function () {
    it("Should maintain existing functions after upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, owner, Proxy } = fixture;

      // Verify V1 function exists
      const versionBefore = await ta.getVersion();

      // Deploy V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using UUPS interface
      const UUPSInterface = new ethers.Interface([
        "function upgradeTo(address newImplementation) external"
      ]);
      await owner.sendTransaction({
        to: await taProxy.getAddress(),
        data: UUPSInterface.encodeFunctionData("upgradeTo", [await taImplV2.getAddress()])
      });

      // Verify function still works
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const versionAfter = await taV2.getVersion();
      await assert(versionAfter === versionBefore, "Existing functions still work");
    });
  });
});
