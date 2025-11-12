// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeClub is ReentrancyGuard {
    // ===============
    // ÉTATS
    // ===============
    address[] public members;
    mapping(address => bool) public isMember;

    struct Proposal {
        string description;
        address payable recipient;
        uint256 amount;             // 0 pour adhésion/exclusion
        uint256 deadline;           // timestamp
        bool executed;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        uint256 totalMembersAtCreation; // pour calcul du quorum
    }

    Proposal[] public proposals;

    // ===============
    // ÉVÉNEMENTS
    // ===============
    event ProposalCreated(
        uint256 indexed id,
        string description,
        address recipient,
        uint256 amount
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event Executed(uint256 indexed proposalId);
    event MemberAdded(address indexed newMember);
    event MemberRemoved(address indexed removedMember);

    // ===============
    // CONSTRUCTEUR
    // ===============
    constructor() {
        _addMember(msg.sender);
    }

    // ===============
    // FONCTIONS INTERNES
    // ===============
    function _addMember(address newMember) private {
        require(newMember != address(0), "SafeClub: invalid address");
        require(!isMember[newMember], "SafeClub: already a member");
        isMember[newMember] = true;
        members.push(newMember);
        emit MemberAdded(newMember);
    }

    function getProposalsCount() public view returns (uint256) {
    return proposals.length;
}

    function _removeMember(address member) private {
        require(isMember[member], "SafeClub: not a member");
        isMember[member] = false;
        emit MemberRemoved(member);
        // Note: on ne supprime pas de `members[]` pour éviter le coût en gaz.
        // Le mapping `isMember` suffit pour les vérifications.
    }

    // ===============
    // FONCTIONS PUBLIQUES
    // ===============

    /// @notice Crée une proposition (dépense, adhésion ou exclusion)
    /// @param _description Description de la proposition
    /// @param _recipient Bénéficiaire (ou nouvelle adresse / membre à exclure)
    /// @param _amount Montant en wei (0 pour gouvernance)
    function createProposal(
    string memory _description,
    address payable _recipient,
    uint256 _amount
) external {
    require(isMember[msg.sender], "SafeClub: caller not a member");
    require(_recipient != address(0), "SafeClub: invalid recipient");

    uint256 deadline = block.timestamp + 3 days;
    uint256 totalMembers = members.length;

    uint256 proposalId = proposals.length;
    proposals.push(); // Crée un nouvel élément vide

    Proposal storage newProposal = proposals[proposalId]; // ✅ CORRIGÉéééé
    newProposal.description = _description;
    newProposal.recipient = _recipient;
    newProposal.amount = _amount;
    newProposal.deadline = deadline;
    newProposal.executed = false;
    newProposal.yesVotes = 0;
    newProposal.noVotes = 0;
    newProposal.totalMembersAtCreation = totalMembers;

    emit ProposalCreated(proposalId, _description, _recipient, _amount);
}

    /// @notice Vote sur une proposition
    /// @param _proposalId ID de la proposition
    /// @param _support true = POUR, false = CONTRE
    function vote(uint256 _proposalId, bool _support) external {
        require(isMember[msg.sender], "SafeClub: caller not a member");
        require(_proposalId < proposals.length, "SafeClub: proposal does not exist");

        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.hasVoted[msg.sender], "SafeClub: already voted");
        require(block.timestamp < proposal.deadline, "SafeClub: voting period ended");

        proposal.hasVoted[msg.sender] = true;
        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit Voted(_proposalId, msg.sender, _support);
    }

    /// @notice Exécute une proposition approuvée
    /// @param _proposalId ID de la proposition
    function execute(uint256 _proposalId) external nonReentrant {
        require(_proposalId < proposals.length, "SafeClub: proposal does not exist");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "SafeClub: already executed");
        require(block.timestamp >= proposal.deadline, "SafeClub: voting not finished");

        // Calcul du quorum : ≥ 50% des membres au moment de la création
        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        uint256 quorum = (proposal.totalMembersAtCreation + 1) / 2; // arrondi supérieur
        require(totalVotes >= quorum, "SafeClub: quorum not reached");
        require(proposal.yesVotes > proposal.noVotes, "SafeClub: majority not reached");

        // Vérification du solde pour les dépenses
        if (proposal.amount > 0) {
            require(address(this).balance >= proposal.amount, "SafeClub: insufficient balance");
        }

        proposal.executed = true;

        // Action selon le type de proposition
        if (proposal.amount == 0) {
            // Proposition de gouvernance
            if (isMember[proposal.recipient]) {
                // C'est une exclusion
                _removeMember(proposal.recipient);
            } else {
                // C'est une adhésion
                _addMember(proposal.recipient);
            }
        } else {
            // Proposition financière
            proposal.recipient.transfer(proposal.amount);
        }

        emit Executed(_proposalId);
    }

    /// @notice Permet de recevoir de l'ETH dans le vault
    receive() external payable {}
}