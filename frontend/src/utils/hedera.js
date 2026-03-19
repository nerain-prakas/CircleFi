/**
 * Hedera SDK Configuration and Helpers
 */

import { Client, TopicMessageSubmitTransaction, TopicId } from '@hashgraph/sdk'

// Hedera network configuration
export const HEDERA_NETWORK = import.meta.env.VITE_HEDERA_NETWORK || 'testnet'
export const HEDERA_ACCOUNT_ID = import.meta.env.VITE_HEDERA_ACCOUNT_ID
export const MIRROR_NODE_URL = import.meta.env.VITE_MIRROR_NODE_URL || 
  'https://testnet.mirrornode.hedera.com/api/v1'

/**
 * Initialize Hedera client
 */
export function initializeHederaClient() {
  if (HEDERA_NETWORK === 'testnet') {
    return Client.forTestnet()
  } else if (HEDERA_NETWORK === 'mainnet') {
    return Client.forMainnet()
  } else {
    throw new Error(`Unknown Hedera network: ${HEDERA_NETWORK}`)
  }
}

/**
 * Fetch messages from HCS topic via mirror node
 * @param {string} topicId - Topic ID (e.g., "0.0.12345")
 * @returns {Promise<Array>} Array of messages
 */
export async function fetchHCSMessages(topicId) {
  try {
    const response = await fetch(
      `${MIRROR_NODE_URL}/topics/${topicId}/messages?limit=100&order=desc`
    )

    if (!response.ok) {
      throw new Error(`Mirror node error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.messages || []
  } catch (error) {
    console.error('Failed to fetch HCS messages:', error)
    throw error
  }
}

/**
 * Parse HCS message body (base64 encoded)
 * @param {string} base64Message - Base64 encoded message
 * @returns {string} Decoded message
 */
export function decodeHCSMessage(base64Message) {
  try {
    return atob(base64Message)
  } catch (error) {
    console.error('Failed to decode message:', error)
    return ''
  }
}

/**
 * Get transaction details from mirror node
 * @param {string} txId - Transaction ID
 * @returns {Promise<Object>} Transaction details
 */
export async function getTransactionDetails(txId) {
  try {
    const response = await fetch(`${MIRROR_NODE_URL}/transactions/${txId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.statusText}`)
    }

    const data = await response.json()
    return data.transactions?.[0] || null
  } catch (error) {
    console.error('Failed to get transaction details:', error)
    throw error
  }
}

/**
 * Get account balance from mirror node
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Account balance info
 */
export async function getAccountBalance(accountId) {
  try {
    const response = await fetch(`${MIRROR_NODE_URL}/accounts/${accountId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      balance: data.balance?.balance || 0,
      cryptocurrency: data.balance?.tokens || [],
    }
  } catch (error) {
    console.error('Failed to get account balance:', error)
    throw error
  }
}

/**
 * Convert tinybars to HBAR
 */
export function tinybarsToHbar(tinybars) {
  return tinybars / 1e8
}

/**
 * Convert HBAR to tinybars
 */
export function hbarToTinybars(hbar) {
  return hbar * 1e8
}
