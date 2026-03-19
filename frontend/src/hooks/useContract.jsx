import { useCallback, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, parseEther } from 'ethers'
import { CONTRACT_ADDRESS, CIRCLEFI_ABI, RPC_URL } from '../utils/constants'

/**
 * Hook for contract interactions via ethers.js
 */
export function useContract() {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Get provider instance
   */
  const getProvider = useCallback(() => {
    return new JsonRpcProvider(RPC_URL)
  }, [])

  const getWalletProvider = useCallback(async () => {
    if (!window?.ethereum) {
      return null
    }

    const walletProvider = new BrowserProvider(window.ethereum)
    const accounts = await walletProvider.listAccounts()

    if (!accounts.length) {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
    }

    return walletProvider
  }, [])

  /**
   * Initialize contract instance with signer
   */
  const initializeContract = useCallback(async (provider) => {
    try {
      setError(null)

      const address = CONTRACT_ADDRESS || import.meta.env.VITE_CONTRACT_ADDRESS
      if (!address) {
        throw new Error('Contract address is missing. Set VITE_CONTRACT_ADDRESS and restart the frontend.')
      }

      let activeProvider = provider
      if (!activeProvider) {
        // Prefer a connected wallet provider when one is available.
        activeProvider = await getWalletProvider()
      }

      if (!activeProvider) {
        activeProvider = getProvider()
      }

      if (!activeProvider) {
        throw new Error('Provider not available')
      }

      // Create contract instance
      const contractInstance = new Contract(
        address,
        CIRCLEFI_ABI,
        activeProvider
      )

      setContract(contractInstance)
      return contractInstance
    } catch (err) {
      console.error('Contract initialization error:', err)
      setError(err.message)
      throw err
    }
  }, [getProvider, getWalletProvider])

  /**
   * Fetch contract data only when called explicitly.
   */
  const fetchContractData = useCallback(
    async (fetcher, provider) => {
      try {
        console.log('Fetching with contract:', import.meta.env.VITE_CONTRACT_ADDRESS)
        setLoading(true)
        setError(null)

        const activeProvider = provider || getProvider()
        const activeContract = await initializeContract(activeProvider)
        return await fetcher(activeContract)
      } catch (err) {
        console.error('Contract data fetch error:', err)
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [getProvider, initializeContract]
  )

  /**
   * Call contract function (read-only)
   */
  const callFunction = useCallback(async (functionName, args = []) => {
    const provider = contract?.runner ?? getProvider()
    return fetchContractData(
      async (activeContract) => activeContract[functionName](...args),
      provider
    )
  }, [contract, fetchContractData, getProvider])

  /**
   * Execute contract function (state-changing)
   */
  const executeFunction = useCallback(async (functionName, args = [], options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const activeContract = contract || (await initializeContract(getProvider()))

      const tx = await activeContract[functionName](...args, options)
      const receipt = await tx.wait()
      return receipt
    } catch (err) {
      console.error(`Contract execution error (${functionName}):`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [contract, getProvider, initializeContract])

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
  const getGroupCount = useCallback(async () => {
    return callFunction('groupCounter')
  }, [callFunction])

  /**
   * Submit bid to circle
   */
  const getGroupSummary = useCallback(async (groupId) => {
    return callFunction('chitGroups', [groupId])
  }, [callFunction])

  /**
   * Contribute to circle
   */
  const getGroupMembers = useCallback(async (groupId) => {
    return callFunction('getMembers', [groupId])
  }, [callFunction])

  /**
   * Create a new circle
   */
  const getCurrentPot = useCallback(async (groupId) => {
    return callFunction('getCurrentPot', [groupId])
  }, [callFunction])

  const createGroup = useCallback(async (memberCount, monthlyContribution, duration) => {
    const contributionWei = parseEther(monthlyContribution)
    return executeFunction('createChitGroup', [memberCount, contributionWei, duration])
  }, [executeFunction])

  const joinGroup = useCallback(async (groupId) => {
    return executeFunction('joinChitGroup', [groupId])
  }, [executeFunction])

  const contribute = useCallback(async (groupId, amountHbar) => {
    return executeFunction('contribute', [groupId], {
      value: parseEther(amountHbar),
    })
  }, [executeFunction])

  const submitBid = useCallback(async (groupId, sealedBidHash) => {
    return executeFunction('submitBid', [groupId, sealedBidHash])
  }, [executeFunction])

  const exitGroup = useCallback(async () => {
    throw new Error('exitGroup is not available in the current contract')
  }, [])

  return {
    contract,
    loading,
    error,
    initializeContract,
    getProvider,
    fetchContractData,
    callFunction,
    executeFunction,
    getReputationScore,
    getGroupCount,
    getGroupSummary,
    getGroupMembers,
    getCurrentPot,
    submitBid,
    contribute,
    createGroup,
    joinGroup,
    exitGroup,
  }
}

export default useContract
