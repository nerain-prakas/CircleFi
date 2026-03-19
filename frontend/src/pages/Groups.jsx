import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletContext } from '../context/WalletContext'
import useContract from '../hooks/useContract'

function Groups() {
  const navigate = useNavigate()
  const { connected } = useWalletContext()
  const {
    getProvider,
    initializeContract,
    getGroupCount,
    getGroupSummary,
    getGroupMembers,
    joinGroup,
  } = useContract()
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!connected) return

    const loadGroups = async () => {
      setLoading(true)
      setError(null)
      try {
        const provider = getProvider()
        await initializeContract(provider)

        const total = Number(await getGroupCount())
        const allGroups = []

        for (let i = 0; i < total; i += 1) {
          const summary = await getGroupSummary(i)
          const members = await getGroupMembers(i)

          allGroups.push({
            id: Number(summary.groupId ?? i),
            memberCount: Number(summary.memberCount ?? 0),
            monthlyContribution: summary.monthlyContribution?.toString?.() ?? '0',
            isActive: Boolean(summary.isActive),
            admin: summary.admin,
            members,
          })
        }

        setGroups(allGroups)
      } catch (err) {
        setError(err.message || 'Failed to load groups')
      } finally {
        setLoading(false)
      }
    }

    loadGroups()
  }, [connected, getProvider, initializeContract, getGroupCount, getGroupSummary, getGroupMembers])

  const handleJoin = async (groupId) => {
    setError(null)
    try {
      const provider = getProvider()
      await initializeContract(provider)
      await joinGroup(groupId)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to join circle')
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Groups</h1>
            <p className="text-gray-400">Browse and join available circles</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all"
          >
            Create New Circle
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading circles...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No circles yet. Create the first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Circle #{group.id}</h3>
                    <p className="text-sm text-gray-400">Admin: {group.admin}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      group.isActive
                        ? 'bg-green-900 bg-opacity-40 text-green-300'
                        : 'bg-gray-700 bg-opacity-40 text-gray-300'
                    }`}
                  >
                    {group.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-gray-400">Members</p>
                    <p className="text-lg text-white font-semibold">{group.members.length}/{group.memberCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Monthly Contribution</p>
                    <p className="text-lg text-white font-semibold">{group.monthlyContribution} HBAR</p>
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(group.id)}
                  className="w-full px-4 py-2 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300 transition-colors"
                >
                  Join Circle
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Groups
