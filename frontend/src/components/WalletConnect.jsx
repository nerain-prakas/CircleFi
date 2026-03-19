import React from 'react'
import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'

class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Wallet UI error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 bg-red-900 bg-opacity-30 text-red-200 rounded-lg text-sm">
          Wallet connection UI failed to load. Please refresh the page.
        </div>
      )
    }

    return this.props.children
  }
}

function WalletConnect() {
  const { connect, isConnecting, isConnected, error } = useWallet()
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleConnect = async (walletType) => {
    try {
      await connect(walletType)
    } catch (err) {
      console.error('Connection failed:', err)
    }
  }

  return (
    <WalletErrorBoundary>
      <div className="relative">
        <button
          onClick={() => handleConnect('hashpack')}
          disabled={isConnecting || isConnected}
          className="px-6 py-2 bg-cyan-400 text-black font-semibold rounded-lg 
                     hover:bg-cyan-300 transition-all duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed inline-flex items-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Connecting...</span>
            </>
          ) : isConnected ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Connected</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path
                  fillRule="evenodd"
                  d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2V2a1 1 0 112 0v1a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2v1a1 1 0 11-2 0v-1h-2v1a1 1 0 11-2 0v-1a2 2 0 01-2-2v-2H3a1 1 0 110-2h1V9H3a1 1 0 110-2h1V5a2 2 0 012-2v-1a1 1 0 012 0v1h2V2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Connect Wallet</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {showError && error && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-red-900 bg-opacity-90 text-red-200 
                          rounded-lg text-sm max-w-xs border border-red-700 animate-pulse">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Info Text */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          HashPack wallet required
        </p>
      </div>
    </WalletErrorBoundary>
  )
}

export default WalletConnect
