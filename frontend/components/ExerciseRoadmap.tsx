'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import api from '@/lib/api'

interface HistoryPoint {
  date: string
  volume: number
  max_weight: number
  total_reps: number
  sets: number
}

interface ExerciseData {
  name: string
  name_cn: string
  muscle_group: string
  muscle_group_cn: string
  category: string
  history: HistoryPoint[]
}

interface ExerciseHistory {
  groups: Record<string, ExerciseData[]>
  muscle_groups: Record<string, { name_en: string; name_cn: string; category: string }>
}

const CATEGORY_LABELS: Record<string, { en: string; cn: string }> = {
  push:   { en: 'Push',  cn: '推' },
  pull:   { en: 'Pull',  cn: '拉' },
  legs:   { en: 'Legs',  cn: '腿' },
  core:   { en: 'Core',  cn: '核心' },
  cardio: { en: 'Cardio', cn: '心肺' },
  other:  { en: 'Other', cn: '其他' },
}

const CATEGORY_COLORS: Record<string, string> = {
  push:   '#f97316',
  pull:   '#3b82f6',
  legs:   '#22c55e',
  core:   '#a855f7',
  cardio: '#ef4444',
  other:  '#94a3b8',
}

type ChartMode = 'volume' | 'max_weight'

function ExerciseChart({ data, color }: { data: HistoryPoint[]; color: string }) {
  const [mode, setMode] = useState<ChartMode>('volume')

  if (data.length === 0) return <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No data</div>

  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

  const dataKey = mode === 'volume' ? 'volume' : 'max_weight'

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setMode('volume')}
          className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
          style={{
            background: mode === 'volume' ? color : 'rgba(255,255,255,0.06)',
            color: mode === 'volume' ? '#fff' : 'var(--text-muted)',
          }}
        >
          Volume
        </button>
        <button
          onClick={() => setMode('max_weight')}
          className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
          style={{
            background: mode === 'max_weight' ? color : 'rgba(255,255,255,0.06)',
            color: mode === 'max_weight' ? '#fff' : 'var(--text-muted)',
          }}
        >
          Max Weight
        </button>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
            contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(v: any) => [typeof v === 'number' ? v.toFixed(1) : v, mode === 'volume' ? 'Volume' : 'Max Wt']}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, stroke: 'none' }}
            activeDot={{ r: 5, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ExerciseCard({ ex, color }: { ex: ExerciseData; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const latest = ex.history[ex.history.length - 1]
  const total = ex.history.reduce((s, h) => s + h.volume, 0)

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{ex.name_cn}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ex.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {latest && (
            <div className="text-right">
              <div className="text-xs font-bold" style={{ color }}>
                {latest.max_weight}kg
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>latest</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs font-bold">{total.toLocaleString()}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>total</div>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          {ex.history.length >= 2 ? (
            <ExerciseChart data={ex.history} color={color} />
          ) : (
            <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              Need at least 2 sessions to show trend
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ExerciseRoadmap() {
  const { data, isLoading } = useQuery<ExerciseHistory>({
    queryKey: ['exercise-history'],
    queryFn: () => api.get('/profile/exercise-history').then((r) => r.data),
    staleTime: 30 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 rounded-lg animate-pulse w-1/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
    )
  }

  if (!data || Object.keys(data.groups).length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Start logging workouts to see your exercise history
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(data.groups).map(([category, exercises]) => {
        const label = CATEGORY_LABELS[category] || { en: category, cn: category }
        const color = CATEGORY_COLORS[category] || '#94a3b8'

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <h3 className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}>
                {label.cn} / {label.en}
              </h3>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {exercises.map((ex) => (
                <ExerciseCard key={ex.name} ex={ex} color={color} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}