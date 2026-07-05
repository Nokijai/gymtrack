'use client'
import { useState, useEffect } from 'react'
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
import AISummaryCard from '@/components/AISummaryCard'
import CoachChat from '@/components/CoachChat'
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

const READINESS_EMOJIS = ['😴', '😐', '🙂', '💪', '🔥']
const READINESS_LABELS = ['很疲惫', '普通', '还不错', '很好', '超燃!']
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
      // still close
      localStorage.setItem(READINESS_DATE_KEY, new Date().toDateString())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative rounded-3xl p-7 w-full max-w-sm space-y-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">今日状态如何？</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>帮助AI为你制定最佳训练计划</p>
        </div>

        <div className="flex justify-around py-2">
          {READINESS_EMOJIS.map((emoji, i) => {
            const score = i + 1
            const isSelected = selected === score
            return (
              <button
                key={score}
                onClick={() => setSelected(score)}
                className="flex flex-col items-center gap-1 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-150"
                  style={{
                    background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 16px var(--accent-glow)' : 'none',
                  }}
                >
                  {emoji}
                </div>
                <span className="text-[10px]" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {READINESS_LABELS[i]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={submit}
          disabled={!selected || submitting}
          className="w-full rounded-2xl py-3.5 font-bold transition-all active:scale-95"
          style={{
            background: selected ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            color: selected ? '#fff' : 'var(--text-muted)',
            boxShadow: selected ? '0 6px 20px var(--accent-glow)' : 'none',
          }}
        >
          {submitting ? '保存中...' : '确认 →'}
        </button>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  useSSE()
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [showReadiness, setShowReadiness] = useState(false)
  const { isRunning } = useTimerStore()

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  })

  // Show readiness modal once per day
  useEffect(() => {
    const lastDate = localStorage.getItem(READINESS_DATE_KEY)
    if (lastDate !== new Date().toDateString()) {
      // Small delay so page loads first
      const timer = setTimeout(() => setShowReadiness(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <AuthGuard>
      {showReadiness && <ReadinessModal onClose={() => setShowReadiness(false)} />}

      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-8">

          {/* ── Hero: user card ───────────────────────────────────────── */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
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

                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{user.level >= 20 ? 'MAX LEVEL' : `${xpInLevel} / ${xpNeeded} XP to Lv.${user.level + 1}`}</span>
                    <span>{xpPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-700 progress-shimmer"
                      style={{ width: `${xpPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {isRunning && (
              <Link href="/log" className="flex items-center gap-2 mt-4 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                Workout in progress — tap to resume
              </Link>
            )}
          </div>

          {/* ── AI Train Today Card (user-triggered, not on route) ──── */}
          <AISummaryCard<TodayRec>
            title="今日训练建议"
            queryKey={['ai-today']}
            endpoint="/ai/today"
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            promptText="获取基于你训练记录的今日建议"
          >
            {(todayData) => (
              todayData?.recommendation ? (
                <>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                    {todayData.recommendation}
                  </p>
                  {todayData.suggested_exercises.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {todayData.suggested_exercises.slice(0, 4).map((ex) => (
                        <span key={ex} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                          {ex}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  完成首次训练后获取AI建议 💪
                </p>
              )
            )}
          </AISummaryCard>

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
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text)' }}
                  formatter={(v: any) => [`${v} min`, 'Duration']}
                />
                <Bar dataKey="minutes" radius={[5, 5, 0, 0]} maxBarSize={32}>
                  {weekly_data.map((entry) => (
                    <Cell key={entry.day} fill={entry.day === today ? 'var(--accent)' : 'rgba(59,130,246,0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── AI Weekly Summary (user-triggered, not on route) ─────── */}
          <AISummaryCard<WeeklySummary>
            title="本周总结"
            icon="📊"
            queryKey={['ai-weekly']}
            endpoint="/ai/weekly-summary"
            staleTime={30 * 60 * 1000}
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}
            promptText="查看 AI 对你本周训练的总结"
            buttonText="生成本周总结"
          >
            {(weeklyData) => (
              <>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {weeklyData?.summary_text || '暂无本周数据'}
                </p>
                {weeklyData?.stats && (
                  <div className="mt-3 flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>💪 {weeklyData.stats.total_sessions} sessions</span>
                    <span>⏱ {weeklyData.stats.total_minutes} min</span>
                    <span>🏋️ {weeklyData.stats.total_volume_kg}kg lifted</span>
                  </div>
                )}
              </>
            )}
          </AISummaryCard>

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

      {/* ── AI Coach Chat ────────────────────────────────────────────── */}
      <CoachChat />
    </AuthGuard>
  )
}

function StatCard({ icon, label, value, accent = false, accentColor }: {
  icon: string; label: string; value: string; accent?: boolean; accentColor?: string
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: accent && accentColor ? `rgba(${accentColor === '#f97316' ? '249,115,22' : '59,130,246'},0.1)` : 'var(--bg-surface)',
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
