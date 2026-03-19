import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useWalletContext } from '../context/WalletContext'
import WalletConnect from './WalletConnect'

function Navbar() {
  const navigate = useNavigate()
  const { disconnect } = useWallet()
  const { account, connected } = useWalletContext()

  return (
    <nav className="fixed top-0 left-0 right-0 bg-black bg-opacity-80 backdrop-blur-md border-b border-cyan-400 border-opacity-20 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 animate-spin-slow" />
            <span className="text-xl font-bold text-white">
              Circle<span className="text-cyan-400">Fi</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink label="Dashboard" onClick={() => navigate('/dashboard')} />
            <NavLink label="Auction" onClick={() => navigate('/auction')} />
            <NavLink label="Governance" onClick={() => navigate('/governance')} />
            <NavLink label="Profile" onClick={() => navigate('/profile')} />
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connected ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-gray-300 truncate max-w-xs">
                    {account?.substring(0, 10)}...{account?.substring(account.length - 8)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-900 bg-opacity-50 text-red-300 rounded-lg 
                             text-sm hover:bg-opacity-70 transition-all duration-200"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>

          {/* Mobile Menu Button */}
          <MobileMenuButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </nav>
  )
}

function NavLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-gray-300 hover:text-cyan-400 transition-colors font-medium text-sm"
    >
      {label}
    </button>
  )
}

function MobileMenuButton() {
  return (
    <button className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors">
      <svg
        className="w-6 h-6 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}

function MobileNavigation() {
  return (
    <div className="md:hidden border-t border-gray-700 bg-black bg-opacity-60">
      <div className="px-2 pt-2 pb-3 space-y-1">
        <MobileNavItem label="Dashboard" href="/dashboard" />
        <MobileNavItem label="Auction" href="/auction" />
        <MobileNavItem label="Governance" href="/governance" />
        <MobileNavItem label="Profile" href="/profile" />
      </div>
    </div>
  )
}

function MobileNavItem({ label, href }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(href)}
      className="block w-full text-left px-3 py-2 rounded-md text-gray-300 hover:text-cyan-400 
                 hover:bg-gray-800 transition-colors"
    >
      {label}
    </button>
  )
}

export default Navbar
