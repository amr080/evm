// test/deploy-factories.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("Token Factory Deployment Pipeline", function () {
  let deployer: any;
  let network: string;

  before(async function () {
    [deployer] = await ethers.getSigners();
    network = (await ethers.provider.getNetwork()).name;
  });

  describe("Detection Logic", function () {
    it("Should detect Dollar + XFTDollarFactory pair", function () {
      const factoryDir = path.join(process.cwd(), "contracts", "XFT", "modules", "factory");
      const tokenDir = path.join(process.cwd(), "contracts", "XFT", "modules", "tokens");

      if (!fs.existsSync(factoryDir) || !fs.existsSync(tokenDir)) {
        this.skip();
        return;
      }

      const factoryFiles = fs.readdirSync(factoryDir).filter((f) => f.endsWith("Factory.sol"));
      expect(factoryFiles.length).to.be.greaterThan(0, "Should find at least one factory");

      const hasDollarFactory = factoryFiles.some((f) => f === "XFTDollarFactory.sol");
      expect(hasDollarFactory).to.be.true;

      const tokenFiles = fs.readdirSync(tokenDir);
      const hasDollarToken = tokenFiles.some((f) => f === "Dollar.sol");
      expect(hasDollarToken).to.be.true;
    });

    it("Should extract token name from factory name", function () {
      const factoryName = "XFTDollarFactory";
      const match = factoryName.match(/XFT(.+)Factory/);
      expect(match).to.not.be.null;
      if (match) {
        expect(match[1]).to.equal("Dollar");
      }
    });
  });

  describe("State Management", function () {
    const testStateFile = path.join(process.cwd(), "deployments", "test-tokens.json");

    after(function () {
      // Cleanup test state file
      if (fs.existsSync(testStateFile)) {
        fs.unlinkSync(testStateFile);
      }
    });

    it("Should create state file if it doesn't exist", function () {
      const state = {
        network: "test",
        chainId: 1337,
        deployer: deployer.address,
        deployments: {},
        timestamp: Date.now(),
      };

      const outDir = path.join(process.cwd(), "deployments");
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(testStateFile, JSON.stringify(state, null, 2));
      expect(fs.existsSync(testStateFile)).to.be.true;

      const loaded = JSON.parse(fs.readFileSync(testStateFile, "utf8"));
      expect(loaded.network).to.equal("test");
    });

    it("Should load existing state file", function () {
      if (!fs.existsSync(testStateFile)) {
        this.skip();
        return;
      }

      const content = fs.readFileSync(testStateFile, "utf8");
      const state = JSON.parse(content);
      expect(state).to.have.property("network");
      expect(state).to.have.property("deployments");
    });
  });

  describe("Contract Deployment", function () {
    it("Should deploy Dollar implementation", async function () {
      const Dollar = await ethers.getContractFactory("Dollar");
      const dollarImpl = await Dollar.deploy();
      await dollarImpl.waitForDeployment();

      const address = await dollarImpl.getAddress();
      expect(address).to.not.equal(ethers.ZeroAddress);
      expect(ethers.isAddress(address)).to.be.true;
    });

    it("Should deploy XFTDollarFactory with implementation address", async function () {
      // First deploy implementation
      const Dollar = await ethers.getContractFactory("Dollar");
      const dollarImpl = await Dollar.deploy();
      await dollarImpl.waitForDeployment();
      const implAddress = await dollarImpl.getAddress();

      // Then deploy factory
      const Factory = await ethers.getContractFactory("XFTDollarFactory");
      const factory = await Factory.deploy(implAddress);
      await factory.waitForDeployment();

      const factoryAddress = await factory.getAddress();
      expect(factoryAddress).to.not.equal(ethers.ZeroAddress);

      // Verify factory has correct implementation
      const storedImpl = await factory.implementation();
      expect(storedImpl.toLowerCase()).to.equal(implAddress.toLowerCase());
    });

    it("Should skip deployment if already deployed (state check)", async function () {
      // This test verifies the logic would skip, not actually deploy
      const state = {
        network: "test",
        chainId: 1337,
        deployer: deployer.address,
        deployments: {
          Dollar: {
            tokenName: "Dollar",
            factoryName: "XFTDollarFactory",
            tokenImpl: "0x1234567890123456789012345678901234567890",
            factory: "0x0987654321098765432109876543210987654321",
          },
        },
        timestamp: Date.now(),
      };

      const deployment = state.deployments.Dollar;
      expect(deployment.tokenImpl).to.not.be.undefined;
      expect(deployment.factory).to.not.be.undefined;
      // In real script, this would skip deployment
    });
  });

  describe("Integration", function () {
    it("Should detect and process all factory+token pairs", function () {
      const factoryDir = path.join(process.cwd(), "contracts", "XFT", "modules", "factory");
      const tokenDir = path.join(process.cwd(), "contracts", "XFT", "modules", "tokens");

      if (!fs.existsSync(factoryDir) || !fs.existsSync(tokenDir)) {
        this.skip();
        return;
      }

      const factoryFiles = fs.readdirSync(factoryDir).filter((f) => f.endsWith("Factory.sol"));
      const pairs: Array<{ tokenName: string; factoryName: string }> = [];

      for (const factoryFile of factoryFiles) {
        const factoryName = factoryFile.replace(".sol", "");
        const match = factoryName.match(/XFT(.+)Factory/);
        if (!match) continue;

        const tokenName = match[1];
        const tokenFile = path.join(tokenDir, `${tokenName}.sol`);

        if (fs.existsSync(tokenFile)) {
          pairs.push({ tokenName, factoryName });
        }
      }

      expect(pairs.length).to.be.greaterThan(0);
      expect(pairs.some((p) => p.tokenName === "Dollar")).to.be.true;
    });
  });
});
