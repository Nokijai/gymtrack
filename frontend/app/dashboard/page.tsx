'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import { xpForLevel, xpForNextLevel } from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import Avatar from '@/components/Avatar'
import { useSSE } from '@/hooks/useSSE'
import { useTimerStore } from '@/lib/store'
import api from '@/lib/api'
import type { DashboardStats } from '@/lib/types'

export default function DashboardPage() {
  useSSE()
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const { isRunning } = useTimerStore()

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  })

  if (isLoading || !data) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <Spinner />
        </div>
      </AuthGuard>
    )
  }

  const { user, total_sessions, total_minutes, recent_sessions, weekly_data } = data
  const currentLevelXP = xpForLevel(user.level)
  const nextLevelXP    = xpForNextLevel(user.level)
  const xpInLevel      = user.xp - currentLevelXP
  const xpNeeded       = nextLevelXP - currentLevelXP
  const xpPct          = user.level >= 20 ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  // Highlight the current day in chart
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-8">

          {/* ── Hero: user card ───────────────────────────────────────── */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {/* Subtle accent glow */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)' }} />

            <div className="flex items-center gap-4 relative">
              <Avatar username={user.username} size="lg" avatarUrl={user.avatar_url} />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold capitalize truncate">
                  Hey, {user.username} 👋
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <LevelBadge level={user.level} size="sm" />
                  <XPBadge xp={user.xp} size="sm" />
                </div>

                {/* XP progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{user.level >= 20 ? 'MAX LEVEL' : `${xpInLevel} / ${xpNeeded} XP to Lv.${user.level + 1}`}</span>
                    <span>{xpPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 progress-shimmer"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active workout banner */}
            {isRunning && (
              <Link href="/log" className="flex items-center gap-2 mt-4 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                Workout in progress — tap to resume
              </Link>
            )}
          </div>

          {/* ── Stats grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="💪" label="Total Sessions" value={total_sessions.toString()} />
            <StatCard icon="⏱️" label="Total Hours" value={(total_minutes / 60).toFixed(1)} />
            <StatCard icon="🔥" label="Current Streak" value={`${user.current_streak}d`} accent={user.current_streak > 0} accentColor="#f97316" />
            <StatCard icon="🏆" label="Best Streak" value={`${user.longest_streak}d`} />
          </div>

          {/* ── Weekly bar chart ─────────────────────────────────────── */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              This Week
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekly_data} barGap={4}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text)' }}
                  formatter={(v: any) => [`${v} min`, 'Duration']}
                />
                <Bar dataKey="minutes" radius={[5, 5, 0, 0]} maxBarSize={32}>
                  {weekly_data.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={entry.day === today ? 'var(--accent)' : 'rgba(59,130,246,0.3)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Recent sessions ──────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Recent Sessions
              </h2>
              <Link href="/profile" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View all</Link>
            </div>

            {recent_sessions.length === 0 ? (
              <div className="px-5 pb-5 text-sm" style={{ color: 'var(--text-muted)' }}>
                No sessions yet.{' '}
                <Link href="/log" style={{ color: 'var(--accent)' }}>Log your first one!</Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {recent_sessions.map((s) => (
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

        </div>
      </div>

      <SessionDetailModal sessionId={selectedSession} onClose={() => setSelectedSession(null)} />
    </AuthGuard>
  )
}

function StatCard({
  icon, label, value, accent = false, accentColor
}: {
  icon: string
  label: string
  value: string
  accent?: boolean
  accentColor?: string
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: accent && accentColor
          ? `rgba(${accentColor === '#f97316' ? '249,115,22' : '59,130,246'},0.1)`
          : 'var(--bg-surface)',
        border: `1px solid ${accent && accentColor ? `rgba(${accentColor === '#f97316' ? '249,115,22' : '59,130,246'},0.25)` : 'var(--border)'}`,
      }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold" style={{ color: accent && accentColor ? accentColor : 'var(--text)' }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</span>
    </div>
  )
}
