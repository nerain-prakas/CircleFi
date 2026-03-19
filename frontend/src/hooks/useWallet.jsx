import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletContext } from '../context/WalletContext'

export function useWallet() {
  const {
    account,
    setAccount,
    connected,
    setConnected,
    connector,
    setConnector,
  } = useWalletContext()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [signer, setSigner] = useState(null)
  const navigate = useNavigate()

  const connect = useCallback(async (walletType = 'hashpack') => {
    setIsConnecting(true)
    setError(null)

    try {
      if (walletType === 'hashpack') {
        const { DAppConnector } = await import('@hashgraph/hedera-wallet-connect')
        const dAppConnector = new DAppConnector(
          {
            name: 'CircleFi',
            description: 'Decentralized Rotating Credit Protocol',
            url: window.location.origin,
            icons: [window.location.origin + '/favicon.ico'],
          },
          'testnet',
          import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
        )

        await new Promise((resolve) => setTimeout(resolve, 100))
        await dAppConnector.init({ logger: 'error' })

        dAppConnector.walletConnectClient?.on('session_event', (event) => {
          console.log('Session event:', event)
        })

        await dAppConnector.openModal()

        const signers = dAppConnector.signers
        if (signers && signers.length > 0) {
          const accountId = signers[0].getAccountId().toString()

          // Update state
          setAccount(accountId)
          setConnected(true)
          setConnector(dAppConnector)
          setIsConnecting(false)

          navigate('/dashboard')

          // Store in sessionStorage (not localStorage - security rule)
          sessionStorage.setItem('walletAddress', accountId)
          sessionStorage.setItem('walletConnected', 'true')

          console.log('✅ Wallet connected:', accountId)
        } else {
          throw new Error('Failed to retrieve account information')
        }
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err.message || 'Failed to connect wallet')
      setConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    setConnected(false)
    setConnector(null)
    setSigner(null)
    setError(null)

    if (connector?.walletConnect?.session) {
      connector.disconnect({
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
  }, [connector, setAccount, setConnected, setConnector])

  const executeContract = useCallback(async (contractAddress, abi, functionName, args = []) => {
    if (!connected || !connector) {
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
  }, [connected, connector])

  return {
    address: account,
    isConnected: connected,
    isConnecting,
    error,
    provider: connector,
    signer,
    connect,
    disconnect,
    executeContract,
  }
}
