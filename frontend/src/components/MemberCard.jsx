import ReputationRing from './ReputationRing'

function MemberCard({ member }) {
  return (
    <div className="bg-gradient-to-br from-gray-800 from-opacity-40 to-gray-900 to-opacity-20 rounded-lg p-4 border border-gray-700 border-opacity-30 hover:border-cyan-400 hover:border-opacity-50 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-semibold text-white text-lg">
            {member.address.substring(5, 7)}
          </div>

          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 font-mono truncate">
              {member.address.substring(0, 8)}...{member.address.substring(member.address.length - 6)}
            </p>
            <p className="text-xs text-gray-500">
              {member.joins} {member.joins === 1 ? 'join' : 'joins'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
            member.status === 'Active'
              ? 'bg-green-900 bg-opacity-40 text-green-300'
              : 'bg-yellow-900 bg-opacity-40 text-yellow-300'
          }`}
        >
          {member.status}
        </div>
      </div>

      {/* Reputation Ring */}
      <ReputationRing score={member.reputation} size="sm" />

      {/* Payment Status */}
      <div className="mt-4 pt-4 border-t border-gray-700 border-opacity-30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Payment Status</span>
          <span className={member.paidOnTime ? 'text-green-400' : 'text-red-400'}>
            {member.paidOnTime ? '✓ On Time' : '⚠ Late'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MemberCard
