'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import { useTimerStore } from '@/lib/store'
import api from '@/lib/api'

interface ExerciseRow {
  name: string
  sets: string
  reps: string
  weight_kg: string
}

const HOLD_DURATION = 5000 // 5 seconds

type Phase = 'idle' | 'active' | 'saving' | 'saved'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  return [m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ── Persistent timer from global store ──────────────────────────────────
  const { isRunning, startTimestamp, elapsed, startTimer, syncElapsed, stopTimer } = useTimerStore()

  // Phase is derived from isRunning — if timer is running we're active
  const [phase, setPhase] = useState<Phase>(() => isRunning ? 'active' : 'idle')

  // Keep exercises in state (they stay across re-renders but not navigation)
  const EXERCISES_KEY = 'gymtrack_exercises'
  const [exercises, setExercises] = useState<ExerciseRow[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem(EXERCISES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  // Sync exercises to sessionStorage whenever they change
  useEffect(() => {
    try { sessionStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises)) } catch {}
  }, [exercises])

  // Always-current ref so the hold-fire closure reads fresh exercises
  const exercisesRef = useRef<ExerciseRow[]>([])
  useEffect(() => { exercisesRef.current = exercises }, [exercises])

  // ── Tick: increment elapsed every second using requestAnimationFrame ─────
  const rafRef2 = useRef<number | null>(null)
  useEffect(() => {
    if (!isRunning) return

    // Sync once immediately
    syncElapsed()

    // Tick function
    const tick = () => {
      syncElapsed()
      rafRef2.current = requestAnimationFrame(tick)
    }
    rafRef2.current = requestAnimationFrame(tick)

    // Also sync on page visibility change (handles background tab / app switch)
    const onVisible = () => { if (!document.hidden) syncElapsed() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [isRunning, syncElapsed])

  // If page re-mounts and timer is already running, show active phase
  useEffect(() => {
    if (isRunning && phase === 'idle') {
      setPhase('active')
    }
  }, [isRunning, phase])

  // Hold-to-confirm state
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
      try { sessionStorage.removeItem('gymtrack_exercises') } catch {}
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
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name:      ex.name.trim(),
          sets:      parseInt(ex.sets)     || 1,
          reps:      parseInt(ex.reps)     || 1,
          weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        })),
    }
  }

  // Hold-to-confirm
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

  function addRow() {
    setExercises((prev) => [...prev, { name: '', sets: '3', reps: '10', weight_kg: '' }])
  }

  function updateRow(i: number, field: keyof ExerciseRow, value: string) {
    setExercises((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function removeRow(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i))
  }

  const holdCountdown = Math.ceil(((100 - holdProgress) / 100) * (HOLD_DURATION / 1000))

  // ── Idle state ────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <Nav />
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
              style={{ background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.3)' }}>
              💪
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Start Workout</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Timer starts the moment you tap — add exercises as you go
              </p>
            </div>

            <button
              onClick={startWorkout}
              className="w-full max-w-xs rounded-2xl font-bold text-lg py-5 transition-all active:scale-95"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 8px 32px var(--accent-glow)',
              }}
            >
              Start Workout
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // ── Saved state ───────────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 page-fade"
          style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}>
            ✓
          </div>
          <h2 className="text-2xl font-bold text-green-400">Workout Saved!</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>XP added to your profile</p>
        </div>
      </AuthGuard>
    )
  }

  // ── Active / Saving state ─────────────────────────────────────────────────
  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        {/* Timer hero */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Workout Time
          </div>
          <div
            className="font-mono font-black tabular-nums leading-none timer-active"
            style={{ fontSize: 'clamp(3.5rem, 12vw, 5.5rem)', color: 'var(--accent)', letterSpacing: '-0.02em' }}
          >
            {formatTime(elapsed)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Recording
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 pb-8 space-y-4">

          {/* Exercise card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Exercises
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
                style={{ color: 'var(--accent)', background: 'rgba(59,130,246,0.1)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {exercises.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tap "+ Add" to log exercises
                </div>
              )}

              {exercises.map((ex, i) => (
                <div key={i} className="p-4 space-y-3">
                  {/* Name row */}
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border min-h-[44px] transition-colors focus:border-blue-500"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                      placeholder="Exercise name  (e.g. Bench press)"
                      value={ex.name}
                      onChange={(e) => updateRow(i, 'name', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
                      style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {/* Sets / Reps / kg row */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['sets', 'reps', 'weight_kg'] as const).map((field) => (
                      <div key={field}>
                        <div className="text-center text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                          {field === 'weight_kg' ? 'kg' : field.charAt(0).toUpperCase() + field.slice(1)}
                        </div>
                        <input
                          type="number"
                          className="w-full rounded-xl px-2 py-2.5 text-sm text-center border min-h-[44px] transition-colors focus:border-blue-500"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                          placeholder={field === 'weight_kg' ? 'BW' : ''}
                          min="1"
                          step={field === 'weight_kg' ? '0.5' : '1'}
                          value={ex[field]}
                          onChange={(e) => updateRow(i, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="rounded-xl px-4 py-3 text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              Failed to save — please try again
            </div>
          )}

          {/* Hold-to-confirm finish button */}
          <div className="relative select-none pt-2 pb-4">
            <button
              disabled={phase === 'saving'}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              className="relative w-full rounded-2xl overflow-hidden font-bold text-base py-5 min-h-[64px] transition-all"
              style={{
                background: phase === 'saving'
                  ? 'rgba(255,255,255,0.06)'
                  : isHolding
                  ? '#16a34a'
                  : '#22c55e',
                color: phase === 'saving' ? 'var(--text-muted)' : '#fff',
                cursor: phase === 'saving' ? 'not-allowed' : 'pointer',
                boxShadow: !isHolding && phase !== 'saving' ? '0 6px 24px rgba(34,197,94,0.3)' : 'none',
              }}
            >
              {/* Progress sweep */}
              {isHolding && (
                <span
                  className="absolute inset-0 origin-left"
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    transform: `scaleX(${holdProgress / 100})`,
                    transition: 'none',
                  }}
                />
              )}
              <span className="relative z-10">
                {phase === 'saving'
                  ? '💾 Saving…'
                  : isHolding
                  ? `Hold ${holdCountdown}s…`
                  : '🏁 Finish Workout'}
              </span>
            </button>

            {!isHolding && phase === 'active' && (
              <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Hold for 5 seconds to save
              </p>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}
