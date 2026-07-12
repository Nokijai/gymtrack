'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import { xpForLevel, xpForNextLevel } from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import Avatar from '@/components/Avatar'
import BadgeGrid from '@/components/BadgeGrid'
import ExerciseRoadmap from '@/components/ExerciseRoadmap'
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
  const [showPwForm, setShowPwForm] = useState(false)

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
      setTimeout(() => { setPwSuccess(false); setShowPwForm(false) }, 2500)
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
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
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
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      if (user) setUser({ ...user, avatar_url })
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
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (profileLoading || !profile) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      </AuthGuard>
    )
  }

  const totalHours = (profile.total_minutes / 60).toFixed(1)
  const currentLevelXP = xpForLevel(profile.level)
  const nextLevelXP    = xpForNextLevel(profile.level)
  const xpInLevel      = profile.xp - currentLevelXP
  const xpNeeded       = nextLevelXP - currentLevelXP
  const xpPct          = profile.level >= 50 ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-xl mx-auto px-4 py-6 pb-8 space-y-4">

          {/* Profile Header Card */}
          <div className="card p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className="relative cursor-pointer group flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar username={profile.username} size="lg" avatarUrl={profile.avatar_url} />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadLoading
                    ? <span className="text-white text-xs">...</span>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  }
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleAvatarChange} />

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold capitalize">{profile.username}</h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <LevelBadge level={profile.level} size="sm" />
                  <XPBadge xp={profile.xp} size="sm" />
                  {profile.is_admin && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)' }}>
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Member since {profile.member_since}
                </p>
              </div>
            </div>

            {uploadError && <p className="text-xs mt-3" style={{ color: 'var(--red)' }}>{uploadError}</p>}

            {/* XP Progress Bar */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {profile.level >= 50
                    ? 'Max level'
                    : `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
                </span>
                <span>{xpPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPct}%`, background: 'var(--accent)' }}
                />
              </div>
              {profile.level < 50 && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Level {profile.level + 1}
                </p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total XP" value={profile.xp.toLocaleString()} accent />
            <StatCard label="Level" value={`${profile.level}`} />
            <StatCard label="Streak" value={`${profile.current_streak}d`} />
            <StatCard label="Best Streak" value={`${profile.longest_streak}d`} />
            <StatCard label="Sessions" value={`${profile.total_sessions}`} />
            <StatCard label="Total Time" value={`${totalHours}h`} />
          </div>

          {/* Exercise Roadmap */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Exercise Roadmap
            </h2>
            <div className="mt-4">
              <ExerciseRoadmap />
            </div>
          </div>

          {/* Achievements */}
          <BadgeGrid />

          {/* Session History */}
          <div className="card overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                Session History
              </h2>
            </div>

            {sessionsLoading ? (
              <div className="px-4 pb-4 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="px-4 pb-4 text-sm" style={{ color: 'var(--text-muted)' }}>No sessions yet.</div>
            ) : (
              <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="font-medium text-sm">{s.date}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        {s.notes ? ` - ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{s.duration_minutes}m</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setShowPwForm(!showPwForm)}
            >
              <span className="text-sm font-semibold">Change Password</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showPwForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showPwForm && (
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <form onSubmit={handlePwSubmit} className="space-y-2 mt-3">
                  {(['current', 'next', 'confirm'] as const).map((key) => (
                    <input
                      key={key}
                      type="password"
                      className="input"
                      placeholder={key === 'current' ? 'Current password' : key === 'next' ? 'New password' : 'Confirm new password'}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                      required
                    />
                  ))}
                  {pwError && <p className="text-xs" style={{ color: 'var(--red)' }}>{pwError}</p>}
                  {pwSuccess && <p className="text-xs" style={{ color: 'var(--green)' }}>Password updated</p>}
                  <button
                    type="submit"
                    disabled={pwMutation.isPending}
                    className="w-full rounded-md py-2.5 text-sm font-medium transition-opacity"
                    style={{ background: 'var(--accent)', color: '#fff', opacity: pwMutation.isPending ? 0.6 : 1 }}
                  >
                    {pwMutation.isPending ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </div>

      <SessionDetailModal sessionId={selectedSession} onClose={() => setSelectedSession(null)} />
    </AuthGuard>
  )
}

function StatCard({ label, value, accent = false }: {
  label: string; value: string; accent?: boolean
}) {
  return (
    <div className="card p-3">
      <div className="text-lg font-semibold" style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
