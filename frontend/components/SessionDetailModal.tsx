'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SetDetail {
  id: number
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_min: number | null
  distance_km: number | null
  notes: string | null
}

interface ExerciseDetail {
  id: number
  name: string
  name_cn: string | null
  sets: number
  reps: number
  weight_kg: number | null
  set_list: SetDetail[]
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function setLabel(s: SetDetail): string {
  const parts: string[] = []
  if (s.weight_kg != null) parts.push(`${s.weight_kg}kg`)
  else if (s.reps != null) parts.push('BW')
  if (s.reps != null) parts.push(`×${s.reps}`)
  if (s.duration_min != null) parts.push(`${s.duration_min}min`)
  if (s.distance_km != null) parts.push(`${s.distance_km}km`)
  if (s.notes) parts.push(`(${s.notes})`)
  return parts.join(' ') || '—'
}

function calcVolume(sets: SetDetail[]): number | null {
  let total = 0
  let any = false
  for (const s of sets) {
    if (s.weight_kg != null && s.reps != null) {
      total += s.weight_kg * s.reps
      any = true
    }
  }
  return any ? total : null
}

// Emoji map for categories (best effort by exercise name keywords)
function exerciseEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('squat') || n.includes('蹲')) return '🦵'
  if (n.includes('pull') || n.includes('row') || n.includes('拉') || n.includes('划')) return '🏋️'
  if (n.includes('press') || n.includes('推') || n.includes('bench')) return '💪'
  if (n.includes('curl') || n.includes('弯举')) return '💪'
  if (n.includes('run') || n.includes('jog') || n.includes('跑') || n.includes('cardio') || n.includes('bike')) return '🏃'
  if (n.includes('plank') || n.includes('crunch') || n.includes('core') || n.includes('腹')) return '🔥'
  if (n.includes('dead') || n.includes('硬举')) return '🏋️'
  return '💪'
}

export default function SessionDetailModal({ sessionId, onClose }: Props) {
  const { user } = useAuthStore()
  const [detail, setDetail]   = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (sessionId === null) { setDetail(null); return }
    setLoading(true); setError('')
    api.get(`/sessions/${sessionId}`)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load session details'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (sessionId === null) return null

  // Compute totals
  const totalVolume = detail
    ? detail.exercises.reduce((acc, ex) => {
        const v = calcVolume(ex.set_list)
        return v != null ? acc + v : acc
      }, 0)
    : 0
  const anyVolume = detail?.exercises.some((ex) => calcVolume(ex.set_list) != null)

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
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <h2 className="font-bold text-base">Session Details</h2>
          <div className="flex items-center gap-2">
            {/* Edit button — everyone can edit their own sessions */}
            <button
              onClick={() => {
                if (detail) {
                  setEditDate(detail.date)
                  setEditDuration(String(detail.duration_minutes))
                  setEditing(!editing)
                }
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-xs font-bold"
              style={{
                color: editing ? '#fff' : 'var(--text-muted)',
                background: editing ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              }}
              title={editing ? 'Cancel edit' : 'Edit session'}
            >
              {editing ? '✕' : '✏️'}
            </button>
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
        </div>

        <div className="p-5">
          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {/* Error */}
          {error && <div className="text-red-400 text-center py-6 text-sm">{error}</div>}

          {detail && !loading && (
            <>
              {/* Meta pills */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <MetaPill label="Date"     value={detail.date} />
                <MetaPill label="Duration" value={formatDuration(detail.duration_minutes)} accent="var(--accent)" />
                <MetaPill label="XP"       value={`⚡ ${detail.xp_earned}`} accent="#fbbf24" />
              </div>

              {/* Exercises grouped view */}
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Exercises
              </h3>

              {detail.exercises.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No exercises recorded</p>
              ) : (
                <div className="space-y-3">
                  {detail.exercises.map((ex) => {
                    const cnName = ex.name_cn && ex.name_cn !== ex.name ? ex.name_cn : null
                    const displayName = cnName ?? ex.name
                    const subName = cnName ? ex.name : null
                    const emoji = exerciseEmoji(ex.name)
                    const vol = calcVolume(ex.set_list)
                    // Build set display — prefer set_list granular, fall back to legacy
                    const hasSets = ex.set_list && ex.set_list.length > 0

                    return (
                      <div
                        key={ex.id}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      >
                        {/* Exercise header */}
                        <div className="flex items-start gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-lg mt-0.5 flex-shrink-0">{emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm leading-tight">{displayName}</div>
                            {subName && (
                              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subName}</div>
                            )}
                          </div>
                        </div>

                        {/* Sets */}
                        <div className="px-4 py-2 space-y-1.5">
                          {hasSets ? (
                            ex.set_list.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 text-sm">
                                <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                  Set {s.set_number}
                                </span>
                                <span style={{ color: 'var(--text)' }}>{setLabel(s)}</span>
                              </div>
                            ))
                          ) : (
                            // Legacy single-row display
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                {ex.sets} sets
                              </span>
                              <span style={{ color: 'var(--text)' }}>
                                {ex.sets}×{ex.reps}
                                {ex.weight_kg != null ? ` @ ${ex.weight_kg}kg` : ' BW'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Volume footer */}
                        <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Total volume:{' '}
                            <span className="font-semibold" style={{ color: vol != null ? 'var(--text)' : 'var(--text-muted)' }}>
                              {vol != null ? `${vol.toLocaleString()} kg` : '—'}
                            </span>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Session summary footer */}
              <div
                className="mt-5 rounded-xl p-4 grid grid-cols-3 gap-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <SummaryItem
                  label="Duration"
                  value={formatDuration(detail.duration_minutes)}
                  accent="var(--accent)"
                />
                <SummaryItem
                  label="Total Volume"
                  value={anyVolume ? `${totalVolume.toLocaleString()} kg` : '—'}
                />
                <SummaryItem
                  label="XP Earned"
                  value={`⚡ ${detail.xp_earned}`}
                  accent="#fbbf24"
                />
              </div>

              async function handleSaveEdit() {
              if (!detail) return
              setSaving(true)
              try {
                await api.patch(`/sessions/${detail.id}`, {
                  date: editDate,
                  duration_minutes: parseInt(editDuration) || 1,
                  exercises: detail.exercises.map(ex => ({
                    name: ex.name,
                    name_cn: ex.name_cn || '',
                    sets: ex.sets,
                    reps: ex.reps,
                    weight_kg: ex.weight_kg,
                    set_list: ex.set_list.map(s => ({
                      set_number: s.set_number,
                      weight_kg: s.weight_kg,
                      reps: s.reps,
                      duration_min: s.duration_min,
                      distance_km: s.distance_km,
                      notes: s.notes,
                    })),
                  })),
                })
                // Refresh detail
                const r = await api.get(`/sessions/${detail.id}`)
                setDetail(r.data)
                setEditing(false)
              } catch {
                setError('Failed to save changes')
              } finally {
                setSaving(false)
              }
            }

            {/* Edit form */}
            {editing && (
              <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Edit Session</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm border"
                      style={{ background: 'var(--bg-base)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Duration (min)</label>
                    <input
                      type="number"
                      value={editDuration}
                      onChange={e => setEditDuration(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm border"
                      style={{ background: 'var(--bg-base)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="w-full rounded-xl py-2.5 text-sm font-bold transition-all"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-colors"
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetaPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold text-sm" style={{ color: accent ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="text-center">
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold text-sm" style={{ color: accent ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}
