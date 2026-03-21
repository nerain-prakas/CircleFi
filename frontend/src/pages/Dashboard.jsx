import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatEther } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import CountdownTimer from '../components/CountdownTimer'
import useContract from '../hooks/useContract'

const tinybarToHbar = (value) => Number(value || 0) / 100000000

const getEvmAddress = async (hederaAccountId) => {
  try {
    const id = hederaAccountId.toString().trim()
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${id}`
    )
    const data = await response.json()
    return data.evm_address?.toLowerCase() || ''
  } catch {
    return ''
  }
}

function Dashboard() {
  const { account, connected } = useWalletContext()
  const isConnected = connected
  const navigate = useNavigate()
  const {
    getProvider,
    initializeContract,
    fetchContractData,
    createGroup,
    contribute,
    exitGroup,
  } = useContract()
  const [refreshing, setRefreshing] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [formValues, setFormValues] = useState({
    name: '',
    members: '3',
    contribution: '',
    duration: '',
  })
  const contractData = groups

  const loadGroups = useCallback(async () => {
    if (!isConnected || !account) {
      setGroups([])
      setSelectedGroupId(null)
      return
    }

    setRefreshing(true)
    setError(null)
    try {
      const provider = getProvider()
      const myGroups = await fetchContractData(async (activeContract) => {
        const total = Number(await activeContract.groupCounter())
        const allGroups = []
        const userEvmAddress = await getEvmAddress(account)
        console.log('User EVM:', userEvmAddress)

        for (let i = 0; i < total; i += 1) {
          const [summary, members, pot] = await Promise.all([
            activeContract.chitGroups(i),
            activeContract.getMembers(i),
            activeContract.getCurrentPot(i),
          ])
          console.log('Members:', members)

          const isMember = (members || []).some((m) =>
            m.toLowerCase() === userEvmAddress.toLowerCase()
          )
          console.log('Is member:', isMember)

          allGroups.push({
            id: Number(summary.groupId ?? i),
            name: summary.groupName || `Circle #${i}`,
            memberCount: Number(summary.memberCount ?? 0),
            monthlyContribution: summary.monthlyContribution?.toString?.() ?? '0',
            duration: Number(summary.duration ?? 0),
            currentMonth: Number(summary.currentMonth ?? 0),
            totalPot: pot?.toString?.() ?? '0',
            members: members || [],
            isActive: Boolean(summary.isActive),
            isMember,
          })
        }

        const joinedGroups = allGroups.filter((g) => g.isMember)
        return joinedGroups
      }, provider)

      const safeGroups = myGroups || []
      setGroups(safeGroups)
      setSelectedGroupId((currentValue) => {
        if ((safeGroups || []).some((group) => group.id === currentValue)) {
          return currentValue
        }
        return safeGroups[0]?.id ?? null
      })
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load groups')
    } finally {
      setRefreshing(false)
    }
  }, [isConnected, account, getProvider, fetchContractData])

  useEffect(() => {
    if (!hasFetched && isConnected) {
      setHasFetched(true)
      loadGroups()
    }
  }, [hasFetched, isConnected, loadGroups])

  useEffect(() => {
    if (!isConnected) {
      setHasFetched(false)
    }
  }, [isConnected])

  const selectedGroup = (groups || []).find((group) => group.id === selectedGroupId)

  if (!contractData && refreshing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  const handleContribute = async () => {
    if (!selectedGroup) return
    setError(null)
    setActionMessage(null)
    try {
      const provider = getProvider()
      await initializeContract(provider)
      const amount = formatEther(selectedGroup.monthlyContribution || '0')
      await contribute(selectedGroup.id, amount)
      setActionMessage('Contribution submitted successfully.')
      await loadGroups()
    } catch (err) {
      setError(err.message || 'Failed to contribute')
    }
  }

  const handleContributeForGroup = async (group) => {
    if (!group) return
    setError(null)
    setActionMessage(null)
    try {
      const provider = getProvider()
      await initializeContract(provider)
      const amount = formatEther(group.monthlyContribution || '0')
      await contribute(group.id, amount)
      setSelectedGroupId(group.id)
      setActionMessage('Contribution submitted successfully.')
      await loadGroups()
    } catch (err) {
      setError(err.message || 'Failed to contribute')
    }
  }

  const handleExit = async () => {
    if (!selectedGroup) return
    setError(null)
    setActionMessage(null)
    try {
      await exitGroup(selectedGroup.id)
    } catch (err) {
      setError(err.message || 'Failed to exit circle')
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Please Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect a wallet to view your circles and participate.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Manage your rotating credit circles and bids</p>
          </div>
          <RefreshControl
            onRefresh={() => {
              setHasFetched(false)
            }}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="mb-6 p-4 bg-green-900 bg-opacity-20 border border-green-700 rounded-lg text-green-200">
            {actionMessage}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300 transition-colors"
            >
              Create New Circle
            </button>
            <button
              onClick={() => navigate('/groups')}
              className="px-4 py-2 border border-cyan-400 text-cyan-300 rounded-lg font-semibold hover:bg-cyan-900 hover:bg-opacity-30 transition-colors"
            >
              Browse Circles
            </button>
          </div>
          {(groups || []).length > 0 && (
            <select
              value={selectedGroupId ?? ''}
              onChange={(event) => setSelectedGroupId(Number(event.target.value))}
              className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg border border-gray-700"
            >
              {(groups || []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {(groups || []).length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>You haven't joined any circles yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {(groups || []).map((group) => (
                <div key={group.id} className="bg-gray-900 bg-opacity-60 border border-gray-700 rounded-lg p-4">
                  <p className="text-white font-semibold">{group.name}</p>
                  <p className="text-gray-400 text-sm mt-1">Contribution: {tinybarToHbar(group.monthlyContribution).toFixed(2)} HBAR</p>
                  <p className="text-gray-400 text-sm">Current Month: {group.currentMonth}</p>
                  <p className="text-gray-400 text-sm">Members: {(group.members || []).length}/{group.memberCount}</p>
                  <button
                    onClick={() => handleContributeForGroup(group)}
                    className="mt-3 w-full px-3 py-2 bg-cyan-500 text-black rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
                  >
                    Contribute
                  </button>
                </div>
              ))}
            </div>

            <GroupDetails
              group={selectedGroup}
              onContribute={handleContribute}
              onExit={handleExit}
              onBid={() => navigate('/auction')}
            />
          </>
        )}
      </div>

      {showCreate && (
        <CreateCircleModal
          formValues={formValues}
          setFormValues={setFormValues}
          onClose={() => setShowCreate(false)}
          onSubmit={async () => {
            setError(null)
            try {
              const provider = getProvider()
              await initializeContract(provider)

              const receipt = await createGroup(
                formValues.name.trim(),
                Number(formValues.members),
                formValues.contribution,
                Number(formValues.duration)
              )

              setShowCreate(false)
              setFormValues({ name: '', members: '3', contribution: '', duration: '' })
              if (receipt) {
                setActionMessage('Circle created successfully.')
              }
              setHasFetched(false)
            } catch (err) {
              setError(err.message || 'Failed to create circle')
            }
          }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, unit, icon, color }) {
  const colorClasses = {
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 from-opacity-60 to-black to-opacity-40 rounded-lg p-6 border border-gray-700 border-opacity-30 hover:border-opacity-60 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{unit}</div>
      </div>
    </div>
  )
}

function ActionButton({ icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-cyan-400 hover:border-opacity-50 transition-all text-left group"
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  )
}

function GroupDetails({ group, onContribute, onExit, onBid }) {
  if (!group) {
    return null
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pot Size"
          value={formatEther(group.totalPot || '0')}
          unit="HBAR"
          icon="💰"
          color="cyan"
        />
        <StatCard
          label="Monthly Contribution"
          value={formatEther(group.monthlyContribution || '0')}
          unit="HBAR"
          icon="💳"
          color="purple"
        />
        <StatCard
          label="Current Month"
          value={`${group.currentMonth}/${group.duration}`}
          unit=""
          icon="📅"
          color="green"
        />
        <StatCard
          label="Members"
          value={`${(group?.members || []).length}/${group.memberCount}`}
          unit=""
          icon="👥"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-purple-900 from-opacity-20 to-cyan-900 to-opacity-10 rounded-lg p-6 border border-purple-500 border-opacity-30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Auction Phase</h2>
              <p className="text-gray-400">Current Phase: <span className="text-cyan-400 font-semibold">SEALED</span></p>
            </div>
            <div className="text-4xl">🔐</div>
          </div>
          <CountdownTimer
            endDate={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
            onComplete={() => console.log('Auction phase complete')}
          />
          <div className="mt-6 flex gap-3">
            <button onClick={onBid} className="flex-1 btn-primary">Submit Bid</button>
            <button onClick={onBid} className="flex-1 btn-secondary">View Bids</button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900 from-opacity-20 to-purple-900 to-opacity-10 rounded-lg p-6 border border-cyan-500 border-opacity-30">
          <h3 className="text-lg font-bold text-white mb-4">Circle Members</h3>
          <div className="space-y-2">
            {(group?.members || []).length === 0 ? (
              <p className="text-gray-400">No members yet.</p>
            ) : (
              (group?.members || []).map((member) => (
                <div key={member} className="text-sm text-gray-300 font-mono">
                  {member}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ActionButton
          icon="➕"
          title="Contribute"
          description="Add funds to the pot"
          onClick={onContribute}
        />
        <ActionButton
          icon="🏆"
          title="Submit Bid"
          description="Bid for this month's pot"
          onClick={onBid}
        />
        <ActionButton
          icon="🚪"
          title="Exit Circle"
          description="Leave this circle"
          onClick={onExit}
        />
      </div>
    </>
  )
}

function CreateCircleModal({ formValues, setFormValues, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Create New Circle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Circle Name</label>
            <input
              type="text"
              value={formValues.name}
              onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
              placeholder="Circle name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Number of Members (3-20)</label>
            <input
              type="number"
              min="3"
              max="20"
              value={formValues.members}
              onChange={(event) => setFormValues({ ...formValues, members: event.target.value })}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Monthly Contribution (HBAR)</label>
            <input
              type="number"
              step="0.01"
              value={formValues.contribution}
              onChange={(event) => setFormValues({ ...formValues, contribution: event.target.value })}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Duration (months)</label>
            <input
              type="number"
              min="1"
              value={formValues.duration}
              onChange={(event) => setFormValues({ ...formValues, duration: event.target.value })}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-300">Cancel</button>
          <button
            onClick={onSubmit}
            className="px-6 py-2 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300"
          >
            Create
          </button>
        </div>
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

export default Dashboard
