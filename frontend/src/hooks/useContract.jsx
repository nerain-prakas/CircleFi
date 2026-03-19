import { useCallback, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, parseEther } from 'ethers'
import { CONTRACT_ADDRESS, CIRCLEFI_ABI, RPC_URL } from '../utils/constants'
import { useWalletContext } from '../context/WalletContext'

/**
 * Hook for contract interactions via ethers.js
 */
export function useContract() {
  const { connector } = useWalletContext()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getContractAddress = useCallback(() => {
    const address = CONTRACT_ADDRESS || import.meta.env.VITE_CONTRACT_ADDRESS
    if (!address) {
      throw new Error('Contract address is missing. Set VITE_CONTRACT_ADDRESS and restart the frontend.')
    }
    return address
  }, [])

  /**
   * Get provider instance
   */
  const getProvider = useCallback(() => {
    return new JsonRpcProvider(import.meta.env.VITE_RPC_URL || RPC_URL)
  }, [])

  const getReadProvider = useCallback(async () => {
    return getProvider()
  }, [getProvider])

  const getSigner = useCallback(async () => {
    if (!connector || !connector.signers?.length) {
      throw new Error('Wallet not connected')
    }

    try {
      const wcProvider = connector.signers[0].provider
      if (wcProvider) {
        const provider = new BrowserProvider(wcProvider)
        return await provider.getSigner()
      }
    } catch (err) {
      console.log('WC provider fallback:', err)
    }

    // Final fallback: use HashPack signer directly.
    return connector.signers[0]
  }, [connector])

  /**
   * Initialize contract instance for read operations with a provider.
   */
  const initializeContract = useCallback(async (provider) => {
    try {
      setError(null)

      const address = getContractAddress()
      const activeProvider = provider || (await getReadProvider())

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
  }, [getContractAddress, getReadProvider])

  /**
   * Fetch contract data only when called explicitly.
   */
  const fetchContractData = useCallback(
    async (fetcher, provider) => {
      try {
        console.log('Fetching with contract:', import.meta.env.VITE_CONTRACT_ADDRESS)
        setLoading(true)
        setError(null)

        const activeProvider = provider || (await getReadProvider())
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
    [getReadProvider, initializeContract]
  )

  /**
   * Call contract function (read-only)
   */
  const callFunction = useCallback(async (functionName, args = []) => {
    const provider = contract?.runner ?? (await getReadProvider())
    return fetchContractData(
      async (activeContract) => activeContract[functionName](...args),
      provider
    )
  }, [contract, fetchContractData, getReadProvider])

  /**
   * Execute contract function (state-changing)
   */
  const executeFunction = useCallback(async (functionName, args = [], options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const address = getContractAddress()
      const signer = await getSigner()
      const provider = await getReadProvider()
      const contractWithProvider = new Contract(address, CIRCLEFI_ABI, provider)

      const callArgs = [...args]
      if (options && Object.keys(options).length > 0) {
        callArgs.push(options)
      }

      const txRequest = await contractWithProvider[functionName].populateTransaction(...callArgs)
      const tx = await signer.sendTransaction({
        ...txRequest,
        gasLimit: txRequest.gasLimit ?? 300000n,
        gasPrice: txRequest.gasPrice ?? 930000000000n,
      })
      const receipt = await tx.wait()
      return receipt
    } catch (err) {
      console.error(`Contract execution error (${functionName}):`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getContractAddress, getReadProvider, getSigner])

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

  const createChitGroup = useCallback(async (...params) => {
    setLoading(true)
    setError(null)

    try {
      const address = getContractAddress()
      const signer = await getSigner()
      const provider = await getReadProvider()
      const contractWithProvider = new Contract(address, CIRCLEFI_ABI, provider)
      const createChitGroupFn = contractWithProvider.interface.getFunction('createChitGroup')

      let txRequest
      if (createChitGroupFn.inputs.length === 4) {
        if (params.length === 4) {
          const [name, memberCount, contribution, duration] = params
          txRequest = await contractWithProvider.createChitGroup.populateTransaction(
            name,
            memberCount,
            parseEther(contribution.toString()),
            duration
          )
        } else {
          throw new Error('createChitGroup requires name, memberCount, contribution, and duration')
        }
      } else {
        const [memberCount, contribution, duration] = params.length === 4
          ? [params[1], params[2], params[3]]
          : params

        txRequest = await contractWithProvider.createChitGroup.populateTransaction(
          memberCount,
          parseEther(contribution.toString()),
          duration
        )
      }

      const tx = await signer.sendTransaction({
        ...txRequest,
        gasLimit: txRequest.gasLimit ?? 300000n,
        gasPrice: txRequest.gasPrice ?? 930000000000n,
      })

      await tx.wait()
      return tx
    } catch (err) {
      console.error('Contract execution error (createChitGroup):', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getContractAddress, getReadProvider, getSigner])

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

  const revealBid = useCallback(async (groupId, amount, salt) => {
    return executeFunction('revealBid', [groupId, amount, salt])
  }, [executeFunction])

  const vote = useCallback(async (proposalId, support) => {
    return executeFunction('vote', [proposalId, support])
  }, [executeFunction])

  const exitGroup = useCallback(async (groupId) => {
    return executeFunction('exitGroup', [groupId])
  }, [executeFunction])

  return {
    contract,
    loading,
    error,
    initializeContract,
    getProvider,
    fetchContractData,
    callFunction,
    executeFunction,
    createChitGroup,
    getReputationScore,
    getGroupCount,
    getGroupSummary,
    getGroupMembers,
    getCurrentPot,
    revealBid,
    vote,
    submitBid,
    contribute,
    createGroup,
    joinGroup,
    exitGroup,
  }
}

export default useContract
