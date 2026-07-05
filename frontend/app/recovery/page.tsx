'use client'
import { useQuery } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import AISummaryCard from '@/components/AISummaryCard'
import api from '@/lib/api'

interface MuscleData {
  fatigue_pct: number
  state: 'fresh' | 'training' | 'danger'
  name_en: string
  name_cn: string
  category: string
  half_life_hours: number
}

interface Heatmap {
  [muscle_id: string]: MuscleData
}

interface TodayRec {
  recommendation: string
  suggested_exercises: string[]
  readiness: number | null
}

function getStateColor(state: string) {
  switch (state) {
    case 'fresh':   return { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   text: '#4ade80', label: '恢复中' }
    case 'training':return { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',   text: '#fbbf24', label: '训练中' }
    case 'danger':  return { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',    text: '#f87171', label: '需休息' }
    default:        return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',   text: '#94a3b8', label: '未知' }
  }
}

function getBarColor(pct: number) {
  if (pct <= 20)  return '#4ade80'
  if (pct <= 60)  return '#fbbf24'
  return '#f87171'
}

function MuscleCard({ id, data }: { id: string; data: MuscleData }) {
  const colors = getStateColor(data.state)
  const barColor = getBarColor(data.fatigue_pct)

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-sm">{data.name_cn}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.name_en}</div>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {colors.label}
        </span>
      </div>

      {/* Fatigue bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>疲劳度</span>
          <span style={{ color: colors.text }}>{data.fatigue_pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${data.fatigue_pct}%`, background: barColor }}
          />
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        半衰期 {data.half_life_hours}h
      </div>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  push:   '推 Push',
  pull:   '拉 Pull',
  legs:   '腿 Legs',
  core:   '核心 Core',
  cardio: '心肺 Cardio',
}

export default function RecoveryPage() {
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<{ heatmap: Heatmap }>({
    queryKey: ['recovery-heatmap'],
    queryFn: () => api.get('/coach/recovery-heatmap').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const heatmap = heatmapData?.heatmap || {}

  // Group muscles by category
  const groups: Record<string, Array<[string, MuscleData]>> = {}
  Object.entries(heatmap).forEach(([id, data]) => {
    const cat = data.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push([id, data])
  })

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

          {/* ── AI Today Banner (user-triggered, not on route) ──────── */}
          <AISummaryCard<TodayRec>
            title="今日训练建议"
            badge="AI Coach"
            queryKey={['ai-today']}
            endpoint="/ai/today"
            promptText="根据肌肉恢复状态，获取今日训练建议"
          >
            {(todayData) => (
              <>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {todayData?.recommendation || '暂无建议'}
                </p>
                {todayData?.readiness && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>今日状态：</span>
                    <span className="text-base">
                      {['😴', '😐', '🙂', '💪', '🔥'][todayData.readiness - 1] || '❓'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {todayData.readiness}/5
                    </span>
                  </div>
                )}
              </>
            )}
          </AISummaryCard>

          {/* ── Legend ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span>恢复 (0–20%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span>训练中 (21–60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span>需休息 (61–100%)</span>
            </div>
          </div>

          {/* ── Muscle Groups by Category ────────────────────────────── */}
          {heatmapLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 animate-pulse h-28"
                  style={{ background: 'var(--bg-surface)' }} />
              ))}
            </div>
          ) : Object.keys(heatmap).length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="text-4xl mb-3">💪</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                开始训练后查看肌肉恢复状态
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([category, muscles]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-muted)' }}>
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {muscles.map(([id, data]) => (
                    <MuscleCard key={id} id={id} data={data} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
