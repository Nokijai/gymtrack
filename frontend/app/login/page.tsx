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

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  function switchMode(m: Mode) {
    setMode(m)
    resetForm()
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { username, password })
      setToken(res.data.access_token)
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      })
      setUser(me.data)
      router.push('/dashboard')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', { username, password })
      setToken(res.data.access_token)
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      })
      setUser(me.data)
      router.push('/dashboard')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Username already taken')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg-base)', color: 'var(--text)' }}
    >
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold tracking-tight">GymTrack</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Team gym tracking
          </p>
        </div>

        {/* Form container */}
        <div
          className="rounded-lg p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {/* Tab switcher */}
          <div
            className="flex rounded-md p-1 mb-4"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {(['signin', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-xs font-medium rounded transition-colors"
                style={{
                  background: mode === m ? 'var(--bg-hover)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                {m === 'signin' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <input
                className="input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <input
                type="password"
                className="input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {error && (
                <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                className="input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <input
                type="password"
                className="input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <input
                type="password"
                className="input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {error && (
                <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}