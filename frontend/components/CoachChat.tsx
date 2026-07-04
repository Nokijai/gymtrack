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
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            background: 'var(--accent)',
            animationDelay: `${i * 0.15}s`,
            opacity: 0.7,
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
    // Show greeting if no messages
    if (messages.length === 0) {
      const greeting: Message = {
        role: 'assistant',
        content: `Hi ${user?.username || 'there'}! 👋 What's on your mind? I can help with your workout plan, answer fitness questions, or review your progress.`,
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
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again! 🙏',
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
      {/* ── Floating button ─────────────────────────────────────────────── */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 md:bottom-6 z-50 w-14 h-14 rounded-full shadow-2xl
                   flex items-center justify-center text-2xl transition-all duration-200 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
          boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
        }}
        aria-label="Open AI Coach Chat"
      >
        💬
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Chat drawer ─────────────────────────────────────────────────── */}
      <div
        className="fixed z-50 transition-all duration-300 ease-out"
        style={{
          bottom: open ? '0' : '-100%',
          left: 0,
          right: 0,
          maxWidth: '480px',
          margin: '0 auto',
          // On desktop — show as side panel
        }}
      >
        <div
          className="rounded-t-3xl flex flex-col"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            height: '75vh',
            maxHeight: '600px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)' }}
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">AI Coach</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isTyping ? '正在思考...' : '随时帮助你'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollBehavior: 'smooth' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)' }}
                  >
                    🤖
                  </div>
                )}
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--accent)',
                          color: '#fff',
                          borderBottomRightRadius: '6px',
                        }
                      : {
                          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(124,58,237,0.08) 100%)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          color: 'var(--text)',
                          borderBottomLeftRadius: '6px',
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
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-2"
                  style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)' }}
                >
                  🤖
                </div>
                <div
                  className="rounded-2xl px-3 py-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(124,58,237,0.08) 100%)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderBottomLeftRadius: '6px',
                  }}
                >
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:border-blue-500 outline-none transition-colors"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
              }}
              placeholder="问教练任何问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: input.trim() && !isTyping ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: input.trim() && !isTyping ? '#fff' : 'var(--text-muted)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
