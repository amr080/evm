// test/Bond.test.ts
import { ethers } from "hardhat";
import { expect } from "chai";

async function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

describe("Bond Contract", function () {
  async function deployFixture() {
    const [owner, admin, minter, burner, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy registries
    const ModuleRegistry = await ethers.getContractFactory("ModuleRegistry");
    const moduleRegistry = await ModuleRegistry.deploy();
    await moduleRegistry.waitForDeployment();
    await moduleRegistry.transferOwnership(owner.address);

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegistry = await TokenRegistry.deploy();
    await tokenRegistry.waitForDeployment();
    await tokenRegistry.transferOwnership(owner.address);

    // Deploy Bond implementation first
    const BondImpl = await ethers.getContractFactory("Bond");
    const bondImpl = await BondImpl.deploy();
    await bondImpl.waitForDeployment();

    // Deploy Bond proxy
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const maturityDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now
    const couponRate = 500; // 5%
    const bondInitData = bondImpl.interface.encodeFunctionData("initialize", [
      "MA QUI 5 05/01/2025",
      "US748508V218",
      owner.address,
      maturityDate,
      couponRate,
      await moduleRegistry.getAddress(),
    ]);
    const bondProxy = await Proxy.deploy(await bondImpl.getAddress(), bondInitData);
    await bondProxy.waitForDeployment();
    const bond = await ethers.getContractAt("Bond", await bondProxy.getAddress());

    // Register Bond token in TokenRegistry
    await tokenRegistry.registerToken("BOND", await bondProxy.getAddress());

    // Deploy AuthorizationModule (now that token is registered)
    const AuthImpl = await ethers.getContractFactory("AuthorizationModule");
    const authImpl = await AuthImpl.deploy();
    await authImpl.waitForDeployment();

    const authInitData = authImpl.interface.encodeFunctionData("initialize", [
      owner.address,
      admin.address,
      admin.address,
      await moduleRegistry.getAddress(),
      await tokenRegistry.getAddress(),
      "BOND",
    ]);
    const authProxy = await Proxy.deploy(await authImpl.getAddress(), authInitData);
    await authProxy.waitForDeployment();
    const auth = await ethers.getContractAt("AuthorizationModule", await authProxy.getAddress());

    await moduleRegistry.registerModule(
      ethers.keccak256(ethers.toUtf8Bytes("MODULE_AUTHORIZATION")),
      await authProxy.getAddress()
    );

    // Grant roles
    await bond.grantRole(await bond.MINTER_ROLE(), minter.address);
    await bond.grantRole(await bond.BURNER_ROLE(), burner.address);
    await bond.grantRole(await bond.UPGRADE_ROLE(), owner.address);
    await bond.grantRole(await bond.PAUSE_ROLE(), admin.address);
    await bond.grantRole(await bond.BLOCKLIST_ROLE(), admin.address);
    await bond.grantRole(await bond.ORACLE_ROLE(), admin.address);

    // Grant WRITE_ACCESS_TOKEN to minter (simulating TransferAgentModule)
    const WRITE_ACCESS_TOKEN = ethers.keccak256(ethers.toUtf8Bytes("WRITE_ACCESS_TOKEN"));
    await auth.grantRole(WRITE_ACCESS_TOKEN, minter.address);

    return {
      owner,
      admin,
      minter,
      burner,
      user1,
      user2,
      unauthorized,
      moduleRegistry,
      tokenRegistry,
      auth,
      bond,
      bondProxy,
      bondImpl,
      Proxy,
      maturityDate,
      couponRate,
    };
  }

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      const { bond, maturityDate, couponRate } = await deployFixture();
      expect(await bond.name()).to.equal("MA QUI 5 05/01/2025");
      expect(await bond.symbol()).to.equal("US748508V218");
      expect(await bond.maturityDate()).to.equal(BigInt(maturityDate));
      expect(await bond.couponRate()).to.equal(BigInt(couponRate));
      expect(await bond.isActive()).to.be.true;
      expect(await bond.decimals()).to.equal(18n);
    });

    it("Should set rewardMultiplier to BASE", async function () {
      const { bond } = await deployFixture();
      expect(await bond.rewardMultiplier()).to.equal(ethers.parseUnits("1", 18));
    });
  });

  describe("Minting", function () {
    it("Should mint tokens via mint()", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      expect(await bond.balanceOf(user1.address)).to.equal(amount);
      expect(await bond.totalSupply()).to.equal(amount);
    });

    it("Should mint shares via mintShares()", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const shares = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mintBonds(user1.address, shares);
      expect(await bond.balanceOf(user1.address)).to.equal(shares);
      expect(await bond.sharesOf(user1.address)).to.equal(shares);
    });

    it("Should update accountsWithHoldings on mint", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      expect(await bond.getShareHoldings(user1.address)).to.equal(amount);
      expect(await bond.hasEnoughHoldings(user1.address, amount)).to.be.true;
    });

    it("Should prevent minting after maturity", async function () {
      const { bond, owner, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      
      // Fast forward past maturity
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      await bond.connect(owner).settleMaturity();
      try {
        await bond.connect(minter).mintBonds(user1.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BOND_MATURED"), "Should revert with BOND_MATURED");
      }
    });

    it("Should revert minting by unauthorized address", async function () {
      const { bond, unauthorized, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      try {
        await bond.connect(unauthorized).mint(user1.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("AccessControl") || e.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("Burning", function () {
    it("Should burn tokens via burn()", async function () {
      const { bond, minter, burner, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(burner).burn(user1.address, amount);
      expect(await bond.balanceOf(user1.address)).to.equal(0n);
      expect(await bond.totalSupply()).to.equal(0n);
    });

    it("Should burn shares via burnShares()", async function () {
      const { bond, minter, burner, user1 } = await deployFixture();
      const shares = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mintBonds(user1.address, shares);
      await bond.connect(burner).burnBonds(user1.address, shares);
      expect(await bond.balanceOf(user1.address)).to.equal(0n);
      expect(await bond.sharesOf(user1.address)).to.equal(0n);
    });

    it("Should update accountsWithHoldings on burn", async function () {
      const { bond, minter, burner, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(burner).burn(user1.address, amount);
      expect(await bond.hasEnoughHoldings(user1.address, 1)).to.be.false;
    });

    it("Should revert burning by unauthorized address", async function () {
      const { bond, minter, unauthorized, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      try {
        await bond.connect(unauthorized).burn(user1.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("AccessControl") || e.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between users", async function () {
      const { bond, minter, user1, user2 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(user1).transfer(user2.address, amount);
      expect(await bond.balanceOf(user1.address)).to.equal(0n);
      expect(await bond.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should transfer shares via transferShares()", async function () {
      const { bond, minter, user1, user2 } = await deployFixture();
      const shares = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mintBonds(user1.address, shares);
      await bond.connect(minter).transferShares(user1.address, user2.address, shares);
      expect(await bond.balanceOf(user1.address)).to.equal(0n);
      expect(await bond.balanceOf(user2.address)).to.equal(shares);
    });

    it("Should update accountsWithHoldings on transfer", async function () {
      const { bond, minter, user1, user2 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(user1).transfer(user2.address, amount);
      expect(await bond.hasEnoughHoldings(user1.address, 1)).to.be.false;
      expect(await bond.hasEnoughHoldings(user2.address, amount)).to.be.true;
    });

    it("Should revert transferShares() without WRITE_ACCESS_TOKEN", async function () {
      const { bond, minter, unauthorized, user1, user2 } = await deployFixture();
      const shares = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mintBonds(user1.address, shares);
      try {
        await bond.connect(unauthorized).transferShares(user1.address, user2.address, shares);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("NO_WRITE_ACCESS"), "Should revert with NO_WRITE_ACCESS");
      }
    });

    it("Should revert transfer from blocked account", async function () {
      const { bond, minter, admin, user1, user2 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(admin).blockAccounts([user1.address]);
      try {
        await bond.connect(user1).transfer(user2.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BondBlockedSender") || e.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("IHoldings Interface", function () {
    it("Should return share holdings", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      expect(await bond.getShareHoldings(user1.address)).to.equal(amount);
    });

    it("Should check if account has enough holdings", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      expect(await bond.hasEnoughHoldings(user1.address, amount)).to.be.true;
      expect(await bond.hasEnoughHoldings(user1.address, amount + 1n)).to.be.false;
    });

    it("Should update holder in list", async function () {
      const { bond, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.updateHolderInList(user1.address);
      expect(await bond.hasEnoughHoldings(user1.address, amount)).to.be.true;
    });

    it("Should remove empty holder from list", async function () {
      const { bond, minter, burner, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      await bond.connect(burner).burn(user1.address, amount);
      await bond.removeEmptyHolderFromList(user1.address);
      expect(await bond.hasEnoughHoldings(user1.address, 1)).to.be.false;
    });
  });

  describe("Maturity Settlement", function () {
    it("Should settle maturity and burn all tokens", async function () {
      const { bond, minter, owner, user1, user2 } = await deployFixture();
      const amount1 = ethers.parseUnits("1000", 18);
      const amount2 = ethers.parseUnits("2000", 18);
      await bond.connect(minter).mint(user1.address, amount1);
      await bond.connect(minter).mint(user2.address, amount2);

      // Fast forward past maturity
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      const tx = await bond.connect(owner).settleMaturity();
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = bond.interface.parseLog(log);
          return parsed?.name === "BondMatured";
        } catch {
          return false;
        }
      });
      assert(event !== undefined, "BondMatured event should be emitted");
      if (event) {
        const parsed = bond.interface.parseLog(event);
        assert(parsed?.args[0] === amount1 + amount2, "Event should have correct totalBurned");
      }

      expect(await bond.isActive()).to.be.false;
      expect(await bond.balanceOf(user1.address)).to.equal(0n);
      expect(await bond.balanceOf(user2.address)).to.equal(0n);
      expect(await bond.totalSupply()).to.equal(0n);
    });

    it("Should revert settleMaturity() before maturity date", async function () {
      const { bond, owner } = await deployFixture();
      try {
        await bond.connect(owner).settleMaturity();
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BondNotMature") || e.message.includes("NOT_MATURE"), "Should revert with BondNotMature");
      }
    });

    it("Should revert settleMaturity() if already settled", async function () {
      const { bond, owner } = await deployFixture();
      
      // Fast forward past maturity
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await bond.connect(owner).settleMaturity();
      try {
        await bond.connect(owner).settleMaturity();
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BondAlreadySettled") || e.message.includes("ALREADY_SETTLED"), "Should revert with BondAlreadySettled");
      }
    });

    it("Should revert settleMaturity() by non-admin", async function () {
      const { bond, unauthorized } = await deployFixture();
      
      // Fast forward past maturity
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      try {
        await bond.connect(unauthorized).settleMaturity();
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("AccessControl") || e.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("Coupon Tracking", function () {
    it("Should mark coupon as paid", async function () {
      const { bond, owner } = await deployFixture();
      const paymentDate = Math.floor(Date.now() / 1000);
      const tx = await bond.connect(owner).markCouponPaid(paymentDate);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = bond.interface.parseLog(log);
          return parsed?.name === "CouponPaid";
        } catch {
          return false;
        }
      });
      assert(event !== undefined, "CouponPaid event should be emitted");
      if (event) {
        const parsed = bond.interface.parseLog(event);
        assert(parsed?.args[0] === BigInt(paymentDate), "Event should have correct paymentDate");
      }
      expect(await bond.couponPaid(paymentDate)).to.be.true;
    });

    it("Should revert markCouponPaid() by non-admin", async function () {
      const { bond, unauthorized } = await deployFixture();
      const paymentDate = Math.floor(Date.now() / 1000);
      try {
        await bond.connect(unauthorized).markCouponPaid(paymentDate);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("AccessControl") || e.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("Share Conversion", function () {
    it("Should convert tokens to bonds (shares)", async function () {
      const { bond } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      const shares = await bond.convertToBonds(amount);
      expect(shares).to.equal(amount); // rewardMultiplier = 1e18
    });

    it("Should convert bonds (shares) to tokens", async function () {
      const { bond } = await deployFixture();
      const shares = ethers.parseUnits("1000", 18);
      const tokens = await bond.convertToTokens(shares);
      expect(tokens).to.equal(shares); // rewardMultiplier = 1e18
    });
  });

  describe("Access Control", function () {
    it("Should pause and unpause transfers", async function () {
      const { bond, admin, minter, user1 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      
      await bond.connect(admin).pause();
      try {
        await bond.connect(user1).transfer(admin.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BondPausedTransfers") || e.message.includes("revert"), "Should revert when paused");
      }

      await bond.connect(admin).unpause();
      await bond.connect(user1).transfer(admin.address, amount);
      expect(await bond.balanceOf(admin.address)).to.equal(amount);
    });

    it("Should block and unblock accounts", async function () {
      const { bond, admin, minter, user1, user2 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);
      
      await bond.connect(admin).blockAccounts([user1.address]);
      expect(await bond.isBlocked(user1.address)).to.be.true;
      try {
        await bond.connect(user1).transfer(user2.address, amount);
        assert(false, "Should have reverted");
      } catch (e: any) {
        assert(e.message.includes("BondBlockedSender") || e.message.includes("revert"), "Should revert when blocked");
      }

      await bond.connect(admin).unblockAccounts([user1.address]);
      expect(await bond.isBlocked(user1.address)).to.be.false;
      await bond.connect(user1).transfer(user2.address, amount);
    });
  });

  describe("Reward Multiplier", function () {
    it("Should set reward multiplier", async function () {
      const { bond, owner } = await deployFixture();
      const newMultiplier = ethers.parseUnits("1.1", 18);
      await bond.connect(owner).setRewardMultiplier(newMultiplier);
      expect(await bond.rewardMultiplier()).to.equal(newMultiplier);
    });

    it("Should add to reward multiplier via oracle", async function () {
      const { bond, admin } = await deployFixture();
      const increment = ethers.parseUnits("0.1", 18);
      const initial = await bond.rewardMultiplier();
      await bond.connect(admin).addRewardMultiplier(increment);
      expect(await bond.rewardMultiplier()).to.equal(initial + increment);
    });
  });

  describe("Permit", function () {
    it("Should permit and transferFrom", async function () {
      const { bond, minter, user1, user2 } = await deployFixture();
      const amount = ethers.parseUnits("1000", 18);
      await bond.connect(minter).mint(user1.address, amount);

      // Use a future deadline (current time + 1 hour)
      const currentTime = await ethers.provider.getBlock("latest").then(b => b?.timestamp || 0);
      const deadline = currentTime + 3600;
      const nonce = await bond.nonces(user1.address);
      const domain = {
        name: await bond.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await bond.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const value = {
        owner: user1.address,
        spender: user2.address,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      };

      const signature = await user1.signTypedData(domain, types, value);
      const sig = ethers.Signature.from(signature);
      const r = sig.r;
      const s = sig.s;
      const v = sig.v;

      await bond.connect(user2).permit(user1.address, user2.address, amount, deadline, v, r, s);
      await bond.connect(user2).transferFrom(user1.address, user2.address, amount);
      expect(await bond.balanceOf(user2.address)).to.equal(amount);
    });
  });
});
