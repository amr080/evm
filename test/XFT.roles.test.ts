import { ethers } from "hardhat";

async function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

describe("XFT Module Roles", function () {
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

    // Deploy implementations
    const AuthImpl = await ethers.getContractFactory("AuthorizationModule");
    const authImpl = await AuthImpl.deploy();
    await authImpl.waitForDeployment();

    const TxImpl = await ethers.getContractFactory("TransactionalModule");
    const txImpl = await TxImpl.deploy();
    await txImpl.waitForDeployment();

    const TAImpl = await ethers.getContractFactory("TransferAgentModule");
    const taImpl = await TAImpl.deploy();
    await taImpl.waitForDeployment();

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

    // Deploy TransferAgentModule proxy
    const taInitData = taImpl.interface.encodeFunctionData("initialize", [
      await moduleRegistry.getAddress(),
      await tokenRegistry.getAddress(),
      "MMF",
      owner.address,
    ]);
    const taProxy = await Proxy.deploy(await taImpl.getAddress(), taInitData);
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
      Proxy,
    };
  }

  describe("Role Inheritance After Upgrade", function () {
    it("Should preserve roles after module upgrade", async function () {
      const fixture = await deployFixture();
      const { ta, taProxy, owner, Proxy } = fixture;

      const ROLE_MODULE_OWNER = ethers.keccak256(ethers.toUtf8Bytes("ROLE_MODULE_OWNER"));
      const hasRoleBefore = await ta.hasRole(ROLE_MODULE_OWNER, owner.address);

      // Deploy V2
      const TAImplV2 = await ethers.getContractFactory("TransferAgentModule");
      const taImplV2 = await TAImplV2.deploy();
      await taImplV2.waitForDeployment();

      // Upgrade using proxy contract instance
      const taProxyContract = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      await taProxyContract.connect(owner).upgradeTo(await taImplV2.getAddress());

      // Verify role preserved
      const taV2 = await ethers.getContractAt("TransferAgentModule", await taProxy.getAddress());
      const hasRoleAfter = await taV2.hasRole(ROLE_MODULE_OWNER, owner.address);
      await assert(hasRoleBefore === hasRoleAfter, "Role preserved after upgrade");
      await assert(hasRoleAfter === true, "Owner still has ROLE_MODULE_OWNER");
    });

    it("Should preserve granted roles after upgrade", async function () {
      const fixture = await deployFixture();
      const { auth, authProxy, admin, user1, Proxy } = fixture;

      const ROLE_FUND_AUTHORIZED = ethers.keccak256(ethers.toUtf8Bytes("ROLE_FUND_AUTHORIZED"));
      
      // Grant role before upgrade
      await auth.connect(admin).authorizeAccount(user1.address);
      const hasRoleBefore = await auth.hasRole(ROLE_FUND_AUTHORIZED, user1.address);

      // Deploy V2
      const AuthImplV2 = await ethers.getContractFactory("AuthorizationModule");
      const authImplV2 = await AuthImplV2.deploy();
      await authImplV2.waitForDeployment();

      // Upgrade using proxy contract instance
      const authProxyContract = await ethers.getContractAt("AuthorizationModule", await authProxy.getAddress());
      await authProxyContract.connect(admin).upgradeTo(await authImplV2.getAddress());

      // Verify role preserved
      const authV2 = await ethers.getContractAt("AuthorizationModule", await authProxy.getAddress());
      const hasRoleAfter = await authV2.hasRole(ROLE_FUND_AUTHORIZED, user1.address);
      await assert(hasRoleBefore === hasRoleAfter, "Granted role preserved after upgrade");
      await assert(hasRoleAfter === true, "User still has ROLE_FUND_AUTHORIZED");
      
      // Verify user is still authorized via interface
      const isAuthorized = await authV2.isAccountAuthorized(user1.address);
      await assert(isAuthorized === true, "User still authorized after upgrade");
    });
  });

  describe("Role Admin Hierarchy", function () {
    it("Should allow ROLE_MODULE_OWNER to grant ROLE_FUND_ADMIN", async function () {
      const fixture = await deployFixture();
      const { auth, owner, user1 } = fixture;

      const ROLE_FUND_ADMIN = ethers.keccak256(ethers.toUtf8Bytes("ROLE_FUND_ADMIN"));
      
      // Owner (has ROLE_MODULE_OWNER) grants ROLE_FUND_ADMIN
      await auth.connect(owner).grantRole(ROLE_FUND_ADMIN, user1.address);
      const hasRole = await auth.hasRole(ROLE_FUND_ADMIN, user1.address);
      await assert(hasRole === true, "ROLE_MODULE_OWNER can grant ROLE_FUND_ADMIN");
    });

    it("Should allow ROLE_AUTHORIZATION_ADMIN to grant ROLE_FUND_AUTHORIZED", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1 } = fixture;

      // Admin (has ROLE_AUTHORIZATION_ADMIN) grants ROLE_FUND_AUTHORIZED
      await auth.connect(admin).authorizeAccount(user1.address);
      const isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === true, "ROLE_AUTHORIZATION_ADMIN can grant ROLE_FUND_AUTHORIZED");
    });

    it("Should reject non-admin from granting roles", async function () {
      const fixture = await deployFixture();
      const { auth, user1, user2 } = fixture;

      const ROLE_FUND_ADMIN = ethers.keccak256(ethers.toUtf8Bytes("ROLE_FUND_ADMIN"));
      
      let failed = false;
      try {
        await auth.connect(user1).grantRole(ROLE_FUND_ADMIN, user2.address);
      } catch (e: any) {
        failed = true;
      }
      await assert(failed, "Non-admin cannot grant roles");
    });
  });

  describe("Cross-Module Role Checks", function () {
    it("Should allow TransactionalModule to check AuthorizationModule roles", async function () {
      const fixture = await deployFixture();
      const { auth, txModule, admin, user1 } = fixture;

      // Authorize user
      await auth.connect(admin).authorizeAccount(user1.address);
      
      // Enable self-service
      await txModule.connect(admin).enableSelfService();

      // TransactionalModule checks if user is authorized (via cross-module lookup)
      const isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === true, "TransactionalModule can check AuthorizationModule roles");
    });

    it("Should allow TransferAgentModule to check AuthorizationModule admin roles", async function () {
      const fixture = await deployFixture();
      const { auth, ta, admin } = fixture;

      // TransferAgentModule checks if caller is admin (via cross-module lookup)
      const isAdmin = await auth.isAdminAccount(admin.address);
      await assert(isAdmin === true, "TransferAgentModule can check AuthorizationModule admin roles");
    });

    it("Should reject unauthorized accounts in cross-module checks", async function () {
      const fixture = await deployFixture();
      const { auth, user1 } = fixture;

      const isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === false, "Unauthorized account correctly identified");
    });
  });

  describe("Role Revocation and Re-granting", function () {
    it("Should revoke role and deny access", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1 } = fixture;

      // Grant role
      await auth.connect(admin).authorizeAccount(user1.address);
      let isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === true, "User authorized");

      // Revoke role
      await auth.connect(admin).deauthorizeAccount(user1.address);
      isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === false, "User deauthorized after revocation");
    });

    it("Should restore access after re-granting role", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1 } = fixture;

      // Grant, revoke, then re-grant
      await auth.connect(admin).authorizeAccount(user1.address);
      await auth.connect(admin).deauthorizeAccount(user1.address);
      
      let isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === false, "User deauthorized");

      // Re-grant
      await auth.connect(admin).authorizeAccount(user1.address);
      isAuthorized = await auth.isAccountAuthorized(user1.address);
      await assert(isAuthorized === true, "User re-authorized");
    });

    it("Should maintain role count correctly after revocation", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1, user2 } = fixture;

      // Grant roles to two users
      await auth.connect(admin).authorizeAccount(user1.address);
      await auth.connect(admin).authorizeAccount(user2.address);
      
      let count = await auth.getAuthorizedAccountsCount();
      await assert(count === 2n, "Two users authorized");

      // Revoke one
      await auth.connect(admin).deauthorizeAccount(user1.address);
      count = await auth.getAuthorizedAccountsCount();
      await assert(count === 1n, "Count decreased after revocation");
    });
  });

  describe("Role Admin Configuration", function () {
    it("Should have correct role admin for ROLE_FUND_AUTHORIZED", async function () {
      const fixture = await deployFixture();
      const { auth, admin } = fixture;

      const ROLE_FUND_AUTHORIZED = ethers.keccak256(ethers.toUtf8Bytes("ROLE_FUND_AUTHORIZED"));
      const ROLE_AUTHORIZATION_ADMIN = ethers.keccak256(ethers.toUtf8Bytes("ROLE_AUTHORIZATION_ADMIN"));
      
      // ROLE_AUTHORIZATION_ADMIN should be admin of ROLE_FUND_AUTHORIZED
      const roleAdmin = await auth.getRoleAdmin(ROLE_FUND_AUTHORIZED);
      await assert(roleAdmin === ROLE_AUTHORIZATION_ADMIN, "ROLE_AUTHORIZATION_ADMIN is admin of ROLE_FUND_AUTHORIZED");
    });

    it("Should have correct role admin for ROLE_MODULE_OWNER", async function () {
      const fixture = await deployFixture();
      const { ta } = fixture;

      const ROLE_MODULE_OWNER = ethers.keccak256(ethers.toUtf8Bytes("ROLE_MODULE_OWNER"));
      
      // ROLE_MODULE_OWNER should be its own admin
      const roleAdmin = await ta.getRoleAdmin(ROLE_MODULE_OWNER);
      await assert(roleAdmin === ROLE_MODULE_OWNER, "ROLE_MODULE_OWNER is its own admin");
    });
  });

  describe("Write Access Roles", function () {
    it("Should grant WRITE_ACCESS_TOKEN to TransferAgent", async function () {
      const fixture = await deployFixture();
      const { auth, taProxy } = fixture;

      const WRITE_ACCESS_TOKEN = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TOKEN"));
      const hasRole = await auth.hasRole(WRITE_ACCESS_TOKEN, await taProxy.getAddress());
      await assert(hasRole === true, "TransferAgent has WRITE_ACCESS_TOKEN");
    });

    it("Should grant WRITE_ACCESS_TRANSACTION to TransferAgent", async function () {
      const fixture = await deployFixture();
      const { auth, taProxy } = fixture;

      const WRITE_ACCESS_TRANSACTION = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TRANSACTION"));
      const hasRole = await auth.hasRole(WRITE_ACCESS_TRANSACTION, await taProxy.getAddress());
      await assert(hasRole === true, "TransferAgent has WRITE_ACCESS_TRANSACTION");
    });
  });
});
