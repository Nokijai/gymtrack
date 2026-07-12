'use client'
import { useState, useRef, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STORAGE_KEY = 'gymtrack_coach_chat'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: 'var(--text-muted)',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function CoachChat() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
      }
    } catch {}
  }, [])

  // Save to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  function handleOpen() {
    setOpen(true)
    if (messages.length === 0) {
      const greeting: Message = {
        role: 'assistant',
        content: `Hi ${user?.username || 'there'}! I'm your AI coach. Ask me anything about your workout, nutrition, or progress.`,
        timestamp: new Date(),
      }
      setMessages([greeting])
    }
  }

  async function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsTyping(true)

    try {
      const history = newMessages.slice(-10).slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await api.post('/ai/chat', {
        message: trimmed,
        history,
      })

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(response.data.timestamp),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-4 md:right-6 z-40 w-12 h-12 rounded-full shadow-lg
                   flex items-center justify-center text-xs font-medium transition-all"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: 'var(--shadow-lg)',
        }}
        aria-label="Open AI Coach"
      >
        AI
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />}

      {/* Chat drawer */}
      <div
        className="fixed z-50 transition-all duration-300 ease-out"
        style={{
          bottom: open ? '0' : '-100%',
          left: 0,
          right: 0,
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <div
          className="rounded-t-lg flex flex-col"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            height: '70vh',
            maxHeight: '560px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              AI
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Coach</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isTyping ? 'Thinking…' : 'Ask anything'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded" style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mr-2 mt-0.5"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    AI
                  </div>
                )}
                <div
                  className="max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--accent)',
                          color: '#fff',
                        }
                      : {
                          background: 'var(--bg-hover)',
                          color: 'var(--text)',
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mr-2"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  AI
                </div>
                <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-hover)' }}>
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
          >
            <input
              ref={inputRef}
              type="text"
              className="input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-md flex items-center justify-center transition-all"
              style={{
                background: input.trim() && !isTyping ? 'var(--accent)' : 'var(--bg-hover)',
                color: input.trim() && !isTyping ? '#fff' : 'var(--text-muted)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}