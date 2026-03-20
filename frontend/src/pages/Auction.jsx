import { useState, useEffect, useCallback } from 'react'
import { keccak256, solidityPacked, formatEther, parseEther } from 'ethers'
import { useWalletContext } from '../context/WalletContext'
import CountdownTimer from '../components/CountdownTimer'
import { encryptBid, decryptBid } from '../utils/encryption'
import useContract from '../hooks/useContract'
import { HCS_TOPIC_ID } from '../utils/constants'

function Auction() {
  const { account, connected } = useWalletContext()
  const isConnected = connected
  const {
    getProvider,
    initializeContract,
    fetchContractData,
    submitBid,
  } = useContract()
  const [bidAmount, setBidAmount] = useState('')
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [encryptedBid, setEncryptedBid] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bidHistory, setBidHistory] = useState([])
  const [auctionPhase, setAuctionPhase] = useState('SEALED')
  const [refreshing, setRefreshing] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [potSize, setPotSize] = useState('0')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)
  const contractData = groups
  const refreshAuctionData = useCallback(async () => {
    if (!isConnected || !account) {
      setGroups([])
      setSelectedGroupId(null)
      setPotSize('0')
      return
    }

    setRefreshing(true)
    setErrorMessage(null)
    try {
      const provider = getProvider()
      const myGroups = await fetchContractData(async (activeContract) => {
        const total = Number(await activeContract.groupCounter())
        const fetchedGroups = []

        for (let i = 0; i < total; i += 1) {
          const members = await activeContract.getMembers(i)
          const isMember = (members || []).some(
            (member) => member.toLowerCase() === account.toLowerCase()
          )

          if (isMember) {
            const pot = await activeContract.getCurrentPot(i)
            fetchedGroups.push({ id: i, pot: pot?.toString?.() ?? '0' })
          }
        }

        return fetchedGroups
      }, provider)

      const safeGroups = myGroups || []

      setGroups(safeGroups)
      setSelectedGroupId((currentValue) => {
        const nextSelectedGroupId = (safeGroups || []).some((group) => group.id === currentValue)
          ? currentValue
          : (safeGroups[0]?.id ?? null)
        const selectedGroup = (safeGroups || []).find((group) => group.id === nextSelectedGroupId)
        setPotSize(selectedGroup?.pot ?? '0')
        return nextSelectedGroupId
      })
      setLastUpdated(new Date())
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load groups')
    } finally {
      setRefreshing(false)
    }
  }, [isConnected, account, getProvider, fetchContractData])

  useEffect(() => {
    if (!hasFetched && isConnected) {
      setHasFetched(true)
      refreshAuctionData()
    }
  }, [hasFetched, isConnected, refreshAuctionData])

  useEffect(() => {
    if (!isConnected) {
      setHasFetched(false)
    }
  }, [isConnected])

  useEffect(() => {
    const selectedGroup = (groups || []).find((group) => group.id === selectedGroupId)
    setPotSize(selectedGroup?.pot ?? '0')
  }, [selectedGroupId, groups])

  if (!contractData && refreshing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Please Connect Your Wallet</h2>
            <p className="text-gray-400">You need to connect a wallet to participate in auctions.</p>
          </div>
        </div>
      </div>
    )
  }

  const generateKey = () => {
    const key = Math.random().toString(36).substring(2, 15)
    setEncryptionKey(key)
  }

  const handleEncryptBid = () => {
    if (!bidAmount || !encryptionKey) {
      alert('Please enter bid amount and generate encryption key')
      return
    }

    try {
      const encrypted = encryptBid(bidAmount, encryptionKey)
      setEncryptedBid(encrypted)
    } catch (err) {
      alert('Encryption failed: ' + err.message)
    }
  }

  const handleSubmitBid = async () => {
    if (!encryptedBid) {
      alert('Please encrypt your bid first')
      return
    }

    if (selectedGroupId === null) {
      alert('Select a circle before submitting a bid')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const amount = parseEther(bidAmount)
      const saltBytes = new Uint8Array(32)
      crypto.getRandomValues(saltBytes)
      const salt = `0x${(Array.from(saltBytes) || []).map((b) => b.toString(16).padStart(2, '0')).join('')}`
      const sealedBidHash = keccak256(
        solidityPacked(['uint256', 'bytes32'], [amount, salt])
      )

      const provider = getProvider()
      await initializeContract(provider)
      await submitBid(selectedGroupId, sealedBidHash)

      if (!HCS_TOPIC_ID) {
        throw new Error('VITE_HCS_TOPIC_ID is not set for HCS submission')
      }

      setBidHistory((previousBidHistory) => [
        {
          id: (previousBidHistory || []).length + 1,
          hash: sealedBidHash,
          amount: bidAmount,
          encrypted: encryptedBid,
          timestamp: new Date(),
          phase: 'SEALED',
          status: 'Submitted',
        },
        ...(previousBidHistory || []),
      ])

      setSubmitted(true)
      setBidAmount('')
      setEncryptedBid(null)
      setEncryptionKey(null)

      // Reset after 3 seconds
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setErrorMessage(err.message || 'Bid submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevealBid = (bid) => {
    try {
      const key = prompt('Enter your encryption key to reveal:')
      if (!key) return

      const decrypted = decryptBid(bid.encrypted, key)
      alert(`Bid amount: ${decrypted} HBAR`)
    } catch (err) {
      alert('Failed to decrypt: Invalid key or corrupted data')
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Sealed Bid Auction</h1>
            <p className="text-gray-400">Encrypt and submit your bids for this month's pot</p>
          </div>
          <RefreshControl
            onRefresh={() => {
              setHasFetched(false)
            }}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bid Form */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-900 from-opacity-60 to-black to-opacity-40 rounded-lg p-6 border border-gray-700 border-opacity-30 sticky top-24">
              <h2 className="text-2xl font-bold text-white mb-6">Submit Bid</h2>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-600 border-opacity-30 rounded-lg text-red-200">
                  {errorMessage}
                </div>
              )}

              {/* Success Message */}
              {submitted && (
                <div className="mb-6 p-4 bg-green-900 bg-opacity-20 border border-green-600 border-opacity-30 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-semibold">Bid submitted successfully!</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Circle Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Circle
                  </label>
                  <select
                    value={selectedGroupId ?? ''}
                    onChange={(event) => setSelectedGroupId(Number(event.target.value))}
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-colors"
                  >
                    {(groups || []).length === 0 && <option value="">No circles</option>}
                    {(groups || []).map((group) => (
                      <option key={group.id} value={group.id}>
                        Circle #{group.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bid Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bid Amount (HBAR)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-colors"
                    disabled={submitted}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: 0.1 HBAR | Maximum: 10 HBAR
                  </p>
                </div>

                {/* Encryption Key Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Encryption Key
                  </label>
                  {encryptionKey ? (
                    <div className="p-3 bg-cyan-900 bg-opacity-20 border border-cyan-600 border-opacity-30 rounded-lg">
                      <p className="text-xs text-gray-400 mb-2">Your encryption key (save securely):</p>
                      <p className="text-sm font-mono text-cyan-400 break-all mb-3">{encryptionKey}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(encryptionKey)
                          alert('Key copied to clipboard')
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateKey}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                      disabled={submitted}
                    >
                      🔑 Generate Key
                    </button>
                  )}
                </div>

                {/* Encrypt Button */}
                <button
                  onClick={handleEncryptBid}
                  disabled={!bidAmount || !encryptionKey || submitted}
                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🔐 Encrypt Bid
                </button>

                {/* Encrypted Output */}
                {encryptedBid && (
                  <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Encrypted bid:</p>
                    <p className="text-xs font-mono text-gray-300 break-all">{encryptedBid}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitBid}
                  disabled={!encryptedBid || submitting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      <span>Submit to HCS</span>
                    </>
                  )}
                </button>

                {/* Info Box */}
                <div className="p-4 bg-blue-900 bg-opacity-20 border border-blue-600 border-opacity-30 rounded-lg">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    <strong>How it works:</strong> Your bid is encrypted with a key only you know.
                    Submit the encrypted bid to HCS. During reveal phase, decrypt it with your key.
                    Lowest valid bid wins the pot.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Info & Bid History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Status */}
            <div className="bg-gradient-to-br from-purple-900 from-opacity-20 to-cyan-900 to-opacity-10 rounded-lg p-6 border border-purple-500 border-opacity-30">
              <h3 className="text-xl font-bold text-white mb-4">Auction Status</h3>

              <div className="space-y-6">
                {/* Phase Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-300">Current Phase</span>
                    <span className="px-3 py-1 bg-cyan-900 bg-opacity-40 text-cyan-300 rounded-full text-sm font-semibold">
                      {auctionPhase === 'SEALED' ? '🔐 SEALED BID' : '🔓 REVEAL'}
                    </span>
                  </div>

                  <CountdownTimer
                    endDate={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)}
                    onComplete={() => setAuctionPhase('REVEALED')}
                  />
                </div>

                {/* Pot Info */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Current Pot</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        {formatEther(potSize || '0')} HBAR
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Number of Bids</p>
                      <p className="text-2xl font-bold text-purple-400">{(bidHistory || []).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bid History */}
            <div className="bg-gradient-to-br from-gray-900 from-opacity-40 to-black to-opacity-10 rounded-lg p-6 border border-gray-700 border-opacity-30">
              <h3 className="text-xl font-bold text-white mb-4">Bid History</h3>

              {(bidHistory || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No bids submitted yet for this auction</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(bidHistory || []).map((bid) => (
                    <div
                      key={bid.id}
                      className="p-4 bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 hover:border-cyan-400 hover:border-opacity-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-300 font-mono truncate">
                            {bid.hash}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {bid.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-cyan-900 bg-opacity-40 text-cyan-300 rounded text-xs font-semibold">
                            {bid.phase}
                          </span>
                          <span className="px-2 py-1 bg-green-900 bg-opacity-40 text-green-300 rounded text-xs font-semibold">
                            {bid.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRevealBid(bid)}
                          className="flex-1 px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                        >
                          Reveal Bid
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(bid.encrypted)
                            alert('Encrypted bid copied')
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                          Copy Hash
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RefreshControl({ onRefresh, refreshing, lastUpdated }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-400 text-cyan-300 rounded-lg font-semibold hover:bg-cyan-900 hover:bg-opacity-30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {refreshing ? (
          <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4v5h.582A6.5 6.5 0 1110.5 16a6.47 6.47 0 01-4.594-1.905l-1.06 1.06A8 8 0 1010.5 2c-2.206 0-4.204.893-5.651 2.336V4H4z" />
          </svg>
        )}
        <span>Refresh</span>
      </button>
      <span className="text-xs text-gray-400">
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
      </span>
    </div>
  )
}

export default Auction
