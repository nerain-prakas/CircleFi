import { useCallback, useState } from 'react'
import { Contract, JsonRpcProvider, Signer } from 'ethers'
import { CONTRACT_ADDRESS, CIRCLEFI_ABI, RPC_URL } from '../utils/constants'

/**
 * Hook for contract interactions via ethers.js
 */
export function useContract() {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Initialize contract instance with signer
   */
  const initializeContract = useCallback(async (provider) => {
    try {
      setLoading(true)
      setError(null)

      if (!provider) {
        throw new Error('Provider not available')
      }

      // Get signer from provider
      const signer = await provider.getSigner?.()

      // Create contract instance
      const contractInstance = new Contract(
        CONTRACT_ADDRESS,
        CIRCLEFI_ABI,
        signer || provider
      )

      setContract(contractInstance)
      return contractInstance
    } catch (err) {
      console.error('Contract initialization error:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get provider instance
   */
  const getProvider = useCallback(() => {
    return new JsonRpcProvider(RPC_URL)
  }, [])

  /**
   * Call contract function (read-only)
   */
  const callFunction = useCallback(
    async (functionName, args = []) => {
      if (!contract) {
        throw new Error('Contract not initialized')
      }

      try {
        setLoading(true)
        setError(null)

        const result = await contract[functionName](...args)
        return result
      } catch (err) {
        console.error(`Contract call error (${functionName}):`, err)
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [contract]
  )

  /**
   * Execute contract function (state-changing)
   */
  const executeFunction = useCallback(
    async (functionName, args = [], options = {}) => {
      if (!contract) {
        throw new Error('Contract not initialized')
      }

      try {
        setLoading(true)
        setError(null)

        const tx = await contract[functionName](...args, options)

        // Wait for transaction confirmation
        const receipt = await tx.wait()

        return receipt
      } catch (err) {
        console.error(`Contract execution error (${functionName}):`, err)
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [contract]
  )

  /**
   * Get reputation score for an address
   */
  const getReputationScore = useCallback(
    async (address) => {
      return callFunction('getReputationScore', [address])
    },
    [callFunction]
  )

  /**
   * Get circle details
   */
  const getCircleDetails = useCallback(
    async (circleId) => {
      return callFunction('getCircleDetails', [circleId])
    },
    [callFunction]
  )

  /**
   * Submit bid to circle
   */
  const submitBid = useCallback(
    async (circleId, bidAmount) => {
      return executeFunction('submitBid', [circleId, bidAmount])
    },
    [executeFunction]
  )

  /**
   * Contribute to circle
   */
  const contributeToCircle = useCallback(
    async (circleId, amount) => {
      return executeFunction('contributeToCircle', [circleId], {
        value: amount,
      })
    },
    [executeFunction]
  )

  /**
   * Create a new circle
   */
  const createCircle = useCallback(
    async (name, monthlyContribution, duration) => {
      return executeFunction('createCircle', [name, monthlyContribution, duration])
    },
    [executeFunction]
  )

  return {
    contract,
    loading,
    error,
    initializeContract,
    getProvider,
    callFunction,
    executeFunction,
    getReputationScore,
    getCircleDetails,
    submitBid,
    contributeToCircle,
    createCircle,
  }
}

export default useContract
