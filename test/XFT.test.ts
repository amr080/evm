import { ethers } from "hardhat";

async function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

describe("XFT Module System", function () {
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

    // Register token
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

    // Register AuthorizationModule
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

    // Register TransactionalModule
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

    // Register TransferAgentModule
    await moduleRegistry.registerModule(
      ethers.keccak256(ethers.toUtf8Bytes("MODULE_TRANSFER_AGENT")),
      await taProxy.getAddress()
    );

    // Grant WRITE_ACCESS_TOKEN to TransferAgent
    const WRITE_ACCESS_TOKEN = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TOKEN"));
    await auth.grantRole(WRITE_ACCESS_TOKEN, await taProxy.getAddress());

    // Grant WRITE_ACCESS_TRANSACTION to TransferAgent
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
    };
  }

  describe("ModuleRegistry", function () {
    it("Should register and retrieve modules", async function () {
      const fixture = await deployFixture();
      const { moduleRegistry, auth } = fixture;
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION"));
      const address = await moduleRegistry.getModuleAddress(moduleId);
      await assert(address === await auth.getAddress(), "Module address matches");
    });

    it("Should get module version", async function () {
      const fixture = await deployFixture();
      const { moduleRegistry, auth } = fixture;
      const moduleId = ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION"));
      const version = await moduleRegistry.getModuleVersion(moduleId);
      await assert(version === 1n, "Module version is 1");
    });
  });

  describe("AuthorizationModule", function () {
    it("Should authorize account", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await assert(await auth.isAccountAuthorized(user1.address), "Account authorized");
    });

    it("Should check admin account", async function () {
      const fixture = await deployFixture();
      const { auth, admin } = fixture;
      await assert(await auth.isAdminAccount(admin.address), "Admin account check");
    });

    it("Should get authorized accounts count", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1, user2 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await auth.connect(admin).authorizeAccount(user2.address);
      await assert(await auth.getAuthorizedAccountsCount() === 2n, "Authorized accounts count");
    });

    it("Should deauthorize account", async function () {
      const fixture = await deployFixture();
      const { auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await auth.connect(admin).deauthorizeAccount(user1.address);
      await assert(!(await auth.isAccountAuthorized(user1.address)), "Account deauthorized");
    });
  });

  describe("TransactionalModule", function () {
    it("Should enable self-service", async function () {
      const fixture = await deployFixture();
      const { txModule, admin } = fixture;
      await txModule.connect(admin).enableSelfService();
      await assert(await txModule.isSelfServiceEnabled(), "Self-service enabled");
    });

    it("Should create self-service purchase request", async function () {
      const fixture = await deployFixture();
      const { txModule, auth, admin, user1, moduleRegistry } = fixture;
      // Verify AuthorizationModule is registered
      const authModuleId = ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION"));
      const authAddr = await moduleRegistry.getModuleAddress(authModuleId);
      await assert(authAddr !== ethers.ZeroAddress, "AuthorizationModule registered");
      
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);

      const txs = await txModule.getAccountTransactions(user1.address);
      await assert(txs.length === 1, "Transaction created");
    });

    it("Should get transaction detail", async function () {
      const fixture = await deployFixture();
      const { txModule, auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);

      const txs = await txModule.getAccountTransactions(user1.address);
      const detail = await txModule.getTransactionDetail(txs[0]);
      await assert(detail[2] === amount, "Transaction detail correct");
    });

    it("Should cancel self-service request", async function () {
      const fixture = await deployFixture();
      const { txModule, auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);

      const txs = await txModule.getAccountTransactions(user1.address);
      await txModule.connect(user1).cancelSelfServiceRequest(txs[0], "test");

      const txsAfter = await txModule.getAccountTransactions(user1.address);
      await assert(txsAfter.length === 0, "Transaction cancelled");
    });
  });

  describe("TransferAgentModule", function () {
    it("Should settle purchase transaction", async function () {
      const fixture = await deployFixture();
      const { txModule, ta, auth, mmf, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);

      const txs = await txModule.getAccountTransactions(user1.address);
      const price = ethers.parseUnits("1.0", 18);
      // Use future date to ensure transaction date <= settlement date
      const date = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future

      await ta.connect(admin).settleTransactions([user1.address], [...txs], date, price);

      const balance = await mmf.balanceOf(user1.address);
      await assert(balance > 0n, "Shares minted");
    });

    it("Should settle liquidation transaction", async function () {
      const fixture = await deployFixture();
      const { txModule, ta, auth, mmf, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      // First purchase
      const purchaseAmount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(purchaseAmount);
      const purchaseTxs = await txModule.getAccountTransactions(user1.address);
      const price = ethers.parseUnits("1.0", 18);
      let date = Math.floor(Date.now() / 1000) + 3600; // Future date
      await ta.connect(admin).settleTransactions([user1.address], [...purchaseTxs], date, price);
      
      // Update price on MMF for hasEnoughHoldings check
      await mmf.connect(admin).updateLastKnownPrice(price);

      // Then liquidation
      const liquidateAmount = ethers.parseUnits("500", 18);
      await txModule.connect(user1).requestSelfServiceCashLiquidation(liquidateAmount);
      const liquidateTxs = await txModule.getAccountTransactions(user1.address);
      date = Math.floor(Date.now() / 1000) + 7200; // Further future date
      await ta.connect(admin).settleTransactions([user1.address], [...liquidateTxs], date, price);

      const balance = await mmf.balanceOf(user1.address);
      await assert(balance > 0n, "Balance after liquidation");
    });

    it("Should distribute dividends", async function () {
      const fixture = await deployFixture();
      const { txModule, ta, auth, mmf, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);
      await txModule.connect(admin).enableSelfService();

      // Purchase shares
      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);
      const txs = await txModule.getAccountTransactions(user1.address);
      const price = ethers.parseUnits("1.0", 18);
      const date = Math.floor(Date.now() / 1000) + 3600; // Future date
      await ta.connect(admin).settleTransactions([user1.address], [...txs], date, price);

      const balanceBefore = await mmf.balanceOf(user1.address);

      // Distribute dividends
      const rate = ethers.parseUnits("0.05", 18); // 5% dividend
      await ta.connect(admin).distributeDividends([...([user1.address])], date, rate, price);

      const balanceAfter = await mmf.balanceOf(user1.address);
      await assert(balanceAfter > balanceBefore, "Dividends distributed");
    });

    it("Should adjust balance", async function () {
      const fixture = await deployFixture();
      const { ta, auth, mmf, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);

      // Mint initial shares
      await mmf.connect(admin).mintShares(user1.address, ethers.parseUnits("100", 18));
      const currentBalance = await mmf.balanceOf(user1.address);

      // Adjust balance
      const newBalance = ethers.parseUnits("150", 18);
      await ta.connect(admin).adjustBalance(user1.address, currentBalance, newBalance, "test");

      const finalBalance = await mmf.balanceOf(user1.address);
      await assert(finalBalance === newBalance, "Balance adjusted");
    });
  });

  describe("MoneyMarketFund", function () {
    it("Should mint shares", async function () {
      const fixture = await deployFixture();
      const { mmf, auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);

      const shares = ethers.parseUnits("100", 18);
      await mmf.connect(admin).mintShares(user1.address, shares);

      await assert(await mmf.balanceOf(user1.address) === shares, "Shares minted");
    });

    it("Should burn shares", async function () {
      const fixture = await deployFixture();
      const { mmf, auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);

      const shares = ethers.parseUnits("100", 18);
      await mmf.connect(admin).mintShares(user1.address, shares);
      await mmf.connect(admin).burnShares(user1.address, ethers.parseUnits("50", 18));

      await assert(await mmf.balanceOf(user1.address) === ethers.parseUnits("50", 18), "Shares burned");
    });

    it("Should check holdings", async function () {
      const fixture = await deployFixture();
      const { mmf, auth, admin, user1 } = fixture;
      await auth.connect(admin).authorizeAccount(user1.address);

      await mmf.connect(admin).mintShares(user1.address, ethers.parseUnits("100", 18));
      await mmf.connect(admin).updateLastKnownPrice(ethers.parseUnits("1.0", 18));

      const hasEnough = await mmf.hasEnoughHoldings(user1.address, ethers.parseUnits("50", 18));
      await assert(hasEnough, "Has enough holdings");
    });

    it("Should update NAV price", async function () {
      const fixture = await deployFixture();
      const { mmf, admin } = fixture;
      const newPrice = ethers.parseUnits("1.5", 18);
      await mmf.connect(admin).updateLastKnownPrice(newPrice);
      await assert(await mmf.lastKnownPrice() === newPrice, "Price updated");
    });
  });

  describe("Integration", function () {
    it("Should complete full flow: authorize → purchase → settle", async function () {
      const fixture = await deployFixture();
      const { auth, txModule, ta, mmf, admin, user1 } = fixture;

      // 1. Authorize
      await auth.connect(admin).authorizeAccount(user1.address);
      await assert(await auth.isAccountAuthorized(user1.address), "User1 authorized");

      // 2. Enable self-service
      await txModule.connect(admin).enableSelfService();

      // 3. Create purchase request
      const amount = ethers.parseUnits("1000", 18);
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);
      const txs = await txModule.getAccountTransactions(user1.address);
      await assert(txs.length === 1, "Purchase request created");

      // 4. Settle transaction
      const price = ethers.parseUnits("1.0", 18);
      const date = Math.floor(Date.now() / 1000) + 3600; // Future date
      await ta.connect(admin).settleTransactions([user1.address], [...txs], date, price);

      // 5. Verify shares minted
      const balance = await mmf.balanceOf(user1.address);
      await assert(balance === amount, "Shares minted correctly");

      // 6. Verify transaction cleared
      const txsAfter = await txModule.getAccountTransactions(user1.address);
      await assert(txsAfter.length === 0, "Transaction cleared");
    });

    it("Should handle multiple users", async function () {
      const fixture = await deployFixture();
      const { auth, txModule, ta, mmf, admin, user1, user2 } = fixture;

      await auth.connect(admin).authorizeAccount(user1.address);
      await auth.connect(admin).authorizeAccount(user2.address);
      await txModule.connect(admin).enableSelfService();

      const amount = ethers.parseUnits("500", 18);
      const price = ethers.parseUnits("1.0", 18);
      let date = Math.floor(Date.now() / 1000) + 3600; // Future date

      // User1 purchase
      await txModule.connect(user1).requestSelfServiceCashPurchase(amount);
      const txs1 = await txModule.getAccountTransactions(user1.address);
      await ta.connect(admin).settleTransactions([user1.address], [...txs1], date, price);

      // User2 purchase
      await txModule.connect(user2).requestSelfServiceCashPurchase(amount);
      const txs2 = await txModule.getAccountTransactions(user2.address);
      date = Math.floor(Date.now() / 1000) + 7200; // Further future date
      await ta.connect(admin).settleTransactions([user2.address], [...txs2], date, price);

      await assert(await mmf.balanceOf(user1.address) === amount, "User1 balance");
      await assert(await mmf.balanceOf(user2.address) === amount, "User2 balance");
      await assert(await mmf.totalSupply() === amount * 2n, "Total supply correct");
    });
  });
});
