//import { expect } from "@nomicfoundation/hardhat-toolbox";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Voting Rules", function () {
  it("Should enforce quorum (≥50%) and strict majority", async function () {
    const [founder, m2, m3, m4, beneficiary] = await ethers.getSigners();
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();

    // Ajouter 3 membres
    const membersToAdd = [m2, m3, m4];
    const currentMembers = [founder];

    // Add m2 (1 member total, quorum = 1)
    await safeClub.createProposal("Add", m2.address, 0);
    let id = (await safeClub.getProposalsCount()) - 1n;
    await safeClub.connect(founder).vote(id, true);
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(id);

    // Add m3 (2 members total, quorum = 1)
    await safeClub.createProposal("Add", m3.address, 0);
    id = (await safeClub.getProposalsCount()) - 1n;
    await safeClub.connect(founder).vote(id, true);
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(id);

    // Add m4 (3 members total, quorum = 2)
    await safeClub.createProposal("Add", m4.address, 0);
    id = (await safeClub.getProposalsCount()) - 1n;
    await safeClub.connect(founder).vote(id, true);
    await safeClub.connect(m2).vote(id, true); // Need 2 votes to meet quorum
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(id);

    // Fund the contract
    await founder.sendTransaction({
      to: await safeClub.getAddress(),
      value: ethers.parseEther("1")
    });

    // Créer dépense
    await safeClub.createProposal("Spend", beneficiary.address, ethers.parseEther("0.5"));
    id = (await safeClub.getProposalsCount()) - 1n;

    // Voter : 2 POUR, 1 CONTRE → quorum = 3/4 = 75% ≥ 50%, mais majorité = 2 > 1 → OK
    await safeClub.connect(founder).vote(id, true);
    await safeClub.connect(m2).vote(id, true);
    await safeClub.connect(m3).vote(id, false);

    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
    await safeClub.execute(id);
    
    const proposal = await safeClub.proposals(id);
    expect(proposal.executed).to.equal(true);
  });
});