import { useCallback, useRef, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, parseEther } from 'ethers'
import {
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  TransactionId,
} from '@hashgraph/sdk'
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect'
import { CONTRACT_ADDRESS, CIRCLEFI_ABI, RPC_URL } from '../utils/constants'
import { MIRROR_NODE_URL } from '../utils/hedera'
import { useWalletContext } from '../context/WalletContext'

/**
 * Hook for contract interactions via ethers.js
 */
export function useContract() {
  const { connector, account } = useWalletContext()
  const [contract, setContract] = useState(null)
  const [resolvedContractIds, setResolvedContractIds] = useState({
    evmAddress: null,
    hederaContractId: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const isInitializing = useRef(false)
  const isFetching = useRef(false)
  const isCalling = useRef(false)

  const getContractAddress = useCallback(() => {
    const address = CONTRACT_ADDRESS || import.meta.env.VITE_CONTRACT_ADDRESS
    if (!address) {
      throw new Error('Contract address is missing. Set VITE_CONTRACT_ADDRESS and restart the frontend.')
    }
    return address
  }, [])

  const resolveContractIds = useCallback(async () => {
    const evmAddress = getContractAddress()

    if (
      resolvedContractIds.evmAddress?.toLowerCase() === evmAddress.toLowerCase() &&
      resolvedContractIds.hederaContractId
    ) {
      return resolvedContractIds
    }

    const response = await fetch(`${MIRROR_NODE_URL}/contracts/${evmAddress}`)
    if (!response.ok) {
      throw new Error(`Failed to resolve Hedera Contract ID: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const hederaContractId = data?.contract_id
    if (!hederaContractId) {
      throw new Error('Mirror node response missing contract_id for configured contract address')
    }

    const nextIds = { evmAddress, hederaContractId }
    setResolvedContractIds(nextIds)
    return nextIds
  }, [getContractAddress, resolvedContractIds])

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

    const dAppSigner = connector.signers[0]

    // DAppSigner exposes getProvider() which returns a proper EIP-1193 provider.
    // Wrap it with Ethers BrowserProvider to get a standard Ethers v6 signer.
    try {
      const eip1193Provider =
        typeof dAppSigner.getProvider === 'function'
          ? dAppSigner.getProvider()
          : dAppSigner.provider

      if (eip1193Provider) {
        const browserProvider = new BrowserProvider(eip1193Provider)
        return await browserProvider.getSigner()
      }
    } catch (err) {
      console.warn('Could not get EIP-1193 provider from DAppSigner:', err)
    }

    throw new Error(
      'Could not obtain a valid Ethers signer from the connected wallet. ' +
      'Ensure HashPack is unlocked and on Hedera Testnet.'
    )
  }, [connector])

  /**
   * Initialize contract instance for read operations with a provider.
   */
  const initializeContract = useCallback(async (provider) => {
    if (isInitializing.current) return contract
    isInitializing.current = true
    try {
      setError(null)
      const { evmAddress } = await resolveContractIds()
      const activeProvider = provider || (await getReadProvider())

      if (!activeProvider) {
        throw new Error('Provider not available')
      }

      // Create contract instance
      const contractInstance = new Contract(
        evmAddress,
        CIRCLEFI_ABI,
        activeProvider
      )

      setContract(contractInstance)
      return contractInstance
    } catch (err) {
      console.error('Contract initialization error:', err)
      setError(err.message)
      throw err
    } finally {
      isInitializing.current = false
    }
  }, [contract, getReadProvider, resolveContractIds])

  /**
   * Fetch contract data only when called explicitly.
   */
  const fetchContractData = useCallback(
    async (fetcher, provider) => {
      if (isFetching.current) return
      isFetching.current = true
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
        isFetching.current = false
        setLoading(false)
      }
    },
    [getReadProvider, initializeContract]
  )

  /**
   * Call contract function (read-only)
   */
  const callFunction = useCallback(async (functionName, args = []) => {
    if (isCalling.current) return
    isCalling.current = true
    const provider = contract?.runner ?? (await getReadProvider())
    try {
      return fetchContractData(
        async (activeContract) => activeContract[functionName](...args),
        provider
      )
    } finally {
      isCalling.current = false
    }
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

      // Connect contract directly to the signer so Ethers handles tx submission.
      const contractWithSigner = new Contract(address, CIRCLEFI_ABI, signer)

      const callArgs = [...args]
      if (options && Object.keys(options).length > 0) {
        callArgs.push(options)
      }

      const tx = await contractWithSigner[functionName](...callArgs)
      const receipt = await tx.wait()
      return receipt
    } catch (err) {
      console.error(`Contract execution error (${functionName}):`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getContractAddress, getSigner])

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
      const { hederaContractId } = await resolveContractIds()
      if (!connector || !connector.signers?.length) {
        throw new Error('Wallet not connected')
      }

      const accountId = account || connector.signers[0].getAccountId().toString()
      const network = connector.network?.toString?.() || 'testnet'
      const signerAccountId = accountId.startsWith('hedera:')
        ? accountId
        : `hedera:${network}:${accountId}`

      const contributionWeiFrom = (value) => {
        const raw = String(value).trim()
        if (!raw) {
          throw new Error('contribution must be provided')
        }
        return parseEther(raw).toString()
      }

      const uintStringFrom = (value, fieldName) => {
        try {
          const raw = String(value).trim()
          if (!raw) {
            throw new Error('empty')
          }
          const normalized = BigInt(raw)
          if (normalized < 0n) {
            throw new Error('negative')
          }
          return normalized.toString()
        } catch {
          throw new Error(`${fieldName} must be a valid non-negative integer`)
        }
      }

      let tx
      if (params.length === 4) {
        const [name, memberCount, contribution, duration] = params
        tx = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(hederaContractId))
          .setGas(300000)
          .setFunction(
            'createChitGroup',
            new ContractFunctionParameters()
              .addString(String(name))
              .addUint256(uintStringFrom(memberCount, 'memberCount'))
              .addUint256(contributionWeiFrom(contribution))
              .addUint256(uintStringFrom(duration, 'duration'))
          )
      } else {
        const [memberCount, contribution, duration] = params.length === 4
          ? [params[1], params[2], params[3]]
          : params

        tx = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(hederaContractId))
          .setGas(300000)
          .setFunction(
            'createChitGroup',
            new ContractFunctionParameters()
              .addUint256(uintStringFrom(memberCount, 'memberCount'))
              .addUint256(contributionWeiFrom(contribution))
              .addUint256(uintStringFrom(duration, 'duration'))
          )
      }

      // Ensure transaction has transactionId/nodeAccountIds before serializing for WalletConnect.
      const dappSigner = connector.signers[0]
      const plainAccountId = accountId.startsWith('hedera:')
        ? accountId.split(':').pop()
        : accountId

      if (typeof tx.freezeWithSigner === 'function' && dappSigner) {
        await tx.freezeWithSigner(dappSigner)
      } else if (typeof dappSigner?.getClient === 'function') {
        const client = dappSigner.getClient()
        tx.freezeWith(client)
      } else {
        tx
          .setTransactionId(TransactionId.generate(AccountId.fromString(plainAccountId)))
          .setNodeAccountIds([AccountId.fromString('0.0.3')])
          .freeze()
      }

      const txBase64 = transactionToBase64String(tx)
      const result = await connector.signAndExecuteTransaction({
        signerAccountId,
        transactionList: txBase64,
      })

      return result
    } catch (err) {
      console.error('Contract execution error (createChitGroup):', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [account, connector, resolveContractIds])

  const createGroup = useCallback(async (memberCount, monthlyContribution, duration) => {
    return createChitGroup(memberCount, monthlyContribution, duration)
  }, [createChitGroup])

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
    contractAddress: resolvedContractIds.evmAddress,
    hederaContractId: resolvedContractIds.hederaContractId,
    loading,
    error,
    resolveContractIds,
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
