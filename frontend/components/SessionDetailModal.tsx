'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface ExerciseDetail {
  id: number
  name: string
  sets: number
  reps: number
  weight_kg: number | null
}

interface SessionDetail {
  id: number
  date: string
  duration_minutes: number
  xp_earned: number
  exercises: ExerciseDetail[]
}

interface Props {
  sessionId: number | null
  onClose: () => void
}

export default function SessionDetailModal({ sessionId, onClose }: Props) {
  const [detail, setDetail]   = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (sessionId === null) { setDetail(null); return }
    setLoading(true); setError('')
    api.get(`/sessions/${sessionId}`)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load session details'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (sessionId === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-base">Session Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-center py-6 text-sm">{error}</div>
          )}

          {detail && !loading && (
            <>
              {/* Meta pills */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <MetaPill label="Date" value={detail.date} />
                <MetaPill label="Duration" value={`${detail.duration_minutes} min`} accent="var(--accent)" />
                <MetaPill label="XP Earned" value={`⚡ ${detail.xp_earned}`} accent="#fbbf24" />
              </div>

              {/* Exercises */}
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Exercises
              </h3>

              {detail.exercises.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No exercises recorded</p>
              ) : (
                <div className="space-y-2">
                  {detail.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <span className="font-medium text-sm">{ex.name}</span>
                      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span>{ex.sets}×{ex.reps}</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                          {ex.weight_kg != null ? `${ex.weight_kg} kg` : 'BW'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl py-3 text-sm font-semibold transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold text-sm" style={{ color: accent ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}
