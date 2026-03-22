import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ThreeBackground from '../components/ThreeBackground'
import WalletConnect from '../components/WalletConnect'
import { useWallet } from '../hooks/useWallet'

function Landing() {
  const navigate = useNavigate()
  const { isConnected } = useWallet()

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard')
    }
  }, [isConnected, navigate])

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* 3D Background */}
      <ThreeBackground interactive={true} parallaxIntensity={0.5} />

      {/* Content Overlay */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4">
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-2xl mx-auto">
          {/* Animated Circle Icon */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              <div className="absolute inset-8 rounded-full border-2 border-cyan-400 opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-cyan-400">₸</span>
              </div>
            </div>
          </div>

          {/* Hero Title */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
              Sangam<span className="text-cyan-400">Fi</span>
            </h1>
            <p className="text-2xl sm:text-3xl text-gray-300 font-light">
              Rotating Credit, Reimagined
            </p>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
            A decentralized rotating credit association on Hedera Hashgraph. 
            Join circles, bid for monthly payouts, and earn reputation in 
            a trustless community.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 text-left">
            <FeatureCard
              icon="🔐"
              title="Secure"
              description="Smart contracts on Hedera ensure transparency"
            />
            <FeatureCard
              icon="⚡"
              title="Fast"
              description="Instant settlements powered by Hedera"
            />
            <FeatureCard
              icon="🌍"
              title="Decentralized"
              description="No intermediaries, fully peer-to-peer"
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <WalletConnect />
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="px-8 py-3 border-2 border-cyan-400 text-cyan-400 font-semibold rounded-lg 
                         hover:bg-cyan-400 hover:text-black transition-all duration-200"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <svg
          className="w-6 h-6 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      {/* Info Section */}
      <div className="relative z-10 min-h-screen bg-gradient-to-b from-transparent to-black pt-20">
        <div className="max-w-4xl mx-auto px-4 py-20 space-y-12">
          <InfoSection
            title="How SangamFi Works"
            items={[
              {
                num: '01',
                title: 'Form a Circle',
                description: 'Create or join a rotating credit circle with trusted members.',
              },
              {
                num: '02',
                title: 'Monthly Contributions',
                description: 'Each member contributes a fixed amount every month.',
              },
              {
                num: '03',
                title: 'Sealed Bid Auction',
                description: 'Place encrypted bids for the monthly pot. Lowest bid wins.',
              },
              {
                num: '04',
                title: 'Build Reputation',
                description: 'Earn reputation points for reliability and grow your credibility.',
              },
            ]}
          />

          <div className="border-t border-purple-500 border-opacity-30 pt-12">
            <h2 className="text-3xl font-bold text-white mb-8">Key Features</h2>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start space-x-4">
                <span className="text-cyan-400 font-bold text-lg">✓</span>
                <span>Transparent smart contracts on Hedera testnet</span>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-cyan-400 font-bold text-lg">✓</span>
                <span>HCS (Hedera Consensus Service) for sealed bid submissions</span>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-cyan-400 font-bold text-lg">✓</span>
                <span>Encrypted bids before reveal phase</span>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-cyan-400 font-bold text-lg">✓</span>
                <span>Reputation system for trustless cooperation</span>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-cyan-400 font-bold text-lg">✓</span>
                <span>Cross-group composability for advanced strategies</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-4 rounded-lg bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 hover:border-cyan-400 hover:border-opacity-50 transition-all">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

function InfoSection({ title, items }) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-12">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-3">
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                {item.num}
              </div>
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
            </div>
            <p className="text-gray-400 ml-16">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Landing
