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
  const byXP = [...data].sort((a, b) => b.xp - a.xp)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-8">
          <h1 className="text-xl md:text-2xl font-bold">🏆 Leaderboard</h1>

          {/* XP Rankings — top cards: stack on mobile, row on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {byXP.slice(0, 3).map((u, i) => (
              <div
                key={u.id}
                className={`rounded-2xl p-4 md:p-5 border text-center overflow-hidden ${
                  i === 0 ? 'bg-yellow-950 border-yellow-700' : 'bg-gray-900 border-gray-800'
                }`}
              >
                <div className="text-3xl mb-2">{MEDALS[i] ?? '🎖️'}</div>
                <div className="flex justify-center mb-2">
                  <Avatar username={u.username} size="md" avatarUrl={u.avatar_url} />
                </div>
                <div className="font-bold text-base capitalize truncate px-1">{u.username}</div>
                <div className="my-1 flex justify-center"><LevelBadge level={u.level} /></div>
                <div className="my-1 flex justify-center"><XPBadge xp={u.xp} /></div>
                <div className="text-gray-400 text-xs mt-1 flex justify-center gap-3">
                  <span>🔥 {u.current_streak}d</span>
                  <span>🏆 {u.longest_streak}d</span>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly table */}
          <RankTable title="📅 This Week" entries={byWeekly} valueKey="weekly_sessions" valueLabel="Sessions" />

          {/* Monthly rankings as cards on mobile */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-4">🗓️ This Month</h2>
            <div className="space-y-2">
              {[...data].sort((a, b) => b.monthly_sessions - a.monthly_sessions).map((u, i) => (
                <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 md:px-4 py-3">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{MEDALS[i] ?? '🎖️'}</span>
                    <Avatar username={u.username} size="sm" avatarUrl={u.avatar_url} />
                    <div className="flex flex-col md:flex-row md:items-center md:gap-2 min-w-0">
                      <span className="font-medium capitalize text-sm truncate">{u.username}</span>
                      <LevelBadge level={u.level} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-orange-400 font-bold text-sm">
                      {u.monthly_sessions}{' '}
                      <span className="text-gray-400 font-normal text-xs hidden sm:inline">Sessions</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6">
      <h2 className="text-base md:text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-2">
        {entries.map((u, i) => (
          <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 md:px-4 py-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <span className="text-lg flex-shrink-0">{MEDALS[i] ?? '🎖️'}</span>
              <Avatar username={u.username} size="sm" avatarUrl={u.avatar_url} />
              <div className="flex flex-col md:flex-row md:items-center md:gap-2 min-w-0">
                <span className="font-medium capitalize text-sm truncate">{u.username}</span>
                <LevelBadge level={u.level} />
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <span className="text-gray-400 text-xs hidden sm:inline">🔥 {u.current_streak}d</span>
              <span className="text-orange-400 font-bold text-sm">
                {u[valueKey] as number}{' '}
                <span className="text-gray-400 font-normal text-xs hidden sm:inline">{valueLabel}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
