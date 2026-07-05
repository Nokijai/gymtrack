'use client'

import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface AISummaryCardProps<T> {
  title: string
  icon?: string
  badge?: string
  queryKey: string[]
  endpoint: string
  staleTime?: number
  promptText?: string
  buttonText?: string
  className?: string
  style?: React.CSSProperties
  children: (data: T | undefined, isLoading: boolean) => ReactNode
}

// User-triggered AI fetch — avoids hitting /ai/* on every page navigation.
export default function AISummaryCard<T>({
  title,
  icon = '🤖',
  badge,
  queryKey,
  endpoint,
  staleTime = 10 * 60 * 1000,
  promptText = '点击获取 AI 分析与建议',
  buttonText = '获取 AI 建议',
  className = 'rounded-2xl p-5 relative overflow-hidden',
  style,
  children,
}: AISummaryCardProps<T>) {
  const [requested, setRequested] = useState(false)

  const { data, isFetching, isError, refetch } = useQuery<T>({
    queryKey,
    queryFn: () => api.get(endpoint).then((r) => r.data),
    enabled: requested,
    staleTime,
    retry: false,
  })

  return (
    <div className={className} style={style ?? { background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h2 className="font-bold text-base">{title}</h2>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}>
            {badge}
          </span>
        )}
      </div>

      {!requested ? (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{promptText}</p>
          <button
            onClick={() => setRequested(true)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 14px var(--accent-glow)' }}
          >
            {buttonText}
          </button>
        </div>
      ) : isFetching ? (
        <div className="space-y-2">
          <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: '85%' }} />
          <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: '70%' }} />
          <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: '55%' }} />
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: '#f87171' }}>AI 建议加载失败，请稍后再试</p>
          <button
            onClick={() => refetch()}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            重试
          </button>
        </div>
      ) : (
        children(data, isFetching)
      )}
    </div>
  )
}
