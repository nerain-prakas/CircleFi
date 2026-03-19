import { createContext, useContext, useState } from 'react'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [connected, setConnected] = useState(false)
  const [connector, setConnector] = useState(null)

  return (
    <WalletContext.Provider
      value={{
        account,
        setAccount,
        connected,
        setConnected,
        connector,
        setConnector,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext() {
  return useContext(WalletContext)
}
