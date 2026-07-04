'use client'
import { useQuery } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import Avatar from '@/components/Avatar'
import { useSSE } from '@/hooks/useSSE'
import api from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/types'

export default function LeaderboardPage() {
  useSSE()

  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

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
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🏆</span> Leaderboard
          </h1>

          {/* ── Podium (top 3 by XP) ──────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 pt-5 pb-3">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                All-Time XP
              </span>
            </div>

            <div className="flex items-end justify-center gap-2 px-4 pb-6">
              {/* 2nd place */}
              {podium[1] && <PodiumCard entry={podium[1]} place={2} />}
              {/* 1st place */}
              {podium[0] && <PodiumCard entry={podium[0]} place={1} />}
              {/* 3rd place */}
              {podium[2] && <PodiumCard entry={podium[2]} place={3} />}
            </div>

            {/* Everyone below top 3 */}
            {byXP.slice(3).length > 0 && (
              <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
                {byXP.slice(3).map((u, i) => (
                  <RankRow key={u.id} entry={u} rank={i + 4} valueLabel={`${u.xp.toLocaleString()} XP`} />
                ))}
              </div>
            )}
          </div>

          {/* ── This Week ────────────────────────────────────────────────── */}
          <RankSection
            title="📅 This Week"
            entries={byWeekly}
            getValue={(u) => `${u.weekly_sessions} session${u.weekly_sessions !== 1 ? 's' : ''}`}
          />

          {/* ── This Month ───────────────────────────────────────────────── */}
          <RankSection
            title="🗓️ This Month"
            entries={byMonthly}
            getValue={(u) => `${u.monthly_sessions} session${u.monthly_sessions !== 1 ? 's' : ''}`}
          />

        </div>
      </div>
    </AuthGuard>
  )
}

const PLACE_META = [
  { medal: '🥇', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', height: 180 },
  { medal: '🥈', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', height: 156 },
  { medal: '🥉', bg: 'rgba(180,120,40,0.08)',  border: 'rgba(180,120,40,0.2)',  height: 140 },
]

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const meta = PLACE_META[place - 1]
  const order = place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'
  return (
    <div className={`flex-1 max-w-[120px] ${order} rounded-2xl flex flex-col items-center pt-4 pb-3 px-2 transition-all`}
      style={{ background: meta.bg, border: `1px solid ${meta.border}`, height: meta.height, justifyContent: 'flex-end' }}>
      <div className="text-2xl mb-1">{meta.medal}</div>
      <Avatar username={entry.username} size="sm" avatarUrl={entry.avatar_url} />
      <div className="font-bold text-xs capitalize mt-1.5 truncate max-w-full text-center">{entry.username}</div>
      <div className="mt-1"><LevelBadge level={entry.level} size="sm" /></div>
      <div className="mt-1 text-xs font-semibold" style={{ color: '#fbbf24' }}>
        {entry.xp.toLocaleString()} XP
      </div>
      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        🔥{entry.current_streak}d
      </div>
    </div>
  )
}

function RankSection({
  title, entries, getValue
}: {
  title: string
  entries: LeaderboardEntry[]
  getValue: (e: LeaderboardEntry) => string
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {title}
        </h2>
      </div>
      <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
        {entries.map((u, i) => (
          <RankRow key={u.id} entry={u} rank={i + 1} valueLabel={getValue(u)} />
        ))}
      </div>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

function RankRow({ entry, rank, valueLabel }: { entry: LeaderboardEntry; rank: number; valueLabel: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="text-lg w-7 text-center flex-shrink-0">
        {rank <= 3 ? MEDALS[rank - 1] : <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>#{rank}</span>}
      </div>
      <Avatar username={entry.username} size="sm" avatarUrl={entry.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm capitalize truncate">{entry.username}</div>
        <div className="mt-0.5">
          <LevelBadge level={entry.level} size="sm" />
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{valueLabel}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🔥 {entry.current_streak}d</span>
      </div>
    </div>
  )
}
