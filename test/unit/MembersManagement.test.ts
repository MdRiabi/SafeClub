//import { expect } from "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";

import { ethers } from "hardhat";

describe("Members Management", function () {
  it("Should add founder as first member on deployment", async function () {
    const [founder] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    expect(await safeClub.members(0)).to.equal(founder.address);
    expect(await safeClub.isMember(founder.address)).to.be.true;
  });

  it("Should add new member via approved proposal", async function () {
    const [founder, newMember] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    // Créer proposition d'adhésion
    await safeClub.createProposal("Add member", newMember.address, 0);
    await safeClub.vote(0, true);
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(0);

    expect(await safeClub.isMember(newMember.address)).to.be.true;
  });
});