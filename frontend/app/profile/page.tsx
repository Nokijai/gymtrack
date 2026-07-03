'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import api from '@/lib/api'

interface ProfileData {
  username: string
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  total_sessions: number
  total_minutes: number
  member_since: string
  is_admin: boolean
}

interface SessionRow {
  id: number
  date: string
  duration_minutes: number
  notes: string | null
  exercises: { id: number; name: string; sets: number; reps: number; weight_kg: number | null }[]
}

const AVATAR_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function ProfilePage() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data),
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionRow[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions?limit=20').then((r) => r.data),
  })

  const pwMutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api.put('/profile/password', body),
    onSuccess: () => {
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwError('')
      setTimeout(() => setPwSuccess(false), 3000)
    },
    onError: (err: any) => {
      if (err?.response?.status === 400) {
        setPwError('Current password is incorrect')
      } else {
        setPwError('Failed to update password')
      }
    },
  })

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match')
      return
    }
    pwMutation.mutate({ current_password: pwForm.current, new_password: pwForm.next })
  }

  if (profileLoading || !profile) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-gray-400">Loading…</div>
        </div>
      </AuthGuard>
    )
  }

  const totalHours = (profile.total_minutes / 60).toFixed(1)
  const color = avatarColor(profile.username)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

          {/* Avatar + badges */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-lg"
              style={{ background: color }}
            >
              {profile.username[0].toUpperCase()}
            </div>
            <div className="text-2xl font-bold capitalize">{profile.username}</div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <LevelBadge level={profile.level} size="md" />
              <XPBadge xp={profile.xp} size="md" />
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-700 text-white">
                  🛡️ Admin
                </span>
              )}
            </div>
            <div className="text-gray-500 text-xs">Member since {profile.member_since}</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon="⭐" label="Level" value={`${profile.level}`} />
            <StatCard icon="⚡" label="Total XP" value={`${profile.xp.toLocaleString()}`} highlight />
            <StatCard icon="🔥" label="Current Streak" value={`${profile.current_streak}d`} />
            <StatCard icon="🏆" label="Best Streak" value={`${profile.longest_streak}d`} />
            <StatCard icon="💪" label="Total Sessions" value={`${profile.total_sessions}`} />
            <StatCard icon="⏱️" label="Total Time" value={`${totalHours}h`} />
          </div>

          {/* Recent sessions */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
            {sessionsLoading ? (
              <div className="text-gray-400 text-sm">Loading…</div>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-xl px-4 py-3 cursor-pointer hover:ring-1 hover:ring-orange-500 transition-all"
                  >
                    <div>
                      <div className="font-medium">{s.date}</div>
                      <div className="text-gray-400 text-sm">
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="text-orange-400 font-semibold text-sm">{s.duration_minutes} min</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePwSubmit} className="space-y-3 max-w-sm">
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500"
                placeholder="Current password"
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500"
                placeholder="New password"
                value={pwForm.next}
                onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500"
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              {pwSuccess && <p className="text-green-400 text-sm">✓ Password updated successfully</p>}
              <button
                type="submit"
                disabled={pwMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-2.5 transition-colors"
              >
                {pwMutation.isPending ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Session detail modal */}
      <SessionDetailModal
        sessionId={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </AuthGuard>
  )
}

function StatCard({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-yellow-950/40 border-yellow-700/50' : 'bg-gray-900 border-gray-800'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  )
}
