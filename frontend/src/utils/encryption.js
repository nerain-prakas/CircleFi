import CryptoJS from 'crypto-js'

/**
 * Encrypt a bid amount using a key
 * @param {string} bidAmount - The bid amount as a string
 * @param {string} key - Encryption key
 * @returns {string} Encrypted bid
 */
export function encryptBid(bidAmount, key) {
  if (!bidAmount || !key) {
    throw new Error('Bid amount and key are required')
  }

  // Validate bid amount
  const amount = parseFloat(bidAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid bid amount')
  }

  // Encrypt using AES
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify({
      amount: amount.toString(),
      timestamp: new Date().toISOString(),
      nonce: Math.random().toString(36),
    }),
    key
  ).toString()

  return encrypted
}

/**
 * Decrypt a bid amount using a key
 * @param {string} encryptedBid - The encrypted bid
 * @param {string} key - Encryption key
 * @returns {string} Decrypted bid amount
 */
export function decryptBid(encryptedBid, key) {
  if (!encryptedBid || !key) {
    throw new Error('Encrypted bid and key are required')
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedBid, key).toString(CryptoJS.enc.Utf8)
    const bidData = JSON.parse(decrypted)
    return bidData.amount
  } catch (err) {
    throw new Error('Failed to decrypt bid: Invalid key or corrupted data')
  }
}

/**
 * Generate a random encryption key
 * @returns {string} Random key
 */
export function generateKey() {
  return CryptoJS.lib.WordArray.random(32).toString()
}

/**
 * Hash a bid for verification (one-way)
 * @param {string} bidAmount - Bid amount
 * @returns {string} Hash of the bid
 */
export function hashBid(bidAmount) {
  return CryptoJS.SHA256(bidAmount).toString()
}

/**
 * Verify a bid hash
 * @param {string} bidAmount - Original bid amount
 * @param {string} hash - Hash to verify against
 * @returns {boolean} True if hash matches
 */
export function verifyBidHash(bidAmount, hash) {
  return hashBid(bidAmount) === hash
}
