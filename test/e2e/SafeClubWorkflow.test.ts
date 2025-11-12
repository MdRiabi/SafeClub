import { expect } from "chai";
import { ethers } from "hardhat";

describe("SafeClub E2E Workflow – DEBUG VERSION", function () {
  it("Full demo with debug logs: Deposit → Add Members → Proposal → Vote → Execute", async function () {
    const [founder, m2, m3, m4, beneficiary] = await ethers.getSigners();

    console.log("🚀 Déploiement du contrat...");
    const SafeClub = await ethers.getContractFactory("SafeClub");
    const safeClub = await SafeClub.deploy();
    await safeClub.waitForDeployment();
    console.log("✅ Contrat déployé. Fondateur =", founder.address);

    // Compter les membres après déploiement
    let count = 0;
    while (true) {
      try {
        await safeClub.members(count);
        count++;
      } catch (error) {
        break;
      }
    }
    console.log("Nombre de membres après déploiement :", count.toString());

   /////////////////////////addMember
   const addMember = async (addr: string) => {
  console.log(`➕ Création proposition d'ajout pour ${addr}`);
  await safeClub.createProposal("Add member", addr, 0);
  const count = await safeClub.getProposalsCount();
  const id = count - 1n;
  console.log(`   → Proposition ID: ${id}`);

  // Récupérer le nombre de membres actifs
  let memberCount = 0;
  while (true) {
    try {
      await safeClub.members(memberCount);
      memberCount++;
    } catch {
      break;
    }
  }

  // Faire voter TOUS les membres actifs
  for (let i = 0; i < memberCount; i++) {
    const member = await safeClub.members(i);
    await safeClub.connect(await ethers.getSigner(member)).vote(id, true);
  }
  console.log(`   → ${memberCount} votes POUR`);

  await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);
  console.log(`   → Deadline passée`);
  await safeClub.execute(id);
  console.log(`✅ Membre ajouté: ${addr}`);

  const isMem = await safeClub.isMember(addr);
  console.log(`   → isMember[${addr}] = ${isMem}`);
};

    // Ajout des 3 membres
    await addMember(m2.address);
    await addMember(m3.address);
    await addMember(m4.address);

    // Dépôt de 5 ETH
    console.log("💰 Dépôt de 5 ETH dans le vault...");
    const deposit = ethers.parseEther("5.0");
    await founder.sendTransaction({ to: await safeClub.getAddress(), value: deposit });
    const vaultBalance = await ethers.provider.getBalance(await safeClub.getAddress());
    console.log(`✅ Vault balance = ${ethers.formatEther(vaultBalance)} ETH`);

    // Création de la proposition de dépense
    console.log("📝 Création proposition de dépense...");
    await safeClub.createProposal("Achat serveur", beneficiary.address, ethers.parseEther("1.5"));
    const propId = 3n;

    const prop = await safeClub.proposals(propId);
    console.log("totalMembersAtCreation:", prop.totalMembersAtCreation.toString());

    // Votes
    console.log("🗳️  Votes des membres...");
    await safeClub.connect(founder).vote(propId, true);
    await safeClub.connect(m2).vote(propId, true);
    await safeClub.connect(m3).vote(propId, true);
    await safeClub.connect(m4).vote(propId, false);
    console.log(`✅ 3 POUR, 1 CONTRE`);

    // Passer deadline
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 3600]);

    // Vérif avant exécution
    const propBeforeExec = await safeClub.proposals(propId);
    const totalVotes = propBeforeExec.yesVotes + propBeforeExec.noVotes;
    const quorumRequired = (propBeforeExec.totalMembersAtCreation + 1n) / 2n;
    console.log("🔍 État avant exécution :");
    console.log(`   → totalMembersAtCreation = ${propBeforeExec.totalMembersAtCreation.toString()}`);
    console.log(`   → yesVotes = ${propBeforeExec.yesVotes.toString()}`);
    console.log(`   → noVotes = ${propBeforeExec.noVotes.toString()}`);
    console.log(`   → totalVotes = ${totalVotes.toString()}`);
    console.log(`   → quorum required = ${quorumRequired.toString()}`);
    console.log(`   → quorum satisfied? ${totalVotes >= quorumRequired}`);

    // Exécution
    console.log("⚡ Exécution de la proposition...");
    await safeClub.execute(propId);
    console.log("✅ Proposition exécutée avec succès !");

    // Vérifications finales
    const executed = (await safeClub.proposals(propId)).executed;
    const benefBalance = await ethers.provider.getBalance(beneficiary.address);
    const vaultFinal = await ethers.provider.getBalance(await safeClub.getAddress());
    console.log(`✅ Résultats finaux :`);
    console.log(`   → executed = ${executed}`);
    console.log(`   → Bénéficiaire reçoit = ${ethers.formatEther(benefBalance)} ETH`);
    console.log(`   → Vault final = ${ethers.formatEther(vaultFinal)} ETH`);
  });
});