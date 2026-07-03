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

  // Shared fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // Register-only
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏋️</div>
          <h1 className="text-2xl font-bold text-white">GymTrack</h1>
          <p className="text-gray-400 text-sm mt-1">Dennis · Cyrus · Noki</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-800 p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
              mode === 'signin'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
              mode === 'register'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 text-base min-h-[48px]"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 text-base min-h-[48px]"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors min-h-[48px] text-base"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 text-base min-h-[48px]"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 text-base min-h-[48px]"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 text-base min-h-[48px]"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors min-h-[48px] text-base"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
