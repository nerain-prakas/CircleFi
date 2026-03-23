import { useMemo, useState } from 'react'
import { useWalletContext } from '../context/WalletContext'
import { askCircleFiAssistant } from '../utils/aiAgent'

function formatAssistantText(text) {
  const input = String(text || '')
  return input
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function Assistant() {
  const { connected, account } = useWalletContext()
  const [input, setInput] = useState('Summarize recent auction activity and explain what it means for bidders.')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const helperText = useMemo(() => {
    if (import.meta.env.VITE_AI_AGENT_API_URL) {
      return 'Using backend proxy transport for AI requests.'
    }
    if (import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPEN_ROUTER_API_KEY) {
      return 'Using direct OpenRouter calls from browser.'
    }
    return 'No AI transport configured. Add VITE_AI_AGENT_API_URL (recommended) or VITE_OPENROUTER_API_KEY / VITE_OPEN_ROUTER_API_KEY.'
  }, [])

  const onSend = async () => {
    const text = String(input || '').trim()
    if (!text || loading) {
      return
    }

    setLoading(true)
    setError('')

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      meta: '',
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const result = await askCircleFiAssistant(text)
      const assistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: formatAssistantText(result.answer || 'No response returned.'),
        meta: `${result.transport} | ${result.model} | ${result.hcsSummary}`,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setInput('')
    } catch (err) {
      const message = err?.message || 'Failed to query assistant'
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `I could not complete this request. ${message}`,
          meta: 'error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">SangamFi AI Assistant</h1>
          <p className="text-gray-400">Ask questions about savings circles, governance, and auction activity.</p>
          <p className="text-xs text-cyan-300 mt-2">{helperText}</p>
          <p className="text-xs text-gray-500 mt-1">
            Wallet: {connected ? account : 'Not connected'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <section className="rounded-xl border border-cyan-500 border-opacity-30 bg-gradient-to-br from-cyan-950 to-black p-5">
            <div className="space-y-4">
              <label className="text-sm text-gray-300 block">Your question</label>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-gray-900 text-gray-100 border border-gray-700 focus:border-cyan-400 focus:outline-none"
                placeholder="Ask anything about SangamFi or the recent HCS auction history"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onSend}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-cyan-500 text-black font-semibold hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Thinking...' : 'Ask Assistant'}
                </button>
                {error && <span className="text-sm text-red-300">{error}</span>}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-700 bg-gray-900 bg-opacity-50 p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Conversation</h2>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm">No messages yet. Start by asking a question.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-lg p-3 border ${message.role === 'user'
                      ? 'bg-cyan-900 bg-opacity-20 border-cyan-700'
                      : 'bg-gray-800 border-gray-700'
                      }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{message.role}</p>
                    <p className="text-sm text-gray-100 whitespace-pre-wrap">{message.content}</p>
                    {message.meta && <p className="text-xs text-gray-500 mt-2">{message.meta}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default Assistant
