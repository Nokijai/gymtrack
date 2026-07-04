'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import ExercisePicker, { type SelectedExercise } from '@/components/ExercisePicker'
import { useTimerStore } from '@/lib/store'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SetRow {
  id: string          // local temp id
  weight_kg: string
  reps: string
  duration_min: string
  distance_km: string
  notes: string
}

interface ExerciseEntry {
  id: string          // local temp id
  nameEn: string
  nameCn: string
  isCustom?: boolean
  // Which fields to show
  showWeight: boolean
  showReps: boolean
  showDuration: boolean
  showDistance: boolean
  showNotes: boolean
  sets: SetRow[]
}

const HOLD_DURATION = 5000
type Phase = 'idle' | 'active' | 'saving' | 'saved'
const EXERCISES_KEY = 'gymtrack_exercises_v2'

function makeSetRow(): SetRow {
  return { id: `s_${Date.now()}_${Math.random()}`, weight_kg: '', reps: '', duration_min: '', distance_km: '', notes: '' }
}

function makeEntry(ex: SelectedExercise): ExerciseEntry {
  return {
    id: `e_${Date.now()}_${Math.random()}`,
    nameEn: ex.nameEn,
    nameCn: ex.nameCn,
    isCustom: ex.isCustom,
    showWeight: true,
    showReps: true,
    showDuration: false,
    showDistance: false,
    showNotes: false,
    sets: [makeSetRow()],
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  return [m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { isRunning, startTimestamp, elapsed, startTimer, syncElapsed, stopTimer } = useTimerStore()
  const [phase, setPhase] = useState<Phase>(() => (isRunning ? 'active' : 'idle'))
  const [pickerOpen, setPickerOpen] = useState(false)

  const [exercises, setExercises] = useState<ExerciseEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem(EXERCISES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { sessionStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises)) } catch {}
  }, [exercises])

  const exercisesRef = useRef<ExerciseEntry[]>([])
  useEffect(() => { exercisesRef.current = exercises }, [exercises])

  // ── Timer tick ───────────────────────────────────────────────────────────
  const rafRef2 = useRef<number | null>(null)
  useEffect(() => {
    if (!isRunning) return
    syncElapsed()
    const tick = () => { syncElapsed(); rafRef2.current = requestAnimationFrame(tick) }
    rafRef2.current = requestAnimationFrame(tick)
    const onVisible = () => { if (!document.hidden) syncElapsed() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [isRunning, syncElapsed])

  useEffect(() => {
    if (isRunning && phase === 'idle') setPhase('active')
  }, [isRunning, phase])

  // ── Hold-to-confirm ───────────────────────────────────────────────────────
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const holdRafRef   = useRef<number | null>(null)
  const didFire      = useRef(false)

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/sessions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      stopTimer()
      try { sessionStorage.removeItem(EXERCISES_KEY) } catch {}
      setPhase('saved')
      setTimeout(() => router.push('/dashboard'), 1800)
    },
    onError: () => { setPhase('active') },
  })

  function startWorkout() {
    startTimer()
    setExercises([])
    setPhase('active')
  }

  function buildPayload() {
    const stopTime = Date.now()
    const start    = startTimestamp ?? (stopTime - elapsed * 1000)
    const duration_minutes = Math.max(1, Math.round((stopTime - start) / 60_000))
    const date = new Date(start).toISOString().split('T')[0]
    return {
      date,
      duration_minutes,
      exercises: exercisesRef.current
        .filter((ex) => ex.nameEn.trim() || ex.nameCn.trim())
        .map((ex) => ({
          name:     ex.nameEn || ex.nameCn,
          name_cn:  ex.nameCn || ex.nameEn,
          sets:     ex.sets.length,
          reps:     parseInt(ex.sets[0]?.reps) || 1,
          weight_kg: parseFloat(ex.sets[0]?.weight_kg) || null,
          set_list: ex.sets
            .filter((s) => s.reps || s.weight_kg || s.duration_min || s.distance_km)
            .map((s, i) => ({
              set_number:   i + 1,
              weight_kg:    s.weight_kg   ? parseFloat(s.weight_kg)   : null,
              reps:         s.reps        ? parseInt(s.reps)          : null,
              duration_min: s.duration_min ? parseFloat(s.duration_min) : null,
              distance_km:  s.distance_km  ? parseFloat(s.distance_km)  : null,
              notes:        s.notes || null,
            })),
        })),
    }
  }

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (phase !== 'active') return
    didFire.current = false
    setIsHolding(true)
    holdStartRef.current = Date.now()
    const tick = () => {
      if (!holdStartRef.current) return
      const ms  = Date.now() - holdStartRef.current
      const pct = Math.min((ms / HOLD_DURATION) * 100, 100)
      setHoldProgress(pct)
      if (pct < 100) {
        holdRafRef.current = requestAnimationFrame(tick)
      } else {
        if (!didFire.current) {
          didFire.current = true
          setPhase('saving')
          mutation.mutate(buildPayload())
        }
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }, [phase]) // eslint-disable-line

  const stopHold = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current)
    holdStartRef.current = null
    setIsHolding(false)
    setHoldProgress(0)
  }, [])

  // ── Exercise / Set mutations ──────────────────────────────────────────────
  function addExercise(ex: SelectedExercise) {
    setExercises((prev) => [...prev, makeEntry(ex)])
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  function toggleField(exId: string, field: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>) {
    setExercises((prev) =>
      prev.map((e) => e.id === exId ? { ...e, [field]: !e[field] } : e)
    )
  }

  function addSet(exId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        // Copy last set values as template
        const lastSet = e.sets[e.sets.length - 1]
        const newSet: SetRow = {
          ...makeSetRow(),
          weight_kg: lastSet?.weight_kg ?? '',
          reps: lastSet?.reps ?? '',
        }
        return { ...e, sets: [...e.sets, newSet] }
      })
    )
  }

  function removeSet(exId: string, setId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        if (e.sets.length <= 1) return e // keep at least 1 set
        return { ...e, sets: e.sets.filter((s) => s.id !== setId) }
      })
    )
  }

  function updateSet(exId: string, setId: string, field: keyof SetRow, value: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, [field]: value } : s
          ),
        }
      })
    )
  }

  const holdCountdown = Math.ceil(((100 - holdProgress) / 100) * (HOLD_DURATION / 1000))

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <Nav />
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
              style={{ background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.3)' }}>💪</div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Start Workout</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Timer starts the moment you tap — add exercises as you go
              </p>
            </div>
            <button onClick={startWorkout}
              className="w-full max-w-xs rounded-2xl font-bold text-lg py-5 transition-all active:scale-95"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 8px 32px var(--accent-glow)' }}>
              Start Workout
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // ── Saved ─────────────────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 page-fade"
          style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}>✓</div>
          <h2 className="text-2xl font-bold text-green-400">Workout Saved!</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>XP added to your profile</p>
        </div>
      </AuthGuard>
    )
  }

  // ── Active / Saving ───────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        {/* ExercisePicker modal */}
        <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />

        {/* Timer hero */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Workout Time
          </div>
          <div className="font-mono font-black tabular-nums leading-none timer-active"
            style={{ fontSize: 'clamp(3.5rem, 12vw, 5.5rem)', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            {formatTime(elapsed)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Recording
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 pb-8 space-y-4">

          {/* Exercise cards */}
          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={ex.id}
              entry={ex}
              exIdx={exIdx}
              onRemove={() => removeExercise(ex.id)}
              onToggleField={(field) => toggleField(ex.id, field)}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={(setId) => removeSet(ex.id, setId)}
              onUpdateSet={(setId, field, val) => updateSet(ex.id, setId, field, val)}
            />
          ))}

          {/* Add Exercise button */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '2px dashed var(--border)',
              color: 'var(--accent)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Exercise
          </button>

          {/* Error */}
          {mutation.isError && (
            <div className="rounded-xl px-4 py-3 text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              Failed to save — please try again
            </div>
          )}

          {/* Hold-to-confirm finish */}
          <div className="relative select-none pt-2 pb-4">
            <button
              disabled={phase === 'saving'}
              onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
              onTouchStart={startHold} onTouchEnd={stopHold}
              className="relative w-full rounded-2xl overflow-hidden font-bold text-base py-5 min-h-[64px] transition-all"
              style={{
                background: phase === 'saving' ? 'rgba(255,255,255,0.06)' : isHolding ? '#16a34a' : '#22c55e',
                color: phase === 'saving' ? 'var(--text-muted)' : '#fff',
                cursor: phase === 'saving' ? 'not-allowed' : 'pointer',
                boxShadow: !isHolding && phase !== 'saving' ? '0 6px 24px rgba(34,197,94,0.3)' : 'none',
              }}
            >
              {isHolding && (
                <span className="absolute inset-0 origin-left"
                  style={{ background: 'rgba(255,255,255,0.25)', transform: `scaleX(${holdProgress / 100})`, transition: 'none' }} />
              )}
              <span className="relative z-10">
                {phase === 'saving' ? '💾 Saving…' : isHolding ? `Hold ${holdCountdown}s…` : '🏁 Finish Workout'}
              </span>
            </button>
            {!isHolding && phase === 'active' && (
              <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Hold for 5 seconds to save</p>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}

// ─── ExerciseCard sub-component ───────────────────────────────────────────────
interface ExerciseCardProps {
  entry: ExerciseEntry
  exIdx: number
  onRemove: () => void
  onToggleField: (field: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onUpdateSet: (setId: string, field: keyof SetRow, value: string) => void
}

function ExerciseCard({ entry, exIdx, onRemove, onToggleField, onAddSet, onRemoveSet, onUpdateSet }: ExerciseCardProps) {
  const [showOptions, setShowOptions] = useState(false)

  const fields: Array<{ key: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>; label: string; setField: keyof SetRow; inputType: string; placeholder: string }> = [
    { key: 'showWeight',   label: 'Weight (kg)', setField: 'weight_kg',    inputType: 'number', placeholder: 'kg' },
    { key: 'showReps',     label: 'Reps',        setField: 'reps',         inputType: 'number', placeholder: 'reps' },
    { key: 'showDuration', label: 'Duration',    setField: 'duration_min', inputType: 'number', placeholder: 'min' },
    { key: 'showDistance', label: 'Distance',    setField: 'distance_km',  inputType: 'number', placeholder: 'km' },
    { key: 'showNotes',    label: 'Notes',       setField: 'notes',        inputType: 'text',   placeholder: 'notes' },
  ]
  const activeFields = fields.filter((f) => entry[f.key])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">{entry.nameCn}</div>
          {entry.nameCn !== entry.nameEn && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{entry.nameEn}</div>
          )}
        </div>
        {/* Options toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: showOptions ? 'var(--bg-elevated)' : 'transparent' }}
          title="Toggle fields"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
        {/* Remove exercise */}
        <button
          onClick={onRemove}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>

      {/* Field toggle options */}
      {showOptions && (
        <div className="px-4 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
          {fields.map((f) => (
            <button
              key={f.key}
              onClick={() => onToggleField(f.key)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: entry[f.key] ? 'var(--accent)' : 'var(--bg-surface)',
                color: entry[f.key] ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${entry[f.key] ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Sets table header */}
      <div className="grid px-4 py-2" style={{
        gridTemplateColumns: `24px ${activeFields.map(() => '1fr').join(' ')} 36px`,
        borderBottom: '1px solid var(--border)',
      }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>#</span>
        {activeFields.map((f) => (
          <span key={f.key} className="text-xs font-semibold text-center" style={{ color: 'var(--text-muted)' }}>
            {f.label.split(' ')[0]}
          </span>
        ))}
        <span />
      </div>

      {/* Set rows */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {entry.sets.map((set, setIdx) => (
          <div key={set.id} className="grid items-center px-4 py-2 gap-1" style={{
            gridTemplateColumns: `24px ${activeFields.map(() => '1fr').join(' ')} 36px`,
          }}>
            {/* Set number */}
            <span className="text-xs font-bold text-center" style={{ color: 'var(--text-muted)' }}>{setIdx + 1}</span>

            {/* Active field inputs */}
            {activeFields.map((f) => (
              <input
                key={f.key}
                type={f.inputType}
                className="w-full rounded-lg px-2 py-2 text-sm text-center border min-h-[40px] focus:border-blue-500"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                placeholder={f.placeholder}
                value={set[f.setField]}
                onChange={(e) => onUpdateSet(set.id, f.setField, e.target.value)}
                min={f.inputType === 'number' ? '0' : undefined}
                step={f.setField === 'weight_kg' ? '0.5' : f.setField === 'reps' ? '1' : '0.1'}
              />
            ))}

            {/* Remove set */}
            <button
              onClick={() => onRemoveSet(set.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg mx-auto"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add set */}
      <div className="px-4 py-2.5">
        <button
          onClick={onAddSet}
          className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg"
          style={{ color: 'var(--accent)', background: 'rgba(59,130,246,0.08)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Set
        </button>
      </div>
    </div>
  )
}
