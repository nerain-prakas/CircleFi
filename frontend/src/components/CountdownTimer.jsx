import { useState, useEffect } from 'react'

function CountdownTimer({ endDate, onComplete }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const target = new Date(endDate).getTime()
      const distance = target - now

      if (distance <= 0) {
        setIsComplete(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        onComplete?.()
        clearInterval(timer)
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24))
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate, onComplete])

  if (isComplete) {
    return (
      <div className="text-center py-6 bg-red-900 bg-opacity-20 rounded-lg border border-red-600 border-opacity-30">
        <p className="text-red-400 font-semibold">Auction phase ended</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <TimeUnit label="Days" value={timeLeft.days} />
        <TimeUnit label="Hours" value={timeLeft.hours} />
        <TimeUnit label="Minutes" value={timeLeft.minutes} />
        <TimeUnit label="Seconds" value={timeLeft.seconds} />
      </div>
      <div className="text-sm text-gray-400 text-center">
        Auction ends in {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </div>
    </div>
  )
}

function TimeUnit({ label, value }) {
  return (
    <div className="text-center">
      <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-3 mb-1">
        <div className="text-2xl font-bold text-white">
          {String(value).padStart(2, '0')}
        </div>
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

export default CountdownTimer
