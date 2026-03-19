/**
 * Contract ABIs and Constants
 */

// CircleFi Contract Address
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0.0.0'

// CircleFi Contract ABI
export const CIRCLEFI_ABI = [
  {
    "inputs": [],
    "name": "createCircle",
    "outputs": [{ "type": "uint256", "name": "circleId" }],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "circleId" }],
    "name": "contributeToCircle",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "circleId" }, { "type": "uint256", "name": "bidAmount" }],
    "name": "submitBid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "circleId" }],
    "name": "revealBids",
    "outputs": [{ "type": "address", "name": "winner" }],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [{ "type": "address", "name": "member" }],
    "name": "getReputationScore",
    "outputs": [{ "type": "uint256", "name": "score" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [{ "type": "uint256", "name": "circleId" }],
    "name": "getCircleDetails",
    "outputs": [
      { "type": "uint256", "name": "potSize" },
      { "type": "uint256", "name": "memberCount" },
      { "type": "uint256", "name": "currentMonth" },
      { "type": "address[]", "name": "members" },
    ],
    "stateMutability": "view",
    "type": "function",
  },
]

// HCS Topic ID for Sealed Bids
export const HCS_TOPIC_ID = import.meta.env.VITE_HCS_TOPIC_ID || '0.0.0'

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
