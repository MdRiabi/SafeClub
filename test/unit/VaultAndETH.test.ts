//import { expect } from "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault and ETH", function () {
  it("Should receive ETH in the vault", async function () {
    const [founder] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    const deposit = ethers.parseEther("3.0");
    await founder.sendTransaction({ to: await safeClub.getAddress(), value: deposit });
    expect(await ethers.provider.getBalance(await safeClub.getAddress())).to.equal(deposit);
  });
});