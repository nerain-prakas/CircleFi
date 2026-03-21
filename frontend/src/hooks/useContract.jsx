import { useCallback, useEffect, useRef, useState } from 'react'
import * as ethers from 'ethers'
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
} from '@hashgraph/sdk'
import { CONTRACT_ADDRESS, CIRCLEFI_ABI } from '../utils/constants'
import { MIRROR_NODE_URL } from '../utils/hedera'
import { useWalletContext } from '../context/WalletContext'

const contractInitialized = { current: false }

const getHederaContractId = async () => {
  try {
    const evmAddress = import.meta.env.VITE_CONTRACT_ADDRESS
    const mirrorUrl = `${import.meta.env.VITE_MIRROR_NODE_URL}/contracts/${evmAddress}`
    const response = await fetch(mirrorUrl)
    const data = await response.json()
    console.log('Resolved Hedera contract ID:', data.contract_id)
    return data.contract_id
  } catch {
    return import.meta.env.VITE_HEDERA_CONTRACT_ID
  }
}

/**
 * Hook for contract interactions.
 * - Read operations: ethers JsonRpcProvider (no wallet)
 * - Write operations: Hedera SDK ContractExecuteTransaction with HashPack signer
 */
export function useContract() {
  const { connector } = useWalletContext()

  const [readContract, setReadContract] = useState(null)
  const [writeContract, setWriteContract] = useState(null)
  const [contractData, setContractData] = useState({ groups: [], totalPot: 0 })
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

  const getReadProvider = useCallback(async () => {
    return new ethers.JsonRpcProvider(
      import.meta.env.VITE_RPC_URL || 'https://testnet.hashio.io/api'
    )
  }, [])

  const getProvider = useCallback(() => {
    return new ethers.JsonRpcProvider(
      import.meta.env.VITE_RPC_URL || 'https://testnet.hashio.io/api'
    )
  }, [])

  const initializeContract = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(
        import.meta.env.VITE_RPC_URL ||
        'https://testnet.hashio.io/api'
      )

      console.log('Provider created, connecting to Hedera testnet...')

      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS
      console.log('Contract address:', contractAddress)

      if (!contractAddress) {
        console.error('VITE_CONTRACT_ADDRESS is not set!')
        return null
      }

      const contract = new ethers.Contract(
        contractAddress,
        CIRCLEFI_ABI,
        provider
      )

      console.log('Contract instance created, verifying...')
      const counter = await contract.groupCounter()
      console.log('Contract verified! groupCounter:', counter.toString())

      return contract
    } catch (err) {
      console.error('initializeContract failed:', err.message)
      return null
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      const contract = await initializeContract()
      if (contract) {
        setReadContract(contract)
      }
    }
    run()
  }, [initializeContract])

  const getHashpackSigner = useCallback(async () => {
    if (!connector || !connector.signers?.length) {
      throw new Error('Wallet not connected')
    }
    const signer = connector.signers[0]
    setWriteContract(signer)
    return signer
  }, [connector])

  const fetchContractData = useCallback(async (fetcher, providerOverride) => {
    if (isFetching.current) return

    isFetching.current = true
    try {
      setLoading(true)
      setError(null)

      const activeContract = readContract || (await initializeContract(providerOverride))
      if (!activeContract) {
        console.error('Contract initialization failed')
        setError('Contract not available')
        return
      }

      if (!readContract) {
        setReadContract(activeContract)
      }

      return await fetcher(activeContract)
    } catch (err) {
      console.error('Contract data fetch error:', err)
      setError(err.message)
      throw err
    } finally {
      isFetching.current = false
      setLoading(false)
    }
  }, [initializeContract, readContract])

  const callFunction = useCallback(async (functionName, args = []) => {
    if (isCalling.current) return

    isCalling.current = true
    try {
      return await fetchContractData(async (activeContract) => {
        if (typeof activeContract?.[functionName] !== 'function') {
          throw new Error(`Function ${functionName} is not available on contract`)
        }
        return activeContract[functionName](...args)
      })
    } finally {
      isCalling.current = false
    }
  }, [fetchContractData])

  const executeFunction = useCallback(async (functionName, args = [], options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const signer = await getHashpackSigner()

      const params = new ContractFunctionParameters()
      if (functionName === 'joinChitGroup' || functionName === 'exitGroup' || functionName === 'contribute') {
        params.addUint256(String(args[0]))
      } else if (functionName === 'submitBid') {
        const bidHash = String(args[1] ?? '')
        const hashHex = bidHash.startsWith('0x') ? bidHash.slice(2) : bidHash
        if (hashHex.length !== 64) {
          throw new Error('submitBid bidHash must be a 32-byte hex string')
        }
        const hashBytes = new Uint8Array(
          (hashHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))
        )
        params.addUint256(String(args[0]))
        params.addBytes32(hashBytes)
      } else if (functionName === 'revealBid') {
        params.addUint256(String(args[0]))
        params.addUint256(String(args[1]))
        params.addBytes32(args[2])
      } else if (functionName === 'vote') {
        params.addUint256(String(args[0]))
        params.addBool(Boolean(args[1]))
      } else {
        throw new Error(`Unsupported write function: ${functionName}`)
      }

      let tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(await getHederaContractId()))
        .setGas(300000)
        .setFunction(functionName, params)

      if (options && Number.isInteger(options.tinybars) && options.tinybars > 0) {
        tx = tx.setPayableAmount(Hbar.fromTinybars(BigInt(options.tinybars)))
      }

      tx = await tx.freezeWithSigner(signer)
      const response = await tx.executeWithSigner(signer)
      return response
    } catch (err) {
      console.error(`Contract execution error (${functionName}):`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getHashpackSigner])

  const fetchGroupsData = useCallback(async () => {
    return fetchContractData(async (activeContract) => {
      const groupCount = await activeContract.groupCounter?.() || 0
      console.log('groupCounter value after fetch:', groupCount?.toString?.() ?? groupCount)

      const count = Number(groupCount)
      const groups = []

      if (count === 0) {
        const emptyData = { groups: [], totalPot: 0 }
        setContractData(emptyData)
        return emptyData
      }

      for (let i = 0; i < count; i += 1) {
        const group = await activeContract.chitGroups?.(i)
        console.log('group fetched in loop:', i, group)
        if (group) groups.push(group)
      }

      const totalPot = groups.reduce((sum, group) => {
        return sum + Number(group?.totalPot?.toString?.() ?? 0)
      }, 0)

      const payload = { groups, totalPot }
      setContractData(payload)
      return payload
    })
  }, [fetchContractData])

  const getReputationScore = useCallback(async (address) => {
    return callFunction('getReputationScore', [address])
  }, [callFunction])

  const getGroupCount = useCallback(async () => {
    return callFunction('groupCounter')
  }, [callFunction])

  const getGroupSummary = useCallback(async (groupId) => {
    return callFunction('chitGroups', [groupId])
  }, [callFunction])

  const getGroupMembers = useCallback(async (groupId) => {
    return callFunction('getMembers', [groupId])
  }, [callFunction])

  const getCurrentPot = useCallback(async (groupId) => {
    return callFunction('getCurrentPot', [groupId])
  }, [callFunction])

  const createChitGroup = useCallback(async (groupName, memberCount, monthlyContribution, duration) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Creating group with params:', {
        memberCount,
        monthlyContribution,
        duration,
      })

      const signer = await getHashpackSigner()

      let tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(await getHederaContractId()))
        .setGas(300000)
        .setFunction(
          'createChitGroup',
          new ContractFunctionParameters()
            .addString(groupName)
            .addUint256(parseInt(memberCount))
            .addUint256(Math.floor(parseFloat(monthlyContribution) * 100_000_000))
            .addUint256(parseInt(duration))
        )

      tx = await tx.freezeWithSigner(signer)
      const response = await tx.executeWithSigner(signer)
      return response
    } catch (err) {
      console.error('Contract execution error (createChitGroup):', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getHashpackSigner])

  const createGroup = useCallback(async (groupName, memberCount, monthlyContribution, duration) => {
    return createChitGroup(groupName, memberCount, monthlyContribution, duration)
  }, [createChitGroup])

  const joinGroup = useCallback(async (groupId) => {
    return executeFunction('joinChitGroup', [groupId])
  }, [executeFunction])

  const contribute = useCallback(async (groupId, amountHbar) => {
    const contributionAmount = Number.parseFloat(String(amountHbar))
    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      throw new Error('contributionAmount must be a valid positive number')
    }

    const tinybars = Math.floor(
      parseFloat(contributionAmount) * 100_000_000
    )

    if (!Number.isFinite(tinybars) || tinybars <= 0) {
      throw new Error('contributionAmount converts to invalid tinybar amount')
    }

    return executeFunction('contribute', [groupId], {
      tinybars,
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
    contract: readContract,
    readContract,
    writeContract,
    contractData,
    contractAddress: resolvedContractIds.evmAddress,
    hederaContractId: resolvedContractIds.hederaContractId,
    loading,
    error,
    resolveContractIds,
    initializeContract,
    getProvider,
    getReadProvider,
    fetchContractData,
    callFunction,
    executeFunction,
    fetchGroupsData,
    createChitGroup,
    createGroup,
    getReputationScore,
    getGroupCount,
    getGroupSummary,
    getGroupMembers,
    getCurrentPot,
    joinGroup,
    contribute,
    submitBid,
    revealBid,
    vote,
    exitGroup,
  }
}

export default useContract
