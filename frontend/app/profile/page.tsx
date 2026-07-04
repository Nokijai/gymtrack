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
  const xpPct          = profile.level >= 20 ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-xl mx-auto px-4 py-6 pb-8 space-y-5">

          {/* ── Hero card ───────────────────────────────────────────────── */}
          <div className="rounded-2xl p-5 text-center relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }} />

            {/* Avatar — tap to change */}
            <div className="relative inline-block cursor-pointer group mt-2"
              onClick={() => fileInputRef.current?.click()}>
              <Avatar username={profile.username} size="lg" avatarUrl={profile.avatar_url} />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadLoading
                  ? <span className="text-white text-xs">…</span>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                }
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={handleAvatarChange} />
            {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}

            <h1 className="text-xl font-bold capitalize mt-3">{profile.username}</h1>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <LevelBadge level={profile.level} size="md" />
              <XPBadge xp={profile.xp} size="md" />
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  🛡️ Admin
                </span>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Member since {profile.member_since}
            </p>

            {/* XP bar */}
            <div className="mt-4 text-left">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {profile.level >= 20
                    ? 'MAX LEVEL REACHED'
                    : `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP → Lv.${profile.level + 1}`}
                </span>
                <span>{xpPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full progress-shimmer transition-all duration-700"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Stats grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="⚡" label="Total XP" value={profile.xp.toLocaleString()} accent />
            <StatCard icon="⭐" label="Level" value={`${profile.level}`} />
            <StatCard icon="🔥" label="Streak" value={`${profile.current_streak}d`} />
            <StatCard icon="🏆" label="Best Streak" value={`${profile.longest_streak}d`} />
            <StatCard icon="💪" label="Sessions" value={`${profile.total_sessions}`} />
            <StatCard icon="⏱️" label="Total Time" value={`${totalHours}h`} />
          </div>

          {/* ── Session history ─────────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Session History
              </h2>
            </div>

            {sessionsLoading ? (
              <div className="px-5 pb-5 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="px-5 pb-5 text-sm" style={{ color: 'var(--text-muted)' }}>No sessions yet.</div>
            ) : (
              <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] min-h-[60px]"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="font-semibold text-sm">{s.date}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{s.duration_minutes}m</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Change password ─────────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowPwForm(!showPwForm)}
            >
              <span className="text-sm font-semibold">Change Password</span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showPwForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showPwForm && (
              <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <form onSubmit={handlePwSubmit} className="space-y-3 mt-3">
                  {(['current', 'next', 'confirm'] as const).map((key) => (
                    <input
                      key={key}
                      type="password"
                      className="w-full rounded-xl px-4 py-3 text-sm border min-h-[48px] transition-colors focus:border-blue-500"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                      placeholder={key === 'current' ? 'Current password' : key === 'next' ? 'New password' : 'Confirm new password'}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                      required
                    />
                  ))}
                  {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
                  {pwSuccess && <p className="text-xs" style={{ color: '#4ade80' }}>✓ Password updated</p>}
                  <button
                    type="submit"
                    disabled={pwMutation.isPending}
                    className="w-full rounded-xl py-3 text-sm font-semibold min-h-[48px] transition-opacity"
                    style={{ background: 'var(--accent)', color: '#fff', opacity: pwMutation.isPending ? 0.6 : 1 }}
                  >
                    {pwMutation.isPending ? 'Updating…' : 'Update Password'}
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

function StatCard({ icon, label, value, accent = false }: {
  icon: string; label: string; value: string; accent?: boolean
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: accent ? 'rgba(245,158,11,0.08)' : 'var(--bg-surface)',
        border: `1px solid ${accent ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
      }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold" style={{ color: accent ? '#fbbf24' : 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
