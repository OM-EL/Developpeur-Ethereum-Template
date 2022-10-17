// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

contract Voting is Ownable {

// Structs
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    struct Proposal {
        string description;
        uint voteCount;
    }

// Enum
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

//  State variables

    int256 private winningProposalId = -1 ;
    WorkflowStatus private workflowStatus = WorkflowStatus.RegisteringVoters ;
    mapping( address => Voter ) private voters ;
    Proposal[] private proposals;
    address[] private votersAddresses;

// Events
    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

// Modifiers 
    modifier onlyWhiteListMemmbersOrOwner() {
        require( voters[_msgSender()].isRegistered == true || owner() == _msgSender() , "You are not the whitelist and you re not the owner of the contract ");
        _;
    }

    modifier onlyWhiteListMemmbers() {
        require( voters[_msgSender()].isRegistered == true , "You are not the whitelist");
        _;
    }





// External functions 

    // Only owners 
    function addVoter (address _voter) external onlyOwner {
        require( WorkflowStatus.RegisteringVoters == workflowStatus , "You can add Voters to the whitelist only when the contract state is RegisteringVoters");
        voters[_voter].isRegistered = true ;
        votersAddresses.push(_voter);
        emit VoterRegistered(_voter);
    }


    // i made this function this way, because i didn't want to relay on the 
    // owner to pass steps in the good order 

    function passToNextStepInTheVote() external onlyOwner {
        require( uint(workflowStatus) < 5 , "Votes have being tallied there is no next step" );
        if( uint(workflowStatus) == 0 )
        {
            require(votersAddresses.length > 1 ," you can't enter a vote with less than 2 voters" );
        }
        if( uint(workflowStatus) == 1 )
        {
            require(proposals.length > 1 ," you can't enter a vote with less than 2 proposals" );
        }
        workflowStatus = WorkflowStatus (uint(workflowStatus) + 1);
        emit WorkflowStatusChange( WorkflowStatus (uint(workflowStatus) -1 ) , workflowStatus);
    }

    // These calculations might have been done in the vote function  
    // but in order to make the voters pay the minimum possible 
    // i did all the calculation in this onlyOwner method 
    function calculateResults () external onlyOwner {
        // loop to update the voting data inside result mapping and inside the proposals 
        for ( uint256 i ; i< votersAddresses.length ; i++ ) {
            Voter memory voter = voters[votersAddresses[i]];
            if ( voter.hasVoted ) {
                proposals[voter.votedProposalId].voteCount = proposals[voter.votedProposalId].voteCount + 1 ;
            }
        }
        // find the winning proposal
        uint winningIndex = 0;
        for ( uint256 i ; i< proposals.length ; i++ ) {
            if( proposals[i].voteCount > proposals[winningIndex].voteCount ) {
                winningIndex = i ; 
            }
        }
        // update the wining index
        winningProposalId = int256 (winningIndex);
        workflowStatus = WorkflowStatus.VotesTallied;
    }

    function resetVote () external onlyOwner {
        winningProposalId = -1;
        workflowStatus = WorkflowStatus.RegisteringVoters;
        for ( uint i ; i < votersAddresses.length ; i++ ) {
            voters[votersAddresses[i]] = Voter(false , false , 0);
        }
        delete proposals;
        delete votersAddresses;
    }


    // Only white list 
    function addProposals(string memory _description) external onlyWhiteListMemmbers {
        require( WorkflowStatus.ProposalsRegistrationStarted == workflowStatus, "you can't add proposals in the current state");
        require(! stringsEquals(_description , "") );
        proposals.push( Proposal(_description,0) );
        emit ProposalRegistered (proposals.length-1);
    }

// the organizer cant vote
    function vote(uint256 _proposalIndex) external onlyWhiteListMemmbers {
        require( WorkflowStatus.VotingSessionStarted == workflowStatus, "you can't add proposals in the current state");
        require(!voters[msg.sender].hasVoted , "we re in a demlocracy you can't vote twice man ");
        voters[msg.sender] = Voter(true , true ,_proposalIndex ) ;
        emit Voted( msg.sender , _proposalIndex);
    }


//Public functions 
    function getWiningProposal() public view returns (Proposal memory) {
        require( winningProposalId != -1 , "We don't have a winning proposal yet");
        return proposals[uint256 (winningProposalId)];
    }

    function getWorkflowStatus() external view onlyWhiteListMemmbersOrOwner returns (WorkflowStatus) {
        return workflowStatus;
    }

    function getVotersAddresses() external view onlyWhiteListMemmbersOrOwner returns (address[] memory) {
        return votersAddresses;
    }

    function getProposals() external view onlyWhiteListMemmbersOrOwner returns (Proposal[] memory) {
        return proposals;
    }

    function getNumberOfProposals() external view onlyWhiteListMemmbersOrOwner returns (uint256) {
        return proposals.length;
    }

    function getProposalByNumber( uint256 _proposalIndex) external view onlyWhiteListMemmbersOrOwner returns (Proposal memory) {
        require(_proposalIndex <  proposals.length , "index out of array");
        return proposals[_proposalIndex];
    }

    function getVoteByAddress() external view onlyWhiteListMemmbersOrOwner returns (Proposal[] memory) {
        require( workflowStatus >= WorkflowStatus.VotingSessionEnded , "you can't see what other prople voted for before the end of vote session");
        return proposals;
    }

    function getVotesPerProposalId(uint _proposalIndex) external view onlyWhiteListMemmbersOrOwner returns (uint256) {
        require( workflowStatus == WorkflowStatus.VotesTallied , "you can't get the number of votes if votes are not tailed yet");
        return proposals[_proposalIndex].voteCount;
    }

    function proposalsWithNumberOfVotes (uint _proposalIndex) external view onlyWhiteListMemmbersOrOwner returns (uint256 [] memory ) {
        uint256 [] memory proposalIndexes;
        for ( uint256 i ; i< proposals.length ; i++ ) {
            if( proposals[i].voteCount == _proposalIndex ) {
                proposalIndexes[0] =  i;
            }
        }
        return proposalIndexes;
    }
    

// Private functions
    function stringsEquals ( string memory _string1 , string memory _string2) pure private returns (bool) {
        bool test;
        if( keccak256(abi.encodePacked(_string1)) == keccak256( abi.encodePacked(_string2)) )
        {
            test = true;
        }
        return test;
    }
}