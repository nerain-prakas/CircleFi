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

const isValidEvmAddress = (address) => {
  return typeof address === 'string' && 
    address.startsWith('0x') && 
    address.length === 42
}

const contractInitialized = { current: false }

const HEDERA_NETWORK = ethers.Network.from({
  chainId: 296,
  name: 'hedera-testnet',
})

const HEDERA_PROVIDER = new ethers.JsonRpcProvider(
  'https://testnet.hashio.io/api',
  HEDERA_NETWORK,
  { staticNetwork: HEDERA_NETWORK }
)

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
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('VITE_CONTRACT_ADDRESS must be a full 0x-prefixed EVM address (not a Hedera 0.0.x ID).')
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
    return HEDERA_PROVIDER
  }, [])

  const getProvider = useCallback(() => {
    return HEDERA_PROVIDER
  }, [])

  const initializeContract = useCallback(async () => {
    try {
      const provider = HEDERA_PROVIDER

      console.log('Provider created, connecting to Hedera testnet...')

      const contractAddress = getContractAddress()
      console.log('Contract address:', contractAddress)

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
  }, [getContractAddress])

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
      if (functionName === 'getReputationScore' && !isValidEvmAddress(args?.[0])) {
        console.warn('Skipping getReputationScore for invalid EVM address:', args?.[0])
        return 0n
      }

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
      } else if (functionName === 'createProposal') {
        params.addUint256(String(args[0]))
        params.addUint8(Number(args[1]))
        params.addString(String(args[2] ?? ''))
        params.addUint256(String(args[3] ?? 0))
        params.addAddress(String(args[4] ?? '0x0000000000000000000000000000000000000000'))
        params.addUint256(String(args[5] ?? 7))
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
        params.addUint256(String(args[1]))
        params.addBool(Boolean(args[2]))
      } else {
        throw new Error(`Unsupported write function: ${functionName}`)
      }

      let tx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(await getHederaContractId()))
        .setGas(300000)
        .setFunction(functionName, params)

      if (options && options.tinybars !== undefined && options.tinybars !== null) {
        const tinybars = typeof options.tinybars === 'bigint'
          ? options.tinybars
          : BigInt(Math.floor(Number(options.tinybars)))

        if (tinybars <= 0n) {
          throw new Error('contributionAmount converts to invalid tinybar amount')
        }

        tx = tx.setPayableAmount(Hbar.fromTinybars(tinybars))
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
    const validAddresses = [address].filter((addr) => isValidEvmAddress(addr))
    if (validAddresses.length === 0) {
      console.warn('Waiting for valid EVM address before getReputationScore call')
      return 0n
    }

    try {
      const results = await Promise.all(
        validAddresses.map((addr) => {
          if (!isValidEvmAddress(addr)) return null
          return callFunction('getReputationScore', [addr])
        })
      )

      return results?.[0] ?? 0n
    } catch (err) {
      if (err?.code === 'UNSUPPORTED_OPERATION') {
        console.warn('ENS not supported on Hedera, skipping...')
        return 0n
      }
      throw err
    }
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

  const contribute = useCallback(async (groupId, contributionAmount) => {
    console.log('Contribution amount received:', contributionAmount)
    console.log('Type:', typeof contributionAmount)

    if (contributionAmount === undefined || contributionAmount === null) {
      throw new Error('contributionAmount must be a valid positive number')
    }

    let tinybars
    if (typeof contributionAmount === 'bigint') {
      tinybars = contributionAmount
    } else {
      const amountAsString = String(contributionAmount).trim()
      const isIntegerString = /^\d+$/.test(amountAsString)

      if (isIntegerString) {
        const integerAmount = BigInt(amountAsString)
        if (integerAmount >= 100_000_000n) {
          tinybars = integerAmount
        } else {
          tinybars = BigInt(Math.floor(Number(contributionAmount) * 100_000_000))
        }
      } else {
        const numericAmount = Number(contributionAmount)
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          throw new Error('contributionAmount must be a valid positive number')
        }
        tinybars = BigInt(Math.floor(numericAmount * 100_000_000))
      }
    }

    if (tinybars <= 0n) {
      throw new Error('contributionAmount converts to invalid tinybar amount')
    }

    return executeFunction('contribute', [groupId], {
      tinybars,
    })
  }, [executeFunction])

  const submitBid = useCallback(async (groupId, sealedBidHash) => {
    return executeFunction('submitBid', [groupId, sealedBidHash])
  }, [executeFunction])

  const createProposal = useCallback(async (groupId, description, options = {}) => {
    const proposalType = options.proposalType ?? 0
    const value = options.value ?? 0
    const targetMember = options.targetMember ?? '0x0000000000000000000000000000000000000000'
    const durationDays = options.durationDays ?? 7

    return executeFunction('createProposal', [
      groupId,
      proposalType,
      description,
      value,
      targetMember,
      durationDays,
    ])
  }, [executeFunction])

  const revealBid = useCallback(async (groupId, amount, salt) => {
    return executeFunction('revealBid', [groupId, amount, salt])
  }, [executeFunction])

  const vote = useCallback(async (groupId, proposalId, support) => {
    return executeFunction('vote', [groupId, proposalId, support])
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
    createProposal,
    submitBid,
    revealBid,
    vote,
    exitGroup,
  }
}

export default useContract
