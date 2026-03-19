import { useCallback, useState } from 'react'
import { fetchHCSMessages, decodeHCSMessage, getAccountBalance } from '../utils/hedera'

/**
 * Hook for Hedera Consensus Service (HCS) interactions
 */
export function useHCS() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch HCS messages from a topic
   */
  const getMessages = useCallback(async (topicId) => {
    try {
      setLoading(true)
      setError(null)

      const fetchedMessages = await fetchHCSMessages(topicId)
      
      // Decode messages
      const decodedMessages = fetchedMessages.map((msg) => ({
        ...msg,
        decodedMessage: decodeHCSMessage(msg.message),
      }))

      setMessages(decodedMessages)
      return decodedMessages
    } catch (err) {
      console.error('Failed to fetch HCS messages:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Parse sealed bid messages
   */
  const parseBidMessages = useCallback(async (topicId) => {
    try {
      setLoading(true)
      setError(null)

      const msgs = await fetchHCSMessages(topicId)
      
      const bids = msgs
        .map((msg) => {
          try {
            const decoded = decodeHCSMessage(msg.message)
            const bidData = JSON.parse(decoded)
            return {
              id: msg.consensus_timestamp,
              hash: msg.transaction_hash,
              bidData,
              timestamp: new Date(msg.consensus_timestamp * 1000),
            }
          } catch (e) {
            console.error('Failed to parse bid message:', e)
            return null
          }
        })
        .filter((bid) => bid !== null)

      return bids
    } catch (err) {
      console.error('Failed to parse bid messages:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get account balance from mirror node
   */
  const getBalance = useCallback(async (accountId) => {
    try {
      setLoading(true)
      setError(null)

      const balance = await getAccountBalance(accountId)
      return balance
    } catch (err) {
      console.error('Failed to get account balance:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Parse proposal votes from HCS
   */
  const parseProposalVotes = useCallback(async (topicId) => {
    try {
      setLoading(true)
      setError(null)

      const msgs = await fetchHCSMessages(topicId)
      
      const votes = msgs
        .map((msg) => {
          try {
            const decoded = decodeHCSMessage(msg.message)
            const voteData = JSON.parse(decoded)
            return {
              id: msg.consensus_timestamp,
              voter: voteData.voter,
              proposalId: voteData.proposalId,
              vote: voteData.vote, // 'yes' or 'no'
              timestamp: new Date(msg.consensus_timestamp * 1000),
            }
          } catch (e) {
            return null
          }
        })
        .filter((vote) => vote !== null)

      return votes
    } catch (err) {
      console.error('Failed to parse proposal votes:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Watch HCS topic for new messages (polling)
   */
  const watchTopic = useCallback((topicId, callback, interval = 5000) => {
    const timer = setInterval(async () => {
      try {
        const msgs = await getMessages(topicId)
        callback(msgs)
      } catch (err) {
        console.error('Error watching topic:', err)
      }
    }, interval)

    // Return cleanup function
    return () => clearInterval(timer)
  }, [getMessages])

  return {
    messages,
    loading,
    error,
    getMessages,
    parseBidMessages,
    parseProposalVotes,
    watchTopic,
    getBalance,
  }
}

export default useHCS
