// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CircleFi - Decentralized Rotating Credit Association Protocol
 * @notice A chit fund implementation on Hedera EVM with blind auction mechanism
 * @dev Implements security measures including ReentrancyGuard, Ownable, and Pausable
 */
contract CircleFi is ReentrancyGuard, Ownable, Pausable {
    // Structs
    struct ChitGroup {
        uint256 groupId;
        string groupName;
        uint256 memberCount;
        uint256 monthlyContribution;
        uint256 duration; // in months
        uint256 totalPot;
        uint256 currentMonth;
        address[] members;
        mapping(address => bool) hasJoined;
        mapping(address => bool) hasWon;
        mapping(address => uint256) contributions;
        mapping(uint256 => Bid[]) bids; // bids for each month
        mapping(address => uint256) dividendBalances;
        mapping(address => uint256) reputationScores;
        bool isActive;
        address admin;
    }

    struct Bid {
        address bidder;
        uint256 sealedBid; // encrypted bid amount
        bytes32 salt; // for bid revelation
        bool revealed;
        uint256 revealedAmount;
    }

    // State variables
    mapping(uint256 => ChitGroup) public chitGroups;
    uint256 public groupCounter;
    uint256 public constant EXIT_PENALTY_BPS = 500; // 5% penalty on exit
    uint256 public constant MIN_REPUTATION_SCORE = 50; // Minimum score to join
    uint256 public constant AUCTION_DEADLINE = 24 hours; // 24 hours for bid revelation
    
    // Events
    event GroupCreated(
        uint256 indexed groupId,
        uint256 memberCount,
        uint256 monthlyContribution,
        uint256 duration,
        address indexed creator
    );
    
    event MemberJoined(uint256 indexed groupId, address indexed member);
    event ContributionReceived(uint256 indexed groupId, address indexed member, uint256 amount);
    event BidSubmitted(uint256 indexed groupId, uint256 month, address indexed bidder);
    event BidRevealed(uint256 indexed groupId, uint256 month, address indexed bidder, uint256 amount);
    event WinnerSelected(uint256 indexed groupId, uint256 month, address indexed winner, uint256 winningAmount);
    event PotDistributed(uint256 indexed groupId, address indexed winner, uint256 amount);
    event DividendPaid(uint256 indexed groupId, address indexed member, uint256 amount);
    event ReputationUpdated(address indexed member, uint256 newScore);

    /**
     * @notice Constructor to initialize the contract and set owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates a new chit group
     * @param _memberCount Number of members in the group
     * @param _monthlyContribution Amount each member contributes monthly
     * @param _duration Duration of the chit group in months
     */
    function createChitGroup(
        uint256 _memberCount,
        uint256 _monthlyContribution,
        uint256 _duration
    ) external onlyOwner returns (uint256) {
        require(_memberCount > 1, "Must have at least 2 members");
        require(_monthlyContribution > 0, "Contribution must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        uint256 groupId = groupCounter++;
        
        ChitGroup storage newGroup = chitGroups[groupId];
        newGroup.groupId = groupId;
        newGroup.groupName = "";
        newGroup.memberCount = _memberCount;
        newGroup.monthlyContribution = _monthlyContribution;
        newGroup.duration = _duration;
        newGroup.totalPot = 0;
        newGroup.currentMonth = 0;
        newGroup.isActive = true;
        newGroup.admin = msg.sender;

        emit GroupCreated(groupId, _memberCount, _monthlyContribution, _duration, msg.sender);
        
        return groupId;
    }

    /**
     * @notice Allows a member to join a chit group
     * @param _groupId ID of the chit group to join
     */
    function joinChitGroup(uint256 _groupId) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.isActive, "Group is not active");
        require(!group.hasJoined[msg.sender], "Already joined this group");
        require(group.members.length < group.memberCount, "Group is full");
        require(group.reputationScores[msg.sender] >= MIN_REPUTATION_SCORE, "Insufficient reputation score");

        group.members.push(msg.sender);
        group.hasJoined[msg.sender] = true;
        
        emit MemberJoined(_groupId, msg.sender);
    }

    /**
     * @notice Allows a member to exit a chit group with a penalty
     * @param _groupId ID of the chit group to exit
     */
    function exitGroup(uint256 _groupId) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.isActive, "Group is not active");
        require(group.hasJoined[msg.sender], "Not a member of this group");

        // Remove member from list
        for (uint256 i = 0; i < group.members.length; i++) {
            if (group.members[i] == msg.sender) {
                group.members[i] = group.members[group.members.length - 1];
                group.members.pop();
                break;
            }
        }

        group.hasJoined[msg.sender] = false;

        uint256 contributed = group.contributions[msg.sender];
        if (contributed > 0) {
            uint256 penalty = (contributed * EXIT_PENALTY_BPS) / 10000;
            uint256 refund = contributed - penalty;
            group.contributions[msg.sender] = 0;

            if (refund > 0) {
                require(group.totalPot >= refund, "Insufficient pot balance");
                group.totalPot -= refund;

                (bool success, ) = payable(msg.sender).call{value: refund}("");
                require(success, "Refund failed");
            }
        }
    }

    /**
     * @notice Allows members to make monthly contributions
     * @param _groupId ID of the chit group
     */
    function contribute(uint256 _groupId) external whenNotPaused payable nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.hasJoined[msg.sender], "Not a member of this group");
        require(!group.hasWon[msg.sender], "Winner cannot contribute further");
        require(msg.value == group.monthlyContribution, "Incorrect contribution amount");

        group.contributions[msg.sender] += msg.value;
        group.totalPot += msg.value;

        emit ContributionReceived(_groupId, msg.sender, msg.value);
    }

    /**
     * @notice Submit a sealed bid for the blind auction
     * @param _groupId ID of the chit group
     * @param _sealedBidHash Hash of the bid amount + salt
     */
    function submitBid(uint256 _groupId, bytes32 _sealedBidHash) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.hasJoined[msg.sender], "Not a member of this group");
        require(!group.hasWon[msg.sender], "Winner cannot bid again");
        require(group.currentMonth < group.duration, "Group duration ended");
        require(group.bids[group.currentMonth].length < group.members.length, "All bids received for this month");

        Bid memory newBid = Bid({
            bidder: msg.sender,
            sealedBid: uint256(_sealedBidHash),
            salt: bytes32(0), // Will be set during reveal
            revealed: false,
            revealedAmount: 0
        });

        group.bids[group.currentMonth].push(newBid);
        
        emit BidSubmitted(_groupId, group.currentMonth, msg.sender);
    }

    /**
     * @notice Reveal a previously submitted bid
     * @param _groupId ID of the chit group
     * @param _bidAmount Actual bid amount
     * @param _salt Salt used to create the sealed bid
     */
    function revealBid(uint256 _groupId, uint256 _bidAmount, bytes32 _salt) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.hasJoined[msg.sender], "Not a member of this group");
        
        bytes32 sealedBidHash = keccak256(abi.encodePacked(_bidAmount, _salt));
        
        Bid[] storage monthBids = group.bids[group.currentMonth];
        bool found = false;
        
        for (uint256 i = 0; i < monthBids.length; i++) {
            if (monthBids[i].bidder == msg.sender && 
                !monthBids[i].revealed && 
                monthBids[i].sealedBid == uint256(sealedBidHash)) {
                
                monthBids[i].revealed = true;
                monthBids[i].revealedAmount = _bidAmount;
                monthBids[i].salt = _salt;
                found = true;
                break;
            }
        }
        
        require(found, "Bid not found or already revealed");
        
        emit BidRevealed(_groupId, group.currentMonth, msg.sender, _bidAmount);
    }

    /**
     * @notice Select the winner of the current month's auction
     * @param _groupId ID of the chit group
     */
    function selectWinner(uint256 _groupId) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(msg.sender == group.admin, "Only admin can select winner");
        require(group.currentMonth < group.duration, "Group duration ended");
        
        Bid[] storage monthBids = group.bids[group.currentMonth];
        require(monthBids.length == group.members.length, "All members must submit bids");
        
        // Find the lowest valid bid
        uint256 lowestBid = type(uint256).max;
        address winner = address(0);
        uint256 winnerIndex = 0;
        
        for (uint256 i = 0; i < monthBids.length; i++) {
            if (monthBids[i].revealed && monthBids[i].revealedAmount < lowestBid) {
                lowestBid = monthBids[i].revealedAmount;
                winner = monthBids[i].bidder;
                winnerIndex = i;
            }
        }
        
        require(winner != address(0), "No valid bids found");
        require(lowestBid <= group.totalPot, "Winning bid exceeds pot");
        
        // Mark winner
        group.hasWon[winner] = true;
        
        // Distribute pot to winner
        uint256 potAmount = group.totalPot;
        group.totalPot = 0; // Reset pot
        
        // Update reputation scores
        updateReputation(winner, 10); // Increase winner's reputation
        
        // Pay dividends to remaining members
        uint256 dividendPerMember = 0;
        if (group.members.length > 1) {
            uint256 totalDividend = (lowestBid * 9) / 100; // 9% of winning bid as dividend
            dividendPerMember = totalDividend / (group.members.length - 1);
            
            for (uint256 i = 0; i < group.members.length; i++) {
                address member = group.members[i];
                if (member != winner) {
                    group.dividendBalances[member] += dividendPerMember;
                    updateReputation(member, 5); // Increase reputation for participation
                }
            }
        }
        
        emit WinnerSelected(_groupId, group.currentMonth, winner, lowestBid);
        emit PotDistributed(_groupId, winner, potAmount);
        emit DividendPaid(_groupId, winner, dividendPerMember);
        
        // Move to next month
        group.currentMonth++;
    }

    /**
     * @notice Withdraw dividend balance
     * @param _groupId ID of the chit group
     */
    function withdrawDividend(uint256 _groupId) external whenNotPaused nonReentrant {
        ChitGroup storage group = chitGroups[_groupId];
        require(group.hasJoined[msg.sender], "Not a member of this group");
        
        uint256 amount = group.dividendBalances[msg.sender];
        require(amount > 0, "No dividends to withdraw");
        
        group.dividendBalances[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Update reputation score for a member
     * @param _member Address of the member
     * @param _scoreDelta Change in reputation score
     */
    function updateReputation(address _member, int256 _scoreDelta) internal {
        uint256 newScore = _scoreDelta >= 0 
            ? uint256(int256(chitGroups[0].reputationScores[_member]) + _scoreDelta)
            : chitGroups[0].reputationScores[_member] >= uint256(-_scoreDelta)
                ? chitGroups[0].reputationScores[_member] - uint256(-_scoreDelta)
                : 0;
                
        // Cap the reputation score between 0 and 100
        newScore = newScore > 100 ? 100 : newScore;
        
        chitGroups[0].reputationScores[_member] = newScore;
        
        emit ReputationUpdated(_member, newScore);
    }

    /**
     * @notice Get reputation score for a member
     * @param _member Address of the member
     * @return Reputation score
     */
    function getReputationScore(address _member) external view returns (uint256) {
        return chitGroups[0].reputationScores[_member];
    }

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get current pot size for a group
     * @param _groupId ID of the chit group
     * @return Current pot size
     */
    function getCurrentPot(uint256 _groupId) external view returns (uint256) {
        return chitGroups[_groupId].totalPot;
    }

    /**
     * @notice Get members of a group
     * @param _groupId ID of the chit group
     * @return Array of member addresses
     */
    function getMembers(uint256 _groupId) external view returns (address[] memory) {
        return chitGroups[_groupId].members;
    }

    /**
     * @notice Get current month of a group
     * @param _groupId ID of the chit group
     * @return Current month number
     */
    function getCurrentMonth(uint256 _groupId) external view returns (uint256) {
        return chitGroups[_groupId].currentMonth;
    }

    /**
     * @notice Get name of a group
     * @param _groupId ID of the chit group
     * @return Group name
     */
    function getName(uint256 _groupId) external view returns (string memory) {
        return chitGroups[_groupId].groupName;
    }
}