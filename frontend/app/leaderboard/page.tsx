'use client'
import { useQuery } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import Avatar from '@/components/Avatar'
import { useSSE } from '@/hooks/useSSE'
import api from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

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
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  const byWeekly = [...data].sort((a, b) => b.weekly_sessions - a.weekly_sessions)
  const byMonthly = [...data].sort((a, b) => b.monthly_sessions - a.monthly_sessions)
  const byXP = [...data].sort((a, b) => b.xp - a.xp)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>

          {/* XP Rankings — top cards */}
          <div className="grid grid-cols-3 gap-4">
            {byXP.map((u, i) => (
              <div key={u.id} className={`rounded-2xl p-5 border text-center ${i === 0 ? 'bg-yellow-950 border-yellow-700' : 'bg-gray-900 border-gray-800'}`}>
                <div className="text-3xl mb-2">{MEDALS[i] ?? '🎖️'}</div>
                <div className="flex justify-center mb-2">
                  <Avatar username={u.username} size="md" />
                </div>
                <div className="font-bold text-lg capitalize">{u.username}</div>
                <div className="my-1"><LevelBadge level={u.level} /></div>
                <div className="my-1"><XPBadge xp={u.xp} /></div>
                <div className="text-gray-400 text-xs mt-1 flex justify-center gap-3">
                  <span>🔥 {u.current_streak}d</span>
                  <span>🏆 {u.longest_streak}d</span>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly table */}
          <RankTable title="📅 This Week" entries={byWeekly} valueKey="weekly_sessions" valueLabel="Sessions" />

          {/* Monthly table */}
          <RankTable title="🗓️ This Month" entries={byMonthly} valueKey="monthly_sessions" valueLabel="Sessions" />
        </div>
      </div>
    </AuthGuard>
  )
}

function RankTable({
  title, entries, valueKey, valueLabel,
}: {
  title: string
  entries: LeaderboardEntry[]
  valueKey: keyof LeaderboardEntry
  valueLabel: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-2">
        {entries.map((u, i) => (
          <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">{MEDALS[i] ?? '🎖️'}</span>
              <Avatar username={u.username} size="sm" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium capitalize">{u.username}</span>
                <LevelBadge level={u.level} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">🔥 {u.current_streak}d</span>
              <span className="text-orange-400 font-bold">
                {u[valueKey] as number} <span className="text-gray-400 font-normal text-sm">{valueLabel}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
