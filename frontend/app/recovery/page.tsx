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
    case 'fresh':    return { bg: 'rgba(34,166,69,0.08)',  border: 'rgba(34,166,69,0.2)',  text: 'var(--green)',  label: '恢復中' }
    case 'training': return { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: 'var(--orange)', label: '訓練中' }
    case 'danger':   return { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  text: 'var(--red)',    label: '需休息' }
    default:         return { bg: 'var(--bg-hover)',        border: 'var(--border)',        text: 'var(--text-muted)', label: '未知' }
  }
}

function getBarColor(pct: number) {
  if (pct <= 20)  return 'var(--green)'
  if (pct <= 60)  return 'var(--orange)'
  return 'var(--red)'
}

function MuscleCard({ id, data }: { id: string; data: MuscleData }) {
  const colors = getStateColor(data.state)
  const barColor = getBarColor(data.fatigue_pct)

  return (
    <div
      className="card p-3 flex flex-col gap-2"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{data.name_cn}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.name_en}</div>
        </div>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          {colors.label}
        </span>
      </div>

      {/* Fatigue bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>疲勞度</span>
          <span style={{ color: colors.text }}>{data.fatigue_pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
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

const READINESS_LABELS = ['Tired', 'Okay', 'Good', 'Great', 'Ready']

export default function RecoveryPage() {
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<{ heatmap: Heatmap }>({
    queryKey: ['recovery-heatmap'],
    queryFn: () => api.get('/coach/recovery-heatmap').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: todayData, isLoading: todayLoading } = useQuery<TodayRec>({
    queryKey: ['ai-today'],
    queryFn: () => api.get('/ai/today').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
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
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)' }}>
        <Nav />

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

          {/* ── Header ─────────────────────────────────────────────── */}
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Recovery
          </h1>

          {/* ── AI Today Card ──────────────────────────────────────── */}
          <AISummaryCard<TodayRec>
            title="今日訓練建議"
            queryKey={['ai-today']}
            endpoint="/ai/today"
            promptText="根據肌肉恢復狀態，獲取今日訓練建議"
          >
            {(todayData) => (
              <>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {todayData?.recommendation || '暫無建議'}
                </p>
                {todayData?.readiness != null && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>今日狀態</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {todayData.readiness}/5 — {READINESS_LABELS[todayData.readiness - 1] || 'Unknown'}
                    </span>
                  </div>
                )}
              </>
            )}
          </AISummaryCard>

          {/* ── Legend ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
              <span>恢復 (0–20%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--orange)' }} />
              <span>訓練中 (21–60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
              <span>需休息 (61–100%)</span>
            </div>
          </div>

          {/* ── Muscle Groups by Category ──────────────────────────── */}
          {heatmapLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card p-3 animate-pulse h-28" />
              ))}
            </div>
          ) : Object.keys(heatmap).length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                開始訓練後查看肌肉恢復狀態
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([category, muscles]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
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
