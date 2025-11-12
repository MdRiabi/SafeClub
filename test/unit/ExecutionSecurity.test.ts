//import { expect } from "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Execution Security", function () {
  it("Should reject execution before deadline", async function () {
    const [founder, beneficiary] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    await safeClub.createProposal("Early", beneficiary.address, ethers.parseEther("1.0"));
    await safeClub.vote(0, true);
    await expect(safeClub.execute(0)).to.be.revertedWith("SafeClub: voting not finished");
  });

  it("Should reject double execution", async function () {
    const [founder, beneficiary] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    await founder.sendTransaction({ to: await safeClub.getAddress(), value: ethers.parseEther("2.0") });
    await safeClub.createProposal("Double", beneficiary.address, ethers.parseEther("1.0"));
    await safeClub.vote(0, true);
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(0);
    await expect(safeClub.execute(0)).to.be.revertedWith("SafeClub: already executed");
  });
});