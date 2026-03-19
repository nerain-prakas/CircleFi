import { useState, useEffect, useCallback } from 'react'
import { useWalletContext } from '../context/WalletContext'
import ReputationRing from '../components/ReputationRing'
import useContract from '../hooks/useContract'

function Profile() {
  const { account, connected } = useWalletContext()
  const { getProvider, fetchContractData } = useContract()
  const [userProfile, setUserProfile] = useState({
    address: account,
    reputation: 82,
    totalCircles: 3,
    totalDividends: 24.5,
    nftBadges: [
      { id: 1, name: 'Founding Member', rarity: 'Legendary', icon: '👑' },
      { id: 2, name: 'Reputation Guardian', rarity: 'Epic', icon: '⭐' },
    ],
    paymentHistory: [
      { id: 1, date: '2025-03-15', amount: 1.5, circle: 'Tech Innovators', status: 'Completed' },
      { id: 2, date: '2025-02-15', amount: 1.5, circle: 'Tech Innovators', status: 'Completed' },
      { id: 3, date: '2025-01-15', amount: 1.5, circle: 'Tech Innovators', status: 'Completed' },
      { id: 4, date: '2025-03-10', amount: 2.0, circle: 'DeFi Enthusiasts', status: 'Completed' },
      { id: 5, date: '2025-02-20', amount: 2.0, circle: 'DeFi Enthusiasts', status: 'Completed' },
    ],
    circles: [
      {
        id: 1,
        name: 'Tech Innovators Circle',
        joined: '2024-11-15',
        status: 'Active',
        contribution: 1.5,
        cycle: '3/12',
      },
      {
        id: 2,
        name: 'DeFi Enthusiasts Circle',
        joined: '2025-01-10',
        status: 'Active',
        contribution: 2.0,
        cycle: '2/10',
      },
      {
        id: 3,
        name: 'Crypto Builders Collective',
        joined: '2024-09-01',
        status: 'Completed',
        contribution: 1.0,
        cycle: '12/12',
      },
    ],
  })
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const refreshProfileData = useCallback(async () => {
    if (!connected || !account) return

    setRefreshing(true)
    setErrorMessage(null)
    try {
      const provider = getProvider()
      const snapshot = await fetchContractData(async (activeContract) => {
        const [reputation, groupCount] = await Promise.all([
          activeContract.getReputationScore(account),
          activeContract.groupCounter(),
        ])

        return {
          reputation: Number(reputation ?? 0),
          totalCircles: Number(groupCount ?? 0),
        }
      }, provider)

      setUserProfile((currentProfile) => ({
        ...currentProfile,
        address: account,
        reputation: snapshot.reputation,
        totalCircles: snapshot.totalCircles,
      }))
      setLastUpdated(new Date())
    } catch (err) {
      setErrorMessage(err.message || 'Failed to refresh profile data')
    } finally {
      setRefreshing(false)
    }
  }, [connected, account, getProvider, fetchContractData])

  useEffect(() => {
    refreshProfileData()
  }, [refreshProfileData])

  if (!connected) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Please Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect a wallet to view your profile.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400">Manage your CircleFi account and memberships</p>
          </div>
          <RefreshControl
            onRefresh={refreshProfileData}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
          />
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Wallet Address" value={`${account?.substring(0, 10)}...${account?.substring(account.length - 8)}`} icon="👛" />
          <StatCard label="Total Dividends" value={`${userProfile.totalDividends}`} unit="HBAR" icon="💰" />
          <StatCard label="Active Circles" value={userProfile.totalCircles} icon="⭕" />
          <StatCard label="NFT Badges" value={userProfile.nftBadges.length} icon="🏆" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reputation & Badges */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-900 from-opacity-60 to-black to-opacity-40 rounded-lg p-6 border border-gray-700 border-opacity-30 sticky top-24">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Reputation</h2>

              {/* Reputation Ring */}
              <ReputationRing score={userProfile.reputation} size="md" />

              <div className="mt-8 space-y-2">
                <p className="text-center text-gray-400 text-sm">Score</p>
                <p className="text-center text-3xl font-bold text-cyan-400">{userProfile.reputation}</p>
              </div>

              {/* Reputation Info */}
              <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
                <ReputationBadge label="Payment History" status="Perfect" color="green" />
                <ReputationBadge label="Circle Participation" status="Active" color="cyan" />
                <ReputationBadge label="Governance Votes" status="Regular" color="purple" />
              </div>
            </div>
          </div>

          {/* NFT Badges */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30">
              <h3 className="text-2xl font-bold text-white mb-6">NFT Membership Badges</h3>

              {userProfile.nftBadges.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Start earning badges by participating in circles</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userProfile.nftBadges.map((badge) => (
                    <NFTBadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Circles Joined */}
        <div className="mb-8 bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30">
          <h3 className="text-2xl font-bold text-white mb-6">Circles Joined</h3>

          {userProfile.circles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>You haven't joined any circles yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userProfile.circles.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30">
            <h3 className="text-2xl font-bold text-white mb-6">Payment History Timeline</h3>

            {userProfile.paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No payment history</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {userProfile.paymentHistory.map((payment, index) => (
                  <PaymentItem
                    key={payment.id}
                    payment={payment}
                    isLast={index === userProfile.paymentHistory.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-900 from-opacity-30 to-blue-900 to-opacity-20 rounded-lg p-6 border border-cyan-600 border-opacity-30">
              <h4 className="text-lg font-bold text-white mb-4">Performance Stats</h4>
              <div className="space-y-3 text-sm">
                <StatRow label="Total Paid" value={`${userProfile.paymentHistory.reduce((sum, p) => sum + p.amount, 0)} HBAR`} />
                <StatRow label="On-Time Payments" value="5/5 (100%)" />
                <StatRow label="Average Payment" value={`${(userProfile.paymentHistory.reduce((sum, p) => sum + p.amount, 0) / userProfile.paymentHistory.length).toFixed(2)} HBAR`} />
                <StatRow label="Member Since" value="Sep 2024" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900 from-opacity-30 to-pink-900 to-opacity-20 rounded-lg p-6 border border-purple-600 border-opacity-30">
              <h4 className="text-lg font-bold text-white mb-4">Earning Summary</h4>
              <div className="space-y-3 text-sm">
                <StatRow label="Total Dividends Received" value={`${userProfile.totalDividends} HBAR`} highlight />
                <StatRow label="Pending Dividends" value="0.5 HBAR" />
                <StatRow label="Highest Bid Won" value="0.8 HBAR" />
                <StatRow label="Average Bid Spread" value="0.3 HBAR" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit = '', icon }) {
  return (
    <div className="bg-gradient-to-br from-gray-900 from-opacity-60 to-black to-opacity-40 rounded-lg p-6 border border-gray-700 border-opacity-30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">{value}</div>
        {unit && <div className="text-xs text-gray-400">{unit}</div>}
      </div>
    </div>
  )
}

function ReputationBadge({ label, status, color }) {
  const colorClasses = {
    green: 'bg-green-900 bg-opacity-30 text-green-300 border-green-600',
    cyan: 'bg-cyan-900 bg-opacity-30 text-cyan-300 border-cyan-600',
    purple: 'bg-purple-900 bg-opacity-30 text-purple-300 border-purple-600',
  }

  return (
    <div className={`p-3 rounded-lg border border-opacity-30 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs font-semibold">✓ {status}</span>
      </div>
    </div>
  )
}

function NFTBadgeCard({ badge }) {
  const rarityColors = {
    Legendary: 'from-yellow-500 to-orange-500',
    Epic: 'from-purple-500 to-pink-500',
    Rare: 'from-blue-500 to-cyan-500',
    Common: 'from-gray-500 to-slate-500',
  }

  return (
    <div className={`bg-gradient-to-br ${rarityColors[badge.rarity]} p-[1px] rounded-lg`}>
      <div className="bg-black rounded-lg p-4 h-full">
        <div className="text-center">
          <div className="text-5xl mb-3">{badge.icon}</div>
          <h4 className="text-white font-bold text-sm mb-1">{badge.name}</h4>
          <p className={`text-xs font-semibold ${rarityColors[badge.rarity].split(' ')[0]}`}>
            {badge.rarity}
          </p>
        </div>
      </div>
    </div>
  )
}

function CircleCard({ circle }) {
  return (
    <div className="bg-gray-800 bg-opacity-40 rounded-lg p-4 border border-gray-700 hover:border-cyan-400 hover:border-opacity-50 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-white font-semibold">{circle.name}</h4>
          <p className="text-xs text-gray-400 mt-1">Joined {new Date(circle.joined).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            circle.status === 'Active'
              ? 'bg-green-900 bg-opacity-40 text-green-300'
              : 'bg-gray-700 bg-opacity-40 text-gray-300'
          }`}>
            {circle.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Contribution</p>
          <p className="text-white font-semibold">{circle.contribution} HBAR</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Cycle</p>
          <p className="text-white font-semibold">{circle.cycle}</p>
        </div>
        <div>
          <button className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold">
            View →
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentItem({ payment, isLast }) {
  return (
    <div className="relative pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-transparent" />
      )}

      {/* Timeline dot */}
      <div className="flex items-start space-x-4">
        <div className="relative z-10 w-5 h-5 rounded-full border-2 border-cyan-400 flex items-center justify-center mt-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
        </div>

        {/* Payment info */}
        <div className="flex-1 pb-2">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold">{payment.circle}</h4>
            <span className="text-white font-bold">{payment.amount} HBAR</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{new Date(payment.date).toLocaleDateString()}</p>
          <div className="flex items-center mt-2">
            <span className="text-xs bg-green-900 bg-opacity-40 text-green-300 px-2 py-1 rounded">
              ✓ {payment.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 border-opacity-30 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-cyan-400' : 'text-white'}`}>
        {value}
      </span>
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

export default Profile
