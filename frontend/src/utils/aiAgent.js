import { HCS_TOPIC_ID } from './constants'
import { fetchHCSMessages, decodeHCSMessage } from './hedera'

const DEFAULT_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free'
const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'openrouter/auto',
]

function getOpenRouterApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPEN_ROUTER_API_KEY || ''
}

export const CIRCLEFI_SYSTEM_PROMPT =
  'You are SangamFi Assistant, an expert on SangamFi decentralized savings circles and sealed-bid auctions on Hedera. ' +
  'Explain mechanisms clearly, reference auction history context when available, and avoid inventing transaction facts. ' +
  'Keep responses human-readable with short sections and concise bullets. Avoid dumping full ciphertext or long hashes; abbreviate them.'

function toSafeString(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function shorten(value, start = 10, end = 8) {
  const text = toSafeString(value)
  if (!text) return ''
  if (text.length <= start + end + 3) return text
  return `${text.slice(0, start)}...${text.slice(-end)}`
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return toSafeString(payload)
  }

  return {
    type: payload.type || 'unknown',
    groupId: payload.groupId ?? null,
    month: payload.month ?? payload.currentMonth ?? null,
    bidder: shorten(payload.bidder || payload.account || ''),
    encryptedBid: shorten(payload.encryptedBid || ''),
    sealedBidHash: shorten(payload.sealedBidHash || payload.hash || ''),
    timestamp: payload.timestamp || payload.submittedAt || null,
  }
}

export async function loadAuctionHistoryContext(limit = 20) {
  const topicId = import.meta.env.VITE_HCS_TOPIC_ID || HCS_TOPIC_ID
  if (!topicId) {
    return {
      topicId: null,
      entries: [],
      summary: 'No HCS topic configured.',
    }
  }

  const raw = await fetchHCSMessages(topicId)
  const normalized = (raw || [])
    .slice(0, limit)
    .map((message, index) => {
      try {
        const decoded = decodeHCSMessage(message.message)
        const parsed = JSON.parse(decoded)
        return {
          index,
          consensusTimestamp: message.consensus_timestamp,
          payload: summarizePayload(parsed),
        }
      } catch {
        return {
          index,
          consensusTimestamp: message.consensus_timestamp,
          payload: shorten(toSafeString(decodeHCSMessage(message.message)), 120, 32),
        }
      }
    })

  return {
    topicId,
    entries: normalized,
    summary: `Loaded ${normalized.length} recent messages from topic ${topicId}.`,
  }
}

async function callProxyAgent({ userMessage, hcsContext }) {
  const apiUrl = import.meta.env.VITE_AI_AGENT_API_URL
  if (!apiUrl) {
    return null
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userMessage,
      systemPrompt: CIRCLEFI_SYSTEM_PROMPT,
      hcsContext,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI proxy request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return {
    answer: data?.answer || data?.reply || '',
    transport: 'proxy',
    model: data?.model || 'unknown',
  }
}

async function callOpenRouterDirect({ userMessage, hcsContext }) {
  const openRouterApiKey = getOpenRouterApiKey()
  if (!openRouterApiKey) {
    throw new Error(
      'No AI transport configured. Set VITE_AI_AGENT_API_URL for a backend proxy, or VITE_OPENROUTER_API_KEY / VITE_OPEN_ROUTER_API_KEY for direct browser calls.'
    )
  }

  let lastError = null

  for (const model of FALLBACK_MODELS) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SangamFi Frontend Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: CIRCLEFI_SYSTEM_PROMPT },
          {
            role: 'system',
            content: `HCS topic context: ${JSON.stringify(hcsContext)}`,
          },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        answer: data?.choices?.[0]?.message?.content || '',
        transport: 'openrouter-direct',
        model: data?.model || model,
      }
    }

    const errBody = await response.text()
    lastError = `OpenRouter request failed for ${model}: ${response.status} ${errBody}`

    const isEndpointMissing = response.status === 404 && errBody.toLowerCase().includes('no endpoints found')
    if (!isEndpointMissing) {
      break
    }
  }

  throw new Error(lastError || 'OpenRouter request failed')
}

export async function askCircleFiAssistant(userMessage) {
  const hcsContext = await loadAuctionHistoryContext(20)

  const proxyResult = await callProxyAgent({ userMessage, hcsContext })
  if (proxyResult) {
    return {
      ...proxyResult,
      hcsSummary: hcsContext.summary,
    }
  }

  const directResult = await callOpenRouterDirect({ userMessage, hcsContext })
  return {
    ...directResult,
    hcsSummary: hcsContext.summary,
  }
}
