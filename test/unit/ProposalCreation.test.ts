//import { expect } from "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proposal Creation", function () {
  it("Should create a spending proposal", async function () {
    const [founder, beneficiary] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    const amount = ethers.parseEther("1.0");
    await safeClub.createProposal("Buy pizza", beneficiary.address, amount);
    const proposal = await safeClub.proposals(0);

    expect(proposal.description).to.equal("Buy pizza");
    expect(proposal.recipient).to.equal(beneficiary.address);
    expect(proposal.amount).to.equal(amount);
    expect(proposal.executed).to.be.false;
  });
});