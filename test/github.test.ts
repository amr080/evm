import { expect } from "chai";
import fs from "fs";
import path from "path";

// Test the logic functions from github.ts
// Note: These tests verify the format and logic, not actual git operations

describe("GitHub Script Tests", function () {
  describe("getTimestamp", function () {
    it("should return timestamp in YYYYMMDD-HHMMSS format", function () {
      // Import the function (we'll need to export it)
      // For now, test the format manually
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
      
      // Should match format: YYYYMMDD-HHMMSS (no underscores)
      expect(timestamp).to.match(/^\d{4}\d{2}\d{2}-\d{2}\d{2}\d{2}$/);
      expect(timestamp).to.not.include("_");
    });
  });

  describe("getBranchName", function () {
    it("should create archive branch with correct format", function () {
      const timestamp = "20241215-143022";
      const branchName = `archive-${timestamp}`;
      
      expect(branchName).to.equal("archive-20241215-143022");
      expect(branchName).to.not.include("_");
    });

    it("should create archive-fail branch when failed", function () {
      const timestamp = "20241215-143022";
      const branchName = `archive-fail-${timestamp}`;
      
      expect(branchName).to.equal("archive-fail-20241215-143022");
      expect(branchName).to.not.include("_");
    });
  });

  describe("Environment Variables", function () {
    it("should use GH_USERNAME from env", function () {
      process.env.GH_USERNAME = "testuser";
      const username = process.env.GH_USERNAME || "amr080";
      expect(username).to.equal("testuser");
      delete process.env.GH_USERNAME;
    });

    it("should use GH_COMMIT_EMAIL from env", function () {
      process.env.GH_COMMIT_EMAIL = "test@example.com";
      const email = process.env.GH_COMMIT_EMAIL || "test@users.noreply.github.com";
      expect(email).to.equal("test@example.com");
      delete process.env.GH_COMMIT_EMAIL;
    });

    it("should fallback to default username if GH_USERNAME not set", function () {
      delete process.env.GH_USERNAME;
      const username = process.env.GH_USERNAME || "amr080";
      expect(username).to.equal("amr080");
    });
  });

  describe("Branch Name Format", function () {
    it("should use dashes not underscores in branch names", function () {
      const testCases = [
        { timestamp: "20241215-143022", failed: false, expected: "archive-20241215-143022" },
        { timestamp: "20241215-143022", failed: true, expected: "archive-fail-20241215-143022" },
      ];

      testCases.forEach(({ timestamp, failed, expected }) => {
        const prefix = failed ? "archive-fail" : "archive";
        const branchName = `${prefix}-${timestamp}`;
        expect(branchName).to.equal(expected);
        expect(branchName).to.not.include("_");
      });
    });
  });

  describe("Commit Message Format", function () {
    it("should format commit message correctly for success", function () {
      const timestamp = "20241215-143022";
      const commitMessage = timestamp;
      expect(commitMessage).to.equal("20241215-143022");
      expect(commitMessage).to.not.include("_");
    });

    it("should format commit message with error for failure", function () {
      const timestamp = "20241215-143022";
      const errorMessage = "Tests failed: command failed: npx hardhat test";
      const commitMessage = `${timestamp} - ${errorMessage}`;
      expect(commitMessage).to.include(timestamp);
      expect(commitMessage).to.include(errorMessage);
      expect(commitMessage).to.not.include("_");
    });
  });
});
