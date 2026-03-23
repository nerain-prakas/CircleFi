import { useState, useEffect, useCallback } from 'react'
import { useWalletContext } from '../context/WalletContext'
import CountdownTimer from '../components/CountdownTimer'
import useContract from '../hooks/useContract'

function Governance() {
  const { account, connected } = useWalletContext()
  const accountId = account
  const isConnected = connected
  const { getProvider, fetchContractData, createProposal, executeFunction, readContract } = useContract()
  const [evmAddress, setEvmAddress] = useState(null)
  const [joinedGroups, setJoinedGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [proposals, setProposals] = useState([])
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [newProposal, setNewProposal] = useState({ title: '', description: '' })
  const [refreshing, setRefreshing] = useState(false)
  const [loadingProposals, setLoadingProposals] = useState(false)
  const [submittingProposal, setSubmittingProposal] = useState(false)
  const [submittingVoteId, setSubmittingVoteId] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [chainSnapshot, setChainSnapshot] = useState({ groupCount: 0, reputation: '0' })
  const [hasFetched, setHasFetched] = useState(false)
  const loading = refreshing
  const contractData = proposals

  const normalizeProposalStatus = useCallback((rawStatus, deadlineDate) => {
    const numericStatus = Number(rawStatus)
    if (numericStatus === 0) {
      return deadlineDate > new Date() ? 'ACTIVE' : 'ENDED'
    }
    if (numericStatus === 1) {
      return 'EXECUTED'
    }
    return 'ENDED'
  }, [])

  const getProposalTypeLabel = useCallback((proposalType) => {
    const numericType = Number(proposalType)
    const labels = {
      0: 'General',
      1: 'Membership',
      2: 'Contribution',
      3: 'Payout',
      4: 'Auction',
    }
    return labels[numericType] || `Type ${numericType}`
  }, [])

  useEffect(() => {
    if (!accountId) {
      setEvmAddress(null)
      return
    }

    if (accountId.startsWith('0x')) {
      setEvmAddress(accountId)
      return
    }

    setEvmAddress(null)

    let isMounted = true

    const fetchEvmAddress = async () => {
      try {
        const response = await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
        )
        const data = await response.json()
        if (isMounted) {
          setEvmAddress(data.evm_address || null)
        }
        console.log('EVM address:', data.evm_address)
      } catch (err) {
        console.error('Failed to fetch EVM address:', err)
        if (isMounted) {
          setEvmAddress(null)
        }
      }
    }

    fetchEvmAddress()

    return () => {
      isMounted = false
    }
  }, [accountId])

  const loadJoinedGroups = useCallback(async () => {
    if (!isConnected || !evmAddress) {
      setJoinedGroups([])
      return
    }

    try {
      const provider = getProvider()
      const groups = await fetchContractData(async (activeContract) => {
        const totalGroups = Number(await activeContract.groupCounter())
        const myGroups = []

        for (let i = 0; i < totalGroups; i += 1) {
          const [group, members] = await Promise.all([
            activeContract.chitGroups(i),
            activeContract.getMembers(i),
          ])

          const isMember = (members || []).some(
            (member) => member?.toLowerCase?.() === evmAddress.toLowerCase()
          )

          if (isMember) {
            myGroups.push({
              groupId: Number(group?.groupId ?? i),
              groupName: group?.groupName || `Circle #${i}`,
            })
          }
        }

        return myGroups
      }, provider)

      const safeGroups = groups || []
      setJoinedGroups(safeGroups)
      setSelectedGroupId((current) => {
        if (safeGroups.some((g) => String(g.groupId) === String(current))) {
          return current
        }
        return safeGroups[0] ? String(safeGroups[0].groupId) : ''
      })
    } catch (err) {
      console.error('Failed to load joined groups:', err)
      setJoinedGroups([])
    }
  }, [isConnected, evmAddress, getProvider, fetchContractData])

  useEffect(() => {
    loadJoinedGroups()
  }, [loadJoinedGroups])

  const fetchProposals = useCallback(async () => {
    if (!readContract || !isConnected || !evmAddress || (joinedGroups || []).length === 0) {
      setProposals([])
      setLoadingProposals(false)
      return
    }

    setLoadingProposals(true)
    try {
      const allProposals = []

      for (const group of joinedGroups) {
        try {
          const count = await readContract.getProposalCount(group.groupId)
          for (let i = 0; i < Number(count); i += 1) {
            const p = await readContract.getProposal(group.groupId, i)
            const deadlineSeconds = Number(p?.[8] ?? 0)
            const deadlineDate = Number.isFinite(deadlineSeconds)
              ? new Date(deadlineSeconds * 1000)
              : new Date(Date.now())

            allProposals.push({
              id: p?.[0]?.toString?.() ?? `${group.groupId}-${i}`,
              proposalId: p?.[0]?.toString?.() ?? `${i}`,
              groupId: group.groupId,
              groupName: group.groupName,
              proposer: p?.[1] ?? '',
              proposalType: Number(p?.[2] ?? 0),
              title: p?.[3] || `${getProposalTypeLabel(p?.[2] ?? 0)} Proposal`,
              description: p?.[3] ?? '',
              value: p?.[4]?.toString?.() ?? '0',
              yesVotes: Number(p?.[6] ?? 0),
              noVotes: Number(p?.[7] ?? 0),
              deadline: Number(p?.[8] ?? 0),
              ends: deadlineDate,
              status: normalizeProposalStatus(p?.[9] ?? 0, deadlineDate),
              userVoted: false,
              userVote: null,
            })
          }
        } catch (err) {
          console.error('Error fetching proposals for group', group.groupId, err)
        }
      }

      setProposals(allProposals.sort((a, b) => b.ends - a.ends))
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
      setErrorMessage(err?.message || 'Failed to fetch proposals')
      setProposals([])
    } finally {
      setLoadingProposals(false)
    }
  }, [
    readContract,
    isConnected,
    evmAddress,
    joinedGroups,
    normalizeProposalStatus,
    getProposalTypeLabel,
  ])

  const refreshGovernanceData = useCallback(async () => {
    if (!isConnected || !evmAddress) {
      console.log('Waiting for valid EVM address...')
      return
    }

    setRefreshing(true)
    setErrorMessage(null)
    try {
      const provider = getProvider()
      const snapshot = await fetchContractData(async (activeContract) => {
        const [groupCount, reputation] = await Promise.all([
          activeContract.groupCounter(),
          activeContract.getReputationScore(evmAddress),
        ])

        return {
          groupCount: Number(groupCount ?? 0),
          reputation: reputation?.toString?.() ?? '0',
        }
      }, provider)

      setChainSnapshot(snapshot || { groupCount: 0, reputation: '0' })
      await fetchProposals()
      setLastUpdated(new Date())
    } catch (err) {
      setErrorMessage(err.message || 'Failed to refresh governance data')
    } finally {
      setRefreshing(false)
    }
  }, [isConnected, evmAddress, getProvider, fetchContractData, fetchProposals])

  useEffect(() => {
    if (!hasFetched && isConnected) {
      setHasFetched(true)
      refreshGovernanceData()
    }
  }, [hasFetched, isConnected, refreshGovernanceData])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    fetchProposals()
  }, [isConnected, joinedGroups, fetchProposals])

  useEffect(() => {
    if (!isConnected) {
      setHasFetched(false)
    }
  }, [isConnected])

  if (!contractData && loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  if (!evmAddress && !accountId) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Please Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect a wallet to participate in governance.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!evmAddress && accountId) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Loading</h2>
            <p className="text-gray-400">Resolving EVM address from Hedera account...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleVote = async (groupId, proposalId, support) => {
    if (!isConnected || !accountId || !evmAddress) {
      return
    }

    const voteId = `${groupId}-${proposalId}`
    try {
      setSubmittingVoteId(voteId)
      await executeFunction('vote', [groupId, proposalId, support])
      await fetchProposals()
    } catch (err) {
      alert(err?.message || 'Vote failed')
    } finally {
      setSubmittingVoteId(null)
    }
  }

  const submitProposal = () => {
    if (!newProposal.title.trim() || !newProposal.description.trim() || !selectedGroupId) {
      alert('Please fill in all fields')
      return
    }

    const submit = async () => {
      setSubmittingProposal(true)
      try {
        await createProposal(Number(selectedGroupId), newProposal.description, {
          proposalType: 0,
          value: 0,
          targetMember: '0x0000000000000000000000000000000000000000',
          durationDays: 7,
        })

        await fetchProposals()
        setNewProposal({ title: '', description: '' })
        setShowProposalForm(false)
      } catch (err) {
        alert(err?.message || 'Failed to create proposal')
      } finally {
        setSubmittingProposal(false)
      }
    }

    submit()
  }

  const totalYesVotes = (proposals || []).reduce((sum, p) => sum + p.yesVotes, 0)
  const totalNoVotes = (proposals || []).reduce((sum, p) => sum + p.noVotes, 0)

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Governance</h1>
            <p className="text-gray-400">Vote on proposals and shape the future of SangamFi</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RefreshControl
              onRefresh={refreshGovernanceData}
              refreshing={refreshing}
              lastUpdated={lastUpdated}
            />
            <button
              onClick={() => setShowProposalForm(!showProposalForm)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all"
            >
              + New Proposal
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <VoteStatCard label="Total Yes Votes" value={totalYesVotes} color="green" icon="👍" />
          <VoteStatCard label="Total No Votes" value={totalNoVotes} color="red" icon="👎" />
          <VoteStatCard
            label="Active Proposals"
            value={(proposals || []).filter((p) => p.status === 'ACTIVE').length}
            color="blue"
            icon="⚡"
          />
          <VoteStatCard
            label="On-chain Groups"
            value={chainSnapshot.groupCount}
            color="blue"
            icon="⛓"
          />
          <VoteStatCard
            label="My Reputation"
            value={chainSnapshot.reputation}
            color="green"
            icon="🛡"
          />
        </div>

        {/* New Proposal Form */}
        {showProposalForm && (
          <div className="mb-8 bg-gradient-to-br from-purple-900 from-opacity-20 to-cyan-900 to-opacity-10 rounded-lg p-6 border border-purple-500 border-opacity-30">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Proposal</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Circle
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Select a circle...</option>
                  {joinedGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.groupName || `Circle #${g.groupId}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proposal Title
                </label>
                <input
                  type="text"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                  placeholder="e.g., Increase minimum reputation to 70"
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                  placeholder="Explain your proposal in detail..."
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={submitProposal}
                  disabled={submittingProposal || !selectedGroupId}
                  className="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingProposal ? 'Submitting...' : 'Submit Proposal'}
                </button>
                <button
                  onClick={() => setShowProposalForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proposals */}
        <div className="space-y-6">
          {loadingProposals && (
            <div className="inline-flex items-center gap-2 text-xs text-cyan-300">
              <div className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
              <span>Loading proposals from contract...</span>
            </div>
          )}

          {(proposals || []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{loadingProposals ? 'Loading proposals...' : 'No proposals yet. Be the first to create one!'}</p>
            </div>
          ) : (
            (proposals || []).map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onVote={handleVote}
                voteLocked={!isConnected || !evmAddress || loadingProposals || refreshing}
                submittingVoteId={submittingVoteId}
                userAddress={evmAddress}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ProposalCard({ proposal, onVote, userAddress, voteLocked, submittingVoteId }) {
  const totalVotes = proposal.yesVotes + proposal.noVotes
  const yesPercentage = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0
  const isEnded = proposal.status !== 'ACTIVE'
  const voteId = `${proposal.groupId}-${proposal.proposalId}`
  const voteSubmitting = submittingVoteId === voteId

  return (
    <div className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30 hover:border-cyan-400 hover:border-opacity-50 transition-all">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">{proposal.description || proposal.title}</h3>
          <p className="text-gray-400 text-sm">{proposal.title}</p>
        </div>
        <div className="ml-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
              proposal.status === 'ACTIVE'
                ? 'bg-green-900 bg-opacity-40 text-green-300'
                : 'bg-gray-700 bg-opacity-40 text-gray-300'
            }`}
          >
            {proposal.status === 'ACTIVE' ? '⚡ ACTIVE' : '✓ EXECUTED'}
          </span>
        </div>
      </div>

      {/* Voting Info */}
      <div className="mb-6 pb-6 border-b border-gray-700 border-opacity-30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Votes</p>
            <p className="text-2xl font-bold text-white">{totalVotes}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Your Vote</p>
            <p className="text-lg font-semibold">
              {proposal.userVoted ? (
                <span className={proposal.userVote === 'yes' ? 'text-green-400' : 'text-red-400'}>
                  {proposal.userVote === 'yes' ? '👍 Yes' : '👎 No'}
                </span>
              ) : (
                <span className="text-gray-400">Not voted</span>
              )}
            </p>
          </div>
          {proposal.status === 'ACTIVE' && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Voting Ends</p>
              <CountdownTimer endDate={proposal.ends} />
            </div>
          )}
        </div>

        {/* Vote Breakdown */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Yes: {proposal.yesVotes}</span>
              <span className="text-sm text-gray-400">{yesPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${yesPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">No: {proposal.noVotes}</span>
              <span className="text-sm text-gray-400">{100 - yesPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-red-400 to-pink-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${100 - yesPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voting Buttons */}
      {!isEnded && !proposal.userVoted && (
        <div className="flex gap-3">
          <button
            onClick={() => onVote(proposal.groupId, proposal.proposalId, true)}
            disabled={voteLocked || voteSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {voteSubmitting ? 'Submitting...' : '👍 Vote Yes'}
          </button>
          <button
            onClick={() => onVote(proposal.groupId, proposal.proposalId, false)}
            disabled={voteLocked || voteSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {voteSubmitting ? 'Submitting...' : '👎 Vote No'}
          </button>
        </div>
      )}

      {proposal.userVoted && (
        <div className="p-3 bg-cyan-900 bg-opacity-20 border border-cyan-600 border-opacity-30 rounded-lg text-center">
          <p className="text-sm text-cyan-300">✓ You voted {proposal.userVote === 'yes' ? 'YES' : 'NO'}</p>
        </div>
      )}
    </div>
  )
}

function VoteStatCard({ label, value, color, icon }) {
  const colorClasses = {
    green: 'from-green-600 to-emerald-700',
    red: 'from-red-600 to-pink-700',
    blue: 'from-blue-600 to-cyan-700',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 border border-opacity-30`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-200 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}

function RefreshControl({ onRefresh, refreshing, lastUpdated }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-400 text-cyan-300 rounded-lg font-semibold hover:bg-cyan-900 hover:bg-opacity-30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {refreshing ? (
          <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4v5h.582A6.5 6.5 0 1110.5 16a6.47 6.47 0 01-4.594-1.905l-1.06 1.06A8 8 0 1010.5 2c-2.206 0-4.204.893-5.651 2.336V4H4z" />
          </svg>
        )}
        <span>Refresh</span>
      </button>
      <span className="text-xs text-gray-400">
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
      </span>
    </div>
  )
}

export default Governance
