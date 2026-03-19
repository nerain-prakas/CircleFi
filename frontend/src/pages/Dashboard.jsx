import { useState, useEffect } from 'react'
import { useWalletContext } from '../context/WalletContext'
import CountdownTimer from '../components/CountdownTimer'
import MemberCard from '../components/MemberCard'
import ReputationRing from '../components/ReputationRing'

function Dashboard() {
  const { account, connected } = useWalletContext()
  const [circleData, setCircleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [selectedCircle, setSelectedCircle] = useState(1)

  // Mock data - will be replaced with contract calls
  useEffect(() => {
    setLoading(true)
    // Simulate data fetch
    setTimeout(() => {
      setCircleData({
        id: 1,
        name: 'Tech Innovators Circle',
        potSize: 12.5,
        potCurrency: 'HBAR',
        monthlyContribution: 1.5,
        auctionPhase: 'SEALED', // SEALED or REVEALED
        auctionEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        currentMonth: 3,
        totalMonths: 12,
        reservePool: 2.3,
        totalDividends: 8.7,
        memberCount: 8,
      })

      setMembers([
        {
          id: 1,
          address: '0.0.123456',
          reputation: 92,
          status: 'Active',
          joins: 3,
          paidOnTime: true,
        },
        {
          id: 2,
          address: '0.0.234567',
          reputation: 78,
          status: 'Active',
          joins: 2,
          paidOnTime: true,
        },
        {
          id: 3,
          address: '0.0.345678',
          reputation: 65,
          status: 'Active',
          joins: 1,
          paidOnTime: false,
        },
        {
          id: 4,
          address: '0.0.456789',
          reputation: 88,
          status: 'Active',
          joins: 4,
          paidOnTime: true,
        },
        {
          id: 5,
          address: '0.0.567890',
          reputation: 71,
          status: 'Pending',
          joins: 1,
          paidOnTime: true,
        },
      ])

      setLoading(false)
    }, 800)
  }, [selectedCircle])

  if (!connected) {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Manage your rotating credit circles and bids</p>
        </div>

        {/* Circle Selector */}
        <CircleSelector selectedCircle={selectedCircle} onSelect={setSelectedCircle} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Pot Size"
                value={`${circleData.potSize}`}
                unit={circleData.potCurrency}
                icon="💰"
                color="cyan"
              />
              <StatCard
                label="Monthly Contribution"
                value={`${circleData.monthlyContribution}`}
                unit={circleData.potCurrency}
                icon="💳"
                color="purple"
              />
              <StatCard
                label="Reserve Pool"
                value={`${circleData.reservePool}`}
                unit={circleData.potCurrency}
                icon="🏦"
                color="green"
              />
              <StatCard
                label="Your Dividends"
                value={`${circleData.totalDividends}`}
                unit={circleData.potCurrency}
                icon="📈"
                color="yellow"
              />
            </div>

            {/* Auction & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Auction Countdown */}
              <div className="lg:col-span-2 bg-gradient-to-br from-purple-900 from-opacity-20 to-cyan-900 to-opacity-10 rounded-lg p-6 border border-purple-500 border-opacity-30">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Auction Phase</h2>
                    <p className="text-gray-400">
                      Current Phase: <span className="text-cyan-400 font-semibold">{circleData.auctionPhase}</span>
                    </p>
                  </div>
                  <div className="text-4xl">🔐</div>
                </div>

                <CountdownTimer
                  endDate={circleData.auctionEndsAt}
                  onComplete={() => console.log('Auction phase complete')}
                />

                <div className="mt-6 flex gap-3">
                  <button className="flex-1 btn-primary">Submit Bid</button>
                  <button className="flex-1 btn-secondary">View Bids</button>
                </div>
              </div>

              {/* Monthly Progress */}
              <div className="bg-gradient-to-br from-cyan-900 from-opacity-20 to-purple-900 to-opacity-10 rounded-lg p-6 border border-cyan-500 border-opacity-30">
                <h3 className="text-lg font-bold text-white mb-4">Circle Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">Month</span>
                      <span className="text-cyan-400 font-semibold">
                        {circleData.currentMonth}/{circleData.totalMonths}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-purple-500 h-3 rounded-full"
                        style={{ width: `${(circleData.currentMonth / circleData.totalMonths) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-sm text-gray-400 mb-2">Members</p>
                    <p className="text-2xl font-bold text-white">{circleData.memberCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30">
              <h2 className="text-2xl font-bold text-white mb-6">Circle Members</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ActionButton
                icon="➕"
                title="Contribute"
                description="Add funds to the pot"
              />
              <ActionButton
                icon="🏆"
                title="Submit Bid"
                description="Bid for this month's pot"
              />
              <ActionButton
                icon="🚪"
                title="Exit Circle"
                description="Leave this circle"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CircleSelector({ selectedCircle, onSelect }) {
  const circles = [
    { id: 1, name: 'Tech Innovators Circle', members: 8 },
    { id: 2, name: 'DeFi Enthusiasts Circle', members: 10 },
  ]

  return (
    <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
      {circles.map((circle) => (
        <button
          key={circle.id}
          onClick={() => onSelect(circle.id)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            selectedCircle === circle.id
              ? 'bg-cyan-400 text-black font-semibold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {circle.name}
          <span className="ml-2 text-xs opacity-75">({circle.members})</span>
        </button>
      ))}
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

function ActionButton({ icon, title, description }) {
  return (
    <button className="p-4 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-cyan-400 hover:border-opacity-50 transition-all text-left group">
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading circle data...</p>
      </div>
    </div>
  )
}

export default Dashboard
