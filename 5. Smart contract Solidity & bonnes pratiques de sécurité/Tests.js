const {expectRevert, expectEvent, BN} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const Voting = artifacts.require('Voting');

contract('Voting contract tests suite', function(accounts) {
  const owner = accounts[0];
  const voter = accounts[1];
  const anotherVoter = accounts[2];
  const unregisteredVoter = accounts[3];

  const proposalIdLoremIpsum = new BN(0);
  const proposalIdLoremDolor = new BN(1);
  const defaultValue = new BN(0);

  const WorkflowStatusRegisteringVoters = new BN(0);
  const WorkflowStatusProposalsRegistrationStarted = new BN(1);
  const WorkflowStatusProposalsRegistrationEnded = new BN(2);
  const WorkflowStatusVotingSessionStarted = new BN(3);
  const WorkflowStatusVotingSessionEnded = new BN(4);
  const WorkflowStatusVotesTallie = new BN(5);

  describe('Contract ownership', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
    });

    it('Ownership has been transferred', async function() {
      expect(await this.Voting.owner()).to.equal(owner);
    });
  });

  describe('Get voter informations', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
      this.Voting.addVoter(voter);
      this.Voting.addVoter(anotherVoter);
    });

    it('As a voter, I should not be able to get a vote if I am not registered', async function() {
      await expectRevert(this.Voting.getVoter(voter, {from: unregisteredVoter}), 'You\'re not a voter');
    });

    it('As a voter, I should not be able to add a proposal yet', async function() {
      await expectRevert(this.Voting.addProposal('This will fail', {from: voter}), 'Proposals are not allowed yet');
    });

    it('As a voter, I should be able to get my own vote', async function() {
      const ownVote = await this.Voting.getVoter(voter, {from: voter});
      expect(ownVote.isRegistered).to.equal(true);
      expect(ownVote.hasVoted).to.equal(false);
      expect(ownVote.votedProposalId).to.be.bignumber.equal(defaultValue);
    });

    // A voter should not be able to do this, we may add a new require on the getter to let voters access only their own vote
    it('As a voter, I should be able to get others vote', async function() {
      const voteFromAnotherVoter = await this.Voting.getVoter(anotherVoter, {from: voter});
      expect(voteFromAnotherVoter.isRegistered).to.equal(true);
      expect(voteFromAnotherVoter.hasVoted).to.equal(false);
      expect(voteFromAnotherVoter.votedProposalId).to.be.bignumber.equal(defaultValue);
    });
  });

  describe('Get One proposal informations', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
      this.Voting.addVoter(voter);
      this.Voting.startProposalsRegistering();
      this.Voting.addProposal('Lorem Ipsum', {from: voter});
    });

    it('As the owner, I can\'t add new voters after starting proposal registration', async function() {
      await expectRevert(this.Voting.addVoter(anotherVoter, {from: owner}), 'Voters registration is not open yet');
    });

    it('As a voter, I should not be able to get a proposal if I am not registered', async function() {
      await expectRevert(this.Voting.getOneProposal(voter, {from: unregisteredVoter}), 'You\'re not a voter');
    });

    it('As a voter, I should be able to get a proposal informations', async function() {
      const proposal = await this.Voting.getOneProposal(proposalIdLoremIpsum, {from: voter});
      expect(proposal.description).to.equal('Lorem Ipsum');
      expect(proposal.voteCount).to.be.bignumber.equal(defaultValue);
    });
  });

  describe('As the owner, I should be able to update the workflow status', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
    });

    it('The workflow status must start with RegisteringVoters', async function() {
      const currentStatus = await this.Voting.workflowStatus.call();
      expect(currentStatus).to.be.bignumber.equal(WorkflowStatusRegisteringVoters);
    });

    it('Only startProposalsRegistering can be done with RegisteringVoters status', async function() {
      await expectRevert(this.Voting.endProposalsRegistering({from: owner}), 'Registering proposals havent started yet');
      await expectRevert(this.Voting.startVotingSession({from: owner}), 'Registering proposals phase is not finished');
      await expectRevert(this.Voting.endVotingSession({from: owner}), 'Voting session havent started yet');
    });

    it('The workflow status must start with RegisteringVoters', async function() {
      const resultStartProposalsRegistering = await this.Voting.startProposalsRegistering({from: owner});
      expectEvent(resultStartProposalsRegistering, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatusRegisteringVoters,
        newStatus: WorkflowStatusProposalsRegistrationStarted,
      });
    });

    it('Only endProposalsRegistering can be done with ProposalsRegistrationStarted status', async function() {
      await expectRevert(this.Voting.startProposalsRegistering({from: owner}), 'Registering proposals cant be started now');
      await expectRevert(this.Voting.startVotingSession({from: owner}), 'Registering proposals phase is not finished');
      await expectRevert(this.Voting.endVotingSession({from: owner}), 'Voting session havent started yet');
    });

    it('The workflow status must start with ProposalsRegistrationStarted', async function() {
      const resultEndProposalsRegistering = await this.Voting.endProposalsRegistering({from: owner});
      expectEvent(resultEndProposalsRegistering, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatusProposalsRegistrationStarted,
        newStatus: WorkflowStatusProposalsRegistrationEnded,
      });
    });

    it('Only startVotingSession can be done with ProposalsRegistrationEnded status', async function() {
      await expectRevert(this.Voting.startProposalsRegistering({from: owner}), 'Registering proposals cant be started now');
      await expectRevert(this.Voting.endProposalsRegistering({from: owner}), 'Registering proposals havent started yet');
      await expectRevert(this.Voting.endVotingSession({from: owner}), 'Voting session havent started yet');
    });

    it('The workflow status must start with ProposalsRegistrationEnded', async function() {
      const resultStartVotingSession = await this.Voting.startVotingSession({from: owner});
      expectEvent(resultStartVotingSession, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatusProposalsRegistrationEnded,
        newStatus: WorkflowStatusVotingSessionStarted,
      });
    });

    it('Only startVotingSession can be done with ProposalsRegistrationEnded status', async function() {
      await expectRevert(this.Voting.startProposalsRegistering({from: owner}), 'Registering proposals cant be started now');
      await expectRevert(this.Voting.endProposalsRegistering({from: owner}), 'Registering proposals havent started yet');
      await expectRevert(this.Voting.startVotingSession({from: owner}), 'Registering proposals phase is not finished');
    });

    it('The workflow status must start with VotingSessionStarted status', async function() {
      const resultEndVotingSession = await this.Voting.endVotingSession({from: owner});
      expectEvent(resultEndVotingSession, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatusVotingSessionStarted,
        newStatus: WorkflowStatusVotingSessionEnded,
      });
    });
  });

  describe('As the owner, I should be able to add voters', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
    });

    it('Only the owner can add voters', async function() {
      await expectRevert(this.Voting.addVoter(unregisteredVoter, {from: voter}), 'Ownable: caller is not the owner');
    });

    it('A voter can not access voters information if he has not been registered', async function() {
      await expectRevert(this.Voting.getVoter(voter, {from: voter}), 'You\'re not a voter');
    });

    it('A voter can be registered', async function() {
      const resultSuccessAddVoter = await this.Voting.addVoter(voter);
      expectEvent(resultSuccessAddVoter, 'VoterRegistered', {
        voterAddress: voter,
      });

      const newVoter = await this.Voting.getVoter(voter, {from: voter});
      expect(newVoter.isRegistered).to.equal(true);
      expect(newVoter.hasVoted).to.equal(false);
      expect(newVoter.votedProposalId).to.be.bignumber.equal(defaultValue);
    });

    it('An address could not be registered more than once', async function() {
      await expectRevert(this.Voting.addVoter(voter), 'Already registered');
    });
  });

  describe('As a voter, I should be able to add a proposal', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
      this.Voting.addVoter(voter);
      this.Voting.startProposalsRegistering();
    });

    it('Only a registered voter can add a proposal', async function() {
      await expectRevert(this.Voting.addProposal('foo', {from: unregisteredVoter}), 'You\'re not a voter');
    });

    it('A voter can\'t add an empty proposal', async function() {
      await expectRevert(this.Voting.addProposal('', {from: voter}), 'Vous ne pouvez pas ne rien proposer');
    });

    it('A voter can add a proposal', async function() {
      await expectRevert(this.Voting.getOneProposal(proposalIdLoremIpsum, {from: voter}), 'revert');

      const addProposalResult = await this.Voting.addProposal('Lorem Ipsum', {from: voter});
      expectEvent(addProposalResult, 'ProposalRegistered', {
        proposalId: proposalIdLoremIpsum,
      });

      const newProposal = await this.Voting.getOneProposal(proposalIdLoremIpsum, {from: voter});
      expect(newProposal.description).to.equal('Lorem Ipsum');
      expect(newProposal.voteCount).to.be.bignumber.equal(defaultValue);
    });

    it('A voter can add another proposal', async function() {
      const addProposalResult = await this.Voting.addProposal('Lorem Dolor', {from: voter});
      expectEvent(addProposalResult, 'ProposalRegistered', {
        proposalId: proposalIdLoremDolor,
      });

      const newProposal = await this.Voting.getOneProposal(proposalIdLoremDolor, {from: voter});
      expect(newProposal.description).to.equal('Lorem Dolor');
      expect(newProposal.voteCount).to.be.bignumber.equal(defaultValue);
    });
  });

  describe('As a voter, I should be able to vote', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
      this.Voting.addVoter(voter);
      this.Voting.startProposalsRegistering();
      this.Voting.addProposal('Lorem Ipsum', {from: voter});
      this.Voting.addProposal('Lorem Dolor', {from: voter});
      this.Voting.endProposalsRegistering();
    });

    it('Only a registered voter can vote', async function() {
      await expectRevert(this.Voting.vote(proposalIdLoremDolor, {from: unregisteredVoter}), 'You\'re not a voter');
    });

    it('A voter can\'t vote on a wrong status', async function() {
      await expectRevert(this.Voting.vote(proposalIdLoremDolor, {from: voter}), 'Voting session havent started yet');
    });

    it('A voter can not vote on an inexisting proposal', async function() {
      await this.Voting.startVotingSession();
      await expectRevert(this.Voting.vote(new BN(42), {from: voter}), 'Proposal not found');
    });

    it('A voter can vote on an existing proposal', async function() {
      const votedProposal = await this.Voting.getOneProposal(proposalIdLoremDolor, {from: voter});
      expect(votedProposal.voteCount).to.be.bignumber.equal(defaultValue);

      const voterBeforeVoting = await this.Voting.getVoter(voter, {from: voter});
      expect(voterBeforeVoting.isRegistered).to.equal(true);
      expect(voterBeforeVoting.hasVoted).to.equal(false);
      expect(voterBeforeVoting.votedProposalId).to.be.bignumber.equal(defaultValue);

      const voteResult = await this.Voting.vote(proposalIdLoremDolor, {from: voter});
      expectEvent(voteResult, 'Voted', {
        voter: voter,
        proposalId: proposalIdLoremDolor,
      });

      voterAfterVoting = await this.Voting.getVoter(voter, {from: voter});
      expect(voterAfterVoting.isRegistered).to.equal(true);
      expect(voterAfterVoting.hasVoted).to.equal(true);
      expect(voterAfterVoting.votedProposalId).to.be.bignumber.equal(proposalIdLoremDolor);
    });

    it('A voter can not vote another time', async function() {
      await expectRevert(this.Voting.vote(proposalIdLoremDolor, {from: voter}), 'You have already voted');
    });

    it('A proposal should be incremented after a vote', async function() {
      const loremIpsumProposal = await this.Voting.getOneProposal(proposalIdLoremIpsum, {from: voter});
      expect(loremIpsumProposal.voteCount).to.be.bignumber.equal(defaultValue);

      const loremDolorProposal = await this.Voting.getOneProposal(proposalIdLoremDolor, {from: voter});
      expect(loremDolorProposal.voteCount).to.be.bignumber.equal(new BN(1));
    });
  });

  describe('As the owner, I should be able to tally', () => {
    before(async function() {
      this.Voting = await Voting.new({from: owner});
      this.Voting.addVoter(voter);
      this.Voting.startProposalsRegistering();
      this.Voting.addProposal('Lorem Ipsum', {from: voter});
      this.Voting.addProposal('Lorem Dolor', {from: voter});
      this.Voting.endProposalsRegistering();
      this.Voting.startVotingSession();
      this.Voting.vote(proposalIdLoremDolor, {from: voter});
    });

    it('Only the owner can tally', async function() {
      await expectRevert(this.Voting.tallyVotes({from: voter}), 'Ownable: caller is not the owner');
    });

    it('A owner can\'t tally on a wrong status', async function() {
      await expectRevert(this.Voting.tallyVotes(), 'Current status is not voting session ended');
    });

    it('A owner can tally', async function() {
      await this.Voting.endVotingSession();

      const tallyResult = await this.Voting.tallyVotes();
      expectEvent(tallyResult, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatusVotingSessionEnded,
        newStatus: WorkflowStatusVotesTallie,
      });
    });

    it('The winningProposalID must be proposalIdLoremDolor after tally', async function() {
      const currentStatus = await this.Voting.winningProposalID.call();
      expect(currentStatus).to.be.bignumber.equal(proposalIdLoremDolor);
    });

    it('The workflow status must be equal to VotesTallied after tally', async function() {
      const currentStatus = await this.Voting.workflowStatus.call();
      expect(currentStatus).to.be.bignumber.equal(WorkflowStatusVotesTallie);
    });
  });
});
