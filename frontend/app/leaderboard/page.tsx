'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import Avatar from '@/components/Avatar'
import SessionDetailModal from '@/components/SessionDetailModal'
import { useSSE } from '@/hooks/useSSE'
import api from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/types'

export default function LeaderboardPage() {
  useSSE()
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [viewUser, setViewUser] = useState<LeaderboardEntry | null>(null)
  const [userSessions, setUserSessions] = useState<{ id: number; date: string; duration_minutes: number; exercises: { name: string }[] }[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

  async function handleViewUser(entry: LeaderboardEntry) {
    setViewUser(entry)
    setSelectedUserId(entry.id)
    setLoadingSessions(true)
    try {
      const res = await api.get(`/sessions?limit=20&user_id=${entry.id}`)
      setUserSessions(res.data)
    } catch {
      setUserSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  if (isLoading || !data) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      </AuthGuard>
    )
  }

  const byXP      = [...data].sort((a, b) => b.xp - a.xp)
  const byWeekly  = [...data].sort((a, b) => b.weekly_sessions - a.weekly_sessions)
  const byMonthly = [...data].sort((a, b) => b.monthly_sessions - a.monthly_sessions)

  const podium = byXP.slice(0, 3)

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-xl mx-auto px-4 py-6 pb-8 space-y-6">

          {/* Header */}
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Leaderboard
          </h1>

          {/* Podium (top 3 by XP) */}
          <div className="card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                All-Time XP
              </span>
            </div>

            <div className="flex items-end justify-center gap-2 px-4 pb-6">
              {podium[1] && <PodiumCard entry={podium[1]} place={2} onViewUser={handleViewUser} />}
              {podium[0] && <PodiumCard entry={podium[0]} place={1} onViewUser={handleViewUser} />}
              {podium[2] && <PodiumCard entry={podium[2]} place={3} onViewUser={handleViewUser} />}
            </div>

            {byXP.slice(3).length > 0 && (
              <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
                {byXP.slice(3).map((u, i) => (
                  <RankRow key={u.id} entry={u} rank={i + 4} valueLabel={`${u.xp.toLocaleString()} XP`} onViewUser={handleViewUser} />
                ))}
              </div>
            )}
          </div>

          {/* This Week */}
          <RankSection
            title="This Week"
            entries={byWeekly}
            getValue={(u) => `${u.weekly_sessions} session${u.weekly_sessions !== 1 ? 's' : ''}`}
            onViewUser={handleViewUser}
          />

          {/* This Month */}
          <RankSection
            title="This Month"
            entries={byMonthly}
            getValue={(u) => `${u.monthly_sessions} session${u.monthly_sessions !== 1 ? 's' : ''}`}
            onViewUser={handleViewUser}
          />

        </div>
      </div>

      {/* User Sessions Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setViewUser(null); setSelectedUserId(null); setUserSessions([]) }}>
          <div className="w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <h2 className="font-bold text-base capitalize">{viewUser.username}'s Sessions</h2>
              <button onClick={() => { setViewUser(null); setSelectedUserId(null); setUserSessions([]) }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4">
              {loadingSessions ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                </div>
              ) : userSessions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {userSessions.map((s) => (
                    <button key={s.id}
                      onClick={() => setSelectedSession(s.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors hover:bg-white/[0.03]"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="font-semibold text-sm">{s.date}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {s.exercises?.length || 0} exercise{(s.exercises?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>{s.duration_minutes}m</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SessionDetailModal sessionId={selectedSession} userId={selectedUserId} onClose={() => setSelectedSession(null)} />
    </AuthGuard>
  )
}

const PLACE_META = [
  { label: '1st', border: 'rgba(245,158,11,0.3)', height: 180 },
  { label: '2nd', border: 'rgba(148,163,184,0.2)', height: 156 },
  { label: '3rd', border: 'rgba(180,120,40,0.2)',  height: 140 },
]

function PodiumCard({ entry, place, onViewUser }: { entry: LeaderboardEntry; place: 1 | 2 | 3; onViewUser: (e: LeaderboardEntry) => void }) {
  const meta = PLACE_META[place - 1]
  const order = place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'
  return (
    <button className={`flex-1 max-w-[120px] ${order} rounded-lg flex flex-col items-center pt-4 pb-3 px-2 transition-all hover:scale-105`}
      style={{ background: 'var(--bg-elevated)', border: `1px solid ${meta.border}`, height: meta.height, justifyContent: 'flex-end' }}>
      <div className="text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{meta.label}</div>
      <Avatar username={entry.username} size="sm" avatarUrl={entry.avatar_url} />
      <div className="font-bold text-xs capitalize mt-1.5 truncate max-w-full text-center">{entry.username}</div>
      <div className="mt-1"><LevelBadge level={entry.level} size="sm" /></div>
      <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
        {entry.xp.toLocaleString()} XP
      </div>
      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {entry.current_streak}d streak
      </div>
    </button>
  )
}

function RankSection({
  title, entries, getValue, onViewUser
}: {
  title: string
  entries: LeaderboardEntry[]
  getValue: (e: LeaderboardEntry) => string
  onViewUser: (e: LeaderboardEntry) => void
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h2>
      </div>
      <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
        {entries.map((u, i) => (
          <RankRow key={u.id} entry={u} rank={i + 1} valueLabel={getValue(u)} onViewUser={onViewUser} />
        ))}
      </div>
    </div>
  )
}

function RankRow({ entry, rank, valueLabel, onViewUser }: { entry: LeaderboardEntry; rank: number; valueLabel: string; onViewUser: (e: LeaderboardEntry) => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-7 text-center flex-shrink-0">
        {rank <= 3 ? (
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--accent)' }}>
            {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
          </span>
        ) : (
          <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>#{rank}</span>
        )}
      </div>
      <Avatar username={entry.username} size="sm" avatarUrl={entry.avatar_url} />
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onViewUser(entry)}
          className="font-semibold text-sm capitalize truncate text-left hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {entry.username}
        </button>
        <div className="mt-0.5">
          <LevelBadge level={entry.level} size="sm" />
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{valueLabel}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.current_streak}d streak</span>
      </div>
    </div>
  )
}