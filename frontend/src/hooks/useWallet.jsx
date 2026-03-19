import { useState, useCallback, useContext, createContext } from 'react'
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
} from '@hashgraph/hedera-wallet-connect'
import { LedgerId } from '@hashgraph/sdk'

const dAppConnector = new DAppConnector(
  {
    name: 'CircleFi',
    description: 'Decentralized Rotating Credit Protocol',
    url: window.location.origin,
    icons: [window.location.origin + '/favicon.ico'],
  },
  LedgerId.TESTNET,
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
)

// Create context for wallet
const WalletContext = createContext()

export function useWallet() {
  const [address, setAddress] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)

  const connect = useCallback(async (walletType = 'hashpack') => {
    setIsConnecting(true)
    setError(null)

    try {
      if (walletType === 'hashpack') {
        await dAppConnector.init({ logger: 'error' })
        const session = await dAppConnector.openModal()

        const accountsFromSession =
          session?.namespaces?.hedera?.accounts ||
          dAppConnector.walletConnect?.session?.namespaces?.hedera?.accounts ||
          []

        const firstAccount = accountsFromSession[0]
        const accountId = firstAccount ? firstAccount.split(':').pop() : null

        if (!accountId) {
          throw new Error('Failed to retrieve account information')
        }

        // Request accounts via JSON-RPC method for session refresh
        await dAppConnector.request({
          method: HederaJsonRpcMethod.GetAccounts,
        })

        // Update state
        setAddress(accountId)
        setIsConnected(true)
        setProvider(dAppConnector)

        // Store in sessionStorage (not localStorage - security rule)
        sessionStorage.setItem('walletAddress', accountId)
        sessionStorage.setItem('walletConnected', 'true')

        console.log('✅ Wallet connected:', accountId)
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err.message || 'Failed to connect wallet')
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setIsConnected(false)
    setProvider(null)
    setSigner(null)
    setError(null)

    if (dAppConnector?.walletConnect?.session) {
      dAppConnector.disconnect({
        reason: {
          code: 6000,
          message: 'User disconnected',
        },
      })
    }

    // Clear session storage
    sessionStorage.removeItem('walletAddress')
    sessionStorage.removeItem('walletConnected')

    console.log('👋 Wallet disconnected')
  }, [])

  const executeContract = useCallback(async (contractAddress, abi, functionName, args = []) => {
    if (!isConnected || !provider) {
      throw new Error('Wallet not connected')
    }

    try {
      // This will be implemented using ethers.js
      // For now, returning a stub
      console.log(`Calling ${functionName} on ${contractAddress}`)
      return null
    } catch (err) {
      console.error('Contract execution error:', err)
      throw err
    }
  }, [isConnected, provider])

  return {
    address,
    isConnected,
    isConnecting,
    error,
    provider,
    signer,
    connect,
    disconnect,
    executeContract,
  }
}

// Provider component for global wallet state
export function WalletProvider({ children }) {
  const walletState = useWallet()

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  )
}
