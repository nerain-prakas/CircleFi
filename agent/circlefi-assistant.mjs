import process from 'node:process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import dotenv from 'dotenv'
import {
  RegistryBrokerClient,
  ProfileType,
  AIAgentCapability,
} from '@hashgraphonline/standards-sdk'
import { HederaLangchainToolkit } from 'hedera-agent-kit'
import { ChatOpenAI } from '@langchain/openai'

const REQUIRED_ENV = [
  'ACCOUNT_ID',
  'PRIVATE_KEY',
  'OPENROUTER_API_KEY',
]

const NETWORK = process.env.HEDERA_NETWORK || 'testnet'
const HCS_TOPIC_ID = process.env.VITE_HCS_TOPIC_ID || '0.0.8342812'

function loadEnv() {
  const rootEnvPath = resolve(process.cwd(), '.env')
  const frontendEnvPath = resolve(process.cwd(), 'frontend/.env')

  if (existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath })
    return
  }

  if (existsSync(frontendEnvPath)) {
    dotenv.config({ path: frontendEnvPath })
  }
}

function assertEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

async function registerHolAgent() {
  const holClient = new RegistryBrokerClient({
    baseUrl: 'https://hol.org/registry/api/v1',
  })

  await holClient.authenticateWithLedgerCredentials({
    accountId: process.env.ACCOUNT_ID,
    privateKey: process.env.PRIVATE_KEY,
    network: `hedera:${NETWORK}`,
  })

  const registration = await holClient.registerAgent({
    name: 'SangamFi Assistant',
    type: ProfileType.AI_AGENT,
    capabilities: [AIAgentCapability.SEARCH, AIAgentCapability.CHAT],
    network: `hedera:${NETWORK}`,
    description:
      'SangamFi Assistant: AI expert for decentralized savings circles and sealed-bid auctions on Hedera.',
    metadata: {
      hcsTopicId: HCS_TOPIC_ID,
      protocol: 'HCS-10',
      tags: ['SangamFi', 'Hedera', 'Savings', 'Auction'],
    },
  })

  const uaid =
    registration?.uaid ||
    registration?.agentId ||
    registration?.id ||
    registration?.profile?.uaid ||
    null

  return { registration, uaid }
}

async function initializeSangamFiChatbot() {
  const systemPrompt =
    'You are SangamFi Assistant, an expert on SangamFi decentralized savings circles and sealed-bid auctions on Hedera. ' +
    'Use HCS auction history data from the configured topic to explain bids, trends, and activity. ' +
    'Be precise, transparent about uncertainty, and never fabricate transaction data.'

  const llm = new ChatOpenAI({
    modelName: 'meta-llama/llama-3-8b-instruct:free',
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    temperature: 0.2,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'https://circlefi.local',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'SangamFi Assistant',
      },
    },
  })

  const toolkit = new HederaLangchainToolkit({
    operatorId: process.env.ACCOUNT_ID,
    operatorKey: process.env.PRIVATE_KEY,
    network: NETWORK,
    plugins: ['core_consensus_query_plugin'],
    pluginConfig: {
      core_consensus_query_plugin: {
        topicId: HCS_TOPIC_ID,
      },
    },
  })

  const tools = typeof toolkit.getTools === 'function' ? await toolkit.getTools() : []
  const consensusTool = tools.find((tool) => {
    const name = String(tool?.name || '').toLowerCase()
    return name.includes('consensus') || name.includes('topic')
  })

  async function chat(userPrompt) {
    let hcsContext = ''

    if (consensusTool?.invoke) {
      try {
        const toolResult = await consensusTool.invoke({ topicId: HCS_TOPIC_ID, limit: 20 })
        hcsContext = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
      } catch (toolErr) {
        hcsContext = `Consensus plugin error: ${toolErr.message}`
      }
    }

    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `HCS topic for auction history: ${HCS_TOPIC_ID}. Retrieved context: ${hcsContext || 'No tool context available.'}`,
      },
      { role: 'user', content: userPrompt },
    ])

    return response?.content || ''
  }

  return {
    llm,
    toolkit,
    tools,
    chat,
    systemPrompt,
  }
}

async function main() {
  loadEnv()
  assertEnv()

  console.log('[SangamFi Assistant] Registering with HOL...')
  const { registration, uaid } = await registerHolAgent()

  console.log('[SangamFi Assistant] HOL registration complete.')
  console.log('[SangamFi Assistant] UAID:', uaid || 'Unavailable in response payload')
  console.log('[SangamFi Assistant] Raw registration response:')
  console.log(JSON.stringify(registration, null, 2))

  console.log('[SangamFi Assistant] Initializing OpenRouter + Hedera agent toolkit...')
  const bot = await initializeSangamFiChatbot()
  console.log('[SangamFi Assistant] Chatbot initialized.')
  console.log(`[SangamFi Assistant] Using HCS topic: ${HCS_TOPIC_ID}`)

  const rl = readline.createInterface({ input, output })

  try {
    while (true) {
      const prompt = await rl.question('\nAsk SangamFi Assistant (or type "exit"): ')
      if (!prompt || prompt.trim().toLowerCase() === 'exit') {
        break
      }

      const answer = await bot.chat(prompt)
      console.log('\nAssistant:', answer)
    }
  } finally {
    rl.close()
  }
}

main().catch((err) => {
  console.error('[SangamFi Assistant] Fatal error:', err)
  process.exit(1)
})
