'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

type Mode = 'signin' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()
  const [mode, setMode] = useState<Mode>('signin')

  const [username, setUsername]               = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)

  function resetForm() {
    setUsername(''); setPassword(''); setConfirmPassword(''); setError('')
  }
  function switchMode(m: Mode) { setMode(m); resetForm() }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', { username, password })
      setToken(res.data.access_token)
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${res.data.access_token}` } })
      setUser(me.data)
      router.push('/dashboard')
    } catch {
      setError('Invalid username or password')
    } finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/register', { username, password })
      setToken(res.data.access_token)
      const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${res.data.access_token}` } })
      setUser(me.data)
      router.push('/dashboard')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Username already taken')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            💪
          </div>
          <h1 className="text-2xl font-black tracking-tight">GymTrack</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Dennis · Cyrus · Noki</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-5 gap-1"
            style={{ background: 'var(--bg-elevated)' }}>
            {(['signin', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[44px]"
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 4px 12px var(--accent-glow)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <input
                className="w-full rounded-xl px-4 py-3.5 text-base border min-h-[52px] transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required autoComplete="username"
              />
              <input
                type="password"
                className="w-full rounded-xl px-4 py-3.5 text-base border min-h-[52px] transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3.5 font-bold text-base min-h-[52px] transition-all"
                style={{
                  background: 'var(--accent)', color: '#fff',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 6px 20px var(--accent-glow)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                className="w-full rounded-xl px-4 py-3.5 text-base border min-h-[52px] transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required autoComplete="username"
              />
              <input
                type="password"
                className="w-full rounded-xl px-4 py-3.5 text-base border min-h-[52px] transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required autoComplete="new-password"
              />
              <input
                type="password"
                className="w-full rounded-xl px-4 py-3.5 text-base border min-h-[52px] transition-colors focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required autoComplete="new-password"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl py-3.5 font-bold text-base min-h-[52px] transition-all"
                style={{
                  background: 'var(--accent)', color: '#fff',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 6px 20px var(--accent-glow)',
                }}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
