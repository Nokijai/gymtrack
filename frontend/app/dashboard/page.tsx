'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import LevelBadge from '@/components/LevelBadge'
import { xpForLevel, xpForNextLevel } from '@/components/LevelBadge'
import XPBadge from '@/components/XPBadge'
import SessionDetailModal from '@/components/SessionDetailModal'
import Avatar from '@/components/Avatar'
import AISummaryCard from '@/components/AISummaryCard'
import CoachChat from '@/components/CoachChat'
import BadgeUnlockPopup from '@/components/BadgeUnlockPopup'
import { useSSE } from '@/hooks/useSSE'
import { useTimerStore } from '@/lib/store'
import api from '@/lib/api'
import type { DashboardStats } from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TodayRec {
  recommendation: string
  heatmap_summary: Record<string, { state: string; name_en: string; name_cn: string; fatigue_pct: number }>
  suggested_exercises: string[]
  readiness: number | null
}

interface WeeklySummary {
  summary_text: string
  stats: {
    total_sessions: number
    total_minutes: number
    total_volume_kg: number
    xp: number
    level: number
    streak: number
  }
}

const READINESS_LABELS = ['Tired', 'Okay', 'Good', 'Great', 'Ready']
const READINESS_DATE_KEY = 'gymtrack_readiness_date'

// ─── Readiness Modal ─────────────────────────────────────────────────────────
function ReadinessModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    try {
      await api.post('/readiness', { score: selected })
      localStorage.setItem(READINESS_DATE_KEY, new Date().toDateString())
      onClose()
    } catch {
      localStorage.setItem(READINESS_DATE_KEY, new Date().toDateString())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative rounded-lg p-6 w-full max-w-sm"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold mb-1">How are you feeling today?</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Helps us recommend the right workout
        </p>

        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4, 5].map((score) => {
            const isSelected = selected === score
            return (
              <button
                key={score}
                onClick={() => setSelected(score)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all"
                  style={{
                    background: isSelected ? 'var(--accent)' : 'var(--bg-hover)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: isSelected ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {score}
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {READINESS_LABELS[score - 1]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={submit}
          disabled={!selected || submitting}
          className="btn btn-primary w-full py-2"
          style={{ opacity: !selected || submitting ? 0.5 : 1 }}
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  useSSE()
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [showReadiness, setShowReadiness] = useState(false)
  const { isRunning } = useTimerStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  })

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<WeeklySummary>({
    queryKey: ['ai-weekly'],
    queryFn: () => api.get('/ai/weekly-summary').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  // Show readiness modal once per day
  useEffect(() => {
    const lastDate = localStorage.getItem(READINESS_DATE_KEY)
    if (lastDate !== new Date().toDateString()) {
      const timer = setTimeout(() => setShowReadiness(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  if (isLoading || !data) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      </AuthGuard>
    )
  }

  const { user, total_sessions, total_minutes, recent_sessions, weekly_data } = data
  const currentLevelXP = xpForLevel(user.level)
  const nextLevelXP = xpForNextLevel(user.level)
  const xpInLevel = user.xp - currentLevelXP
  const xpNeeded = nextLevelXP - currentLevelXP
  const xpPct = user.level >= 50 ? 100 : Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <AuthGuard>
      {showReadiness && <ReadinessModal onClose={() => setShowReadiness(false)} />}
      <BadgeUnlockPopup />

      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)' }}>
        <Nav />

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-12">

          {/* ── User card ──────────────────────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <Avatar username={user.username} size="md" avatarUrl={user.avatar_url} />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold truncate capitalize" style={{ color: 'var(--text)' }}>
                  {user.username}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <LevelBadge level={user.level} size="sm" />
                  <XPBadge xp={user.xp} size="sm" />
                </div>
              </div>
              <Link href="/log" className="btn btn-primary text-xs" style={{ padding: '5px 10px' }}>
                Log workout
              </Link>
            </div>

            {/* XP bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {user.level >= 50
                    ? 'Max level'
                    : `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
                </span>
                <span>{xpPct}%</span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-hover)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${xpPct}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
            </div>

            {/* Active timer banner */}
            {isRunning && (
              <Link
                href="/log"
                className="flex items-center gap-2 mt-3 rounded-md px-3 py-2 text-xs font-medium"
                style={{
                  background: 'rgba(34,166,69,0.1)',
                  border: '1px solid rgba(34,166,69,0.2)',
                  color: 'var(--green)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                Workout in progress — tap to resume
              </Link>
            )}
          </div>

          {/* ── AI Today Card ──────────────────────────────────────── */}
          <AISummaryCard<TodayRec>
            title="Today's recommendation"
            queryKey={['ai-today']}
            endpoint="/ai/today"
            className="card p-4"
            promptText="Get AI recommendations based on your training history"
          >
            {(todayData) =>
              todayData?.recommendation ? (
                <>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {todayData.recommendation}
                  </p>
                  {todayData.suggested_exercises.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {todayData.suggested_exercises.slice(0, 4).map((ex) => (
                        <span
                          key={ex}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: 'rgba(34,166,69,0.1)',
                            color: 'var(--green)',
                            border: '1px solid rgba(34,166,69,0.2)',
                          }}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Complete your first workout to get AI recommendations.
                </p>
              )
            }
          </AISummaryCard>

          {/* ── Stats grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Sessions" value={total_sessions.toString()} />
            <StatCard label="Hours" value={(total_minutes / 60).toFixed(1)} />
            <StatCard
              label="Streak"
              value={`${user.current_streak}d`}
              accent={user.current_streak > 0}
            />
            <StatCard label="Best streak" value={`${user.longest_streak}d`} />
          </div>

          {/* ── Weekly bar chart ───────────────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                This week
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {weekly_data.reduce((sum, d) => sum + d.minutes, 0)} min
              </span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekly_data} barGap={4}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    boxShadow: 'var(--shadow-md)',
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                  formatter={(v: any) => [`${v} min`, 'Duration']}
                />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {weekly_data.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill={entry.day === today ? 'var(--accent)' : 'var(--bg-hover)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── AI Weekly Summary ──────────────────────────────────── */}
          <AISummaryCard<WeeklySummary>
            title="Weekly summary"
            queryKey={['ai-weekly']}
            endpoint="/ai/weekly-summary"
            staleTime={30 * 60 * 1000}
            className="card p-4"
            promptText="Generate an AI summary of your week"
            buttonText="Generate summary"
          >
            {(wd) => (
              <>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {wd?.summary_text || 'No data this week yet.'}
                </p>
                {wd?.stats && (
                  <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{wd.stats.total_sessions} sessions</span>
                    <span>{wd.stats.total_minutes} min</span>
                    <span>{wd.stats.total_volume_kg.toLocaleString()} kg</span>
                  </div>
                )}
              </>
            )}
          </AISummaryCard>

          {/* ── Recent sessions ────────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Recent sessions
              </h2>
              <Link href="/profile" className="text-xs link">
                View all
              </Link>
            </div>

            {recent_sessions.length === 0 ? (
              <div className="px-4 pb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                No sessions yet.{' '}
                <Link href="/log" style={{ color: 'var(--accent)' }}>
                  Log your first one
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {recent_sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="text-sm font-medium">{s.date}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''}
                        {s.notes ? ` · ${s.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {s.duration_minutes}m
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
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
      <CoachChat />
    </AuthGuard>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className="card p-4"
      style={accent ? { borderColor: 'rgba(94,106,210,0.2)' } : {}}
    >
      <div
        className="text-lg font-semibold"
        style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  )
}