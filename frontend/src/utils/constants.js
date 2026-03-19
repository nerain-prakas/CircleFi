/**
 * Contract ABIs and Constants
 */

// CircleFi Contract Address
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

// CircleFi Contract ABI
export const CIRCLEFI_ABI = [
  {
    "inputs": [
      { "type": "uint256", "name": "_memberCount" },
      { "type": "uint256", "name": "_monthlyContribution" },
      { "type": "uint256", "name": "_duration" },
    ],
    "name": "createChitGroup",
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "joinChitGroup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "exitGroup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
  },
  {
    "inputs": [
      { "type": "uint256", "name": "_groupId" },
      { "type": "bytes32", "name": "_sealedBidHash" },
    ],
    "name": "submitBid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "address", "name": "_member" }],
    "name": "getReputationScore",
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "getCurrentPot",
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "getMembers",
    "outputs": [{ "type": "address[]", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "getCurrentMonth",
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "_groupId" }],
    "name": "getName",
    "outputs": [{ "type": "string", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "groupCounter",
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "" }],
    "name": "chitGroups",
    "outputs": [
      { "type": "uint256", "name": "groupId" },
      { "type": "uint256", "name": "memberCount" },
      { "type": "uint256", "name": "monthlyContribution" },
      { "type": "uint256", "name": "duration" },
      { "type": "uint256", "name": "totalPot" },
      { "type": "uint256", "name": "currentMonth" },
      { "type": "bool", "name": "isActive" },
      { "type": "address", "name": "admin" },
    ],
    "stateMutability": "view",
    "type": "function",
  },
]

// HCS Topic ID for Sealed Bids
export const HCS_TOPIC_ID = import.meta.env.VITE_HCS_TOPIC_ID

// Network Configuration
export const NETWORKS = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
}

// Default RPC URL
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://testnet.hashio.io/api'

// Auction Phases
export const AUCTION_PHASES = {
  SEALED: 'SEALED',
  REVEALED: 'REVEALED',
  COMPLETED: 'COMPLETED',
}

// Member Status
export const MEMBER_STATUS = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  INACTIVE: 'Inactive',
  EXITED: 'Exited',
}

// Reputation Levels
export const REPUTATION_LEVELS = {
  EXCELLENT: { min: 80, max: 100, label: 'Excellent', color: 'cyan' },
  GOOD: { min: 60, max: 79, label: 'Good', color: 'purple' },
  FAIR: { min: 40, max: 59, label: 'Fair', color: 'yellow' },
  POOR: { min: 0, max: 39, label: 'Poor', color: 'red' },
}

// Min/Max Constraints
export const CONSTRAINTS = {
  MIN_BID: 0.1,
  MAX_BID: 10.0,
  MIN_CIRCLE_SIZE: 2,
  MAX_CIRCLE_SIZE: 15,
  MIN_REPUTATION: 50,
  MONTHLY_CONTRIBUTION_MIN: 0.5,
  MONTHLY_CONTRIBUTION_MAX: 10.0,
}

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  INVALID_BID_AMOUNT: `Bid must be between ${CONSTRAINTS.MIN_BID} and ${CONSTRAINTS.MAX_BID} HBAR`,
  LOW_REPUTATION: `Minimum reputation score required: ${CONSTRAINTS.MIN_REPUTATION}`,
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  HCS_SUBMISSION_FAILED: 'Failed to submit to HCS. Please verify your connection',
}

export default {
  CONTRACT_ADDRESS,
  CIRCLEFI_ABI,
  HCS_TOPIC_ID,
  NETWORKS,
  RPC_URL,
  AUCTION_PHASES,
  MEMBER_STATUS,
  REPUTATION_LEVELS,
  CONSTRAINTS,
  ERROR_MESSAGES,
}
