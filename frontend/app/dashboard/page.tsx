'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import { useSSE } from '@/hooks/useSSE'
import api from '@/lib/api'
import type { DashboardStats } from '@/lib/types'

export default function DashboardPage() {
  useSSE()
  const [selectedSession, setSelectedSession] = useState<number | null>(null)

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
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

  const { user, total_sessions, total_minutes, recent_sessions, weekly_data } = data

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Hey, {user.username} 👋</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <LevelBadge level={user.level} />
                <XPBadge xp={user.xp} />
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Sessions" value={total_sessions.toString()} icon="💪" />
            <StatCard label="Total Hours" value={(total_minutes / 60).toFixed(1)} icon="⏱️" />
            <StatCard label="🔥 Current Streak" value={`${user.current_streak}d`} icon="🔥" highlight={user.current_streak > 0} />
            <StatCard label="🏆 Best Streak" value={`${user.longest_streak}d`} icon="🏆" />
          </div>

          {/* Weekly chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">This Week</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly_data}>
                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(v: any) => [`${v} min`, 'Duration']}
                />
                <Bar dataKey="minutes" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent sessions — clickable */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
            {recent_sessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No sessions yet. <a href="/log" className="text-orange-400 hover:underline">Log your first one!</a></p>
            ) : (
              <div className="space-y-3">
                {recent_sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-xl px-4 py-3 cursor-pointer hover:ring-1 hover:ring-orange-500 transition-all"
                  >
                    <div>
                      <div className="font-medium">{s.date}</div>
                      <div className="text-gray-400 text-sm">
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}{s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-orange-400 font-semibold">{s.duration_minutes} min</div>
                      <span className="text-gray-600 text-xs">›</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-orange-950 border-orange-800' : 'bg-gray-900 border-gray-800'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-white'}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  )
}
