function ReputationRing({ score = 0, size = 'md' }) {
  const percentage = Math.min(Math.max(score, 0), 100)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  }

  // Color gradient based on score
  const getColor = () => {
    if (percentage >= 80) return '#00FFD1' // Cyan
    if (percentage >= 60) return '#8B5CF6' // Purple
    if (percentage >= 40) return '#FBBF24' // Amber
    return '#EF4444' // Red
  }

  const getGradient = () => {
    if (percentage >= 80) return 'from-cyan-400 to-green-400'
    if (percentage >= 60) return 'from-purple-400 to-blue-400'
    if (percentage >= 40) return 'from-yellow-400 to-orange-400'
    return 'from-red-400 to-pink-400'
  }

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center mx-auto`}>
      {/* Background circle */}
      <svg
        className="absolute w-full h-full -rotate-90"
        viewBox="0 0 120 120"
      >
        {/* Outer ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="6"
          opacity="0.3"
        />
        {/* Progress ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
          style={{
            filter: `drop-shadow(0 0 8px ${getColor()})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="text-center z-10">
        <div className={`${textSizes[size]} font-bold text-white`}>
          {Math.round(percentage)}
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap">Reputation</div>
      </div>
    </div>
  )
}

export default ReputationRing
