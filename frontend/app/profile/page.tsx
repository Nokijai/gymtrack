'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import Avatar from '@/components/Avatar'
import { useAuthStore } from '@/lib/store'
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
  avatar_url: string | null
}

interface SessionRow {
  id: number
  date: string
  duration_minutes: number
  notes: string | null
  exercises: { id: number; name: string; sets: number; reps: number; weight_kg: number | null }[]
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { setUser, user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploadLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { avatar_url } = res.data
      // Refresh profile query
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Update auth store so Nav updates immediately
      if (user) {
        setUser({ ...user, avatar_url })
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 400) {
        setUploadError(detail ?? 'Invalid file. Only JPEG, PNG, WebP under 2 MB.')
      } else if (err?.response?.status === 413) {
        setUploadError('File exceeds 2 MB limit.')
      } else {
        setUploadError('Upload failed. Please try again.')
      }
    } finally {
      setUploadLoading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6">

          {/* Avatar + badges — centered on mobile */}
          <div className="flex flex-col items-center gap-3 py-4">
            {/* Clickable avatar — opens file picker */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar username={profile.username} size="lg" avatarUrl={profile.avatar_url} />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadLoading ? (
                  <span className="text-white text-xs">Uploading…</span>
                ) : (
                  <span className="text-white text-xs font-semibold">📷 Change</span>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {uploadError && <p className="text-red-400 text-xs text-center">{uploadError}</p>}
            {uploadLoading && <p className="text-gray-400 text-xs">Uploading avatar…</p>}

            <div className="text-xl md:text-2xl font-bold capitalize text-center">{profile.username}</div>
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

          {/* Stats grid — 2-col on mobile, 3-col on md+ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard icon="⭐" label="Level" value={`${profile.level}`} />
            <StatCard icon="⚡" label="Total XP" value={`${profile.xp.toLocaleString()}`} highlight />
            <StatCard icon="🔥" label="Current Streak" value={`${profile.current_streak}d`} />
            <StatCard icon="🏆" label="Best Streak" value={`${profile.longest_streak}d`} />
            <StatCard icon="💪" label="Total Sessions" value={`${profile.total_sessions}`} />
            <StatCard icon="⏱️" label="Total Time" value={`${totalHours}h`} />
          </div>

          {/* Recent sessions — card layout on mobile */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-4">Recent Sessions</h2>
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
                    className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-xl px-4 py-3 cursor-pointer hover:ring-1 hover:ring-orange-500 transition-all min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-medium text-sm">{s.date}</div>
                      <div className="text-gray-400 text-xs truncate">
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="text-orange-400 font-semibold text-sm flex-shrink-0">{s.duration_minutes} min</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Password — full width inputs on mobile */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePwSubmit} className="space-y-3 w-full md:max-w-sm">
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 min-h-[44px]"
                placeholder="Current password"
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 min-h-[44px]"
                placeholder="New password"
                value={pwForm.next}
                onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                required
              />
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-orange-500 min-h-[44px]"
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
                className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-6 py-3 transition-colors min-h-[44px]"
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
    <div className={`rounded-2xl p-3 md:p-4 border ${highlight ? 'bg-yellow-950/40 border-yellow-700/50' : 'bg-gray-900 border-gray-800'}`}>
      <div className="text-xl md:text-2xl mb-1">{icon}</div>
      <div className={`text-xl md:text-2xl font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1 leading-tight">{label}</div>
    </div>
  )
}
