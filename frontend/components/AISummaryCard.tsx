'use client'

import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface AISummaryCardProps<T> {
  title: string
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
  queryKey,
  endpoint,
  staleTime = 10 * 60 * 1000,
  promptText = 'Click to get AI recommendations',
  buttonText = 'Generate',
  className = 'card p-4 relative overflow-hidden',
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
    <div className={className} style={style}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h2>
        {!requested && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-muted)',
            }}
          >
            AI
          </span>
        )}
      </div>

      {!requested ? (
        <div className="space-y-2.5">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {promptText}
          </p>
          <button
            onClick={() => setRequested(true)}
            className="btn btn-primary text-xs"
          >
            {buttonText}
          </button>
        </div>
      ) : isFetching ? (
        <div className="space-y-1.5">
          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '85%' }} />
          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '70%' }} />
          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '55%' }} />
        </div>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--red)' }}>
            Failed to load. Please try again.
          </p>
          <button onClick={() => refetch()} className="btn btn-ghost text-xs">
            Retry
          </button>
        </div>
      ) : (
        children(data, isFetching)
      )}
    </div>
  )
}