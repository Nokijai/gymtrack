'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
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
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0) // seconds
  const startTimeRef = useRef<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [exercises, setExercises] = useState<ExerciseRow[]>([])
  // Always-current ref so the hold-fire closure reads fresh exercises
  const exercisesRef = useRef<ExerciseRow[]>([])
  useEffect(() => {
    exercisesRef.current = exercises
  }, [exercises])

  // Hold-to-confirm state
  const [holdProgress, setHoldProgress] = useState(0) // 0–100
  const [isHolding, setIsHolding] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const didFire = useRef(false)

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/sessions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setPhase('saved')
      setTimeout(() => router.push('/dashboard'), 1500)
    },
    onError: () => {
      // Let user retry — go back to active state
      setPhase('active')
    },
  })

  function startWorkout() {
    startTimeRef.current = new Date()
    setElapsed(0)
    setExercises([])
    setPhase('active')
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)
  }

  function buildPayload() {
    const stopTime = new Date()
    const start = startTimeRef.current!
    const duration_minutes = Math.max(
      1,
      Math.round((stopTime.getTime() - start.getTime()) / 60_000)
    )
    const date = start.toISOString().split('T')[0]
    return {
      date,
      duration_minutes,
      exercises: exercisesRef.current
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name.trim(),
          sets: parseInt(ex.sets) || 1,
          reps: parseInt(ex.reps) || 1,
          weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        })),
    }
  }

  // Hold-to-confirm — only on the Finish button
  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (phase !== 'active') return
      didFire.current = false
      setIsHolding(true)
      holdStartRef.current = Date.now()

      const tick = () => {
        if (!holdStartRef.current) return
        const ms = Date.now() - holdStartRef.current
        const pct = Math.min((ms / HOLD_DURATION) * 100, 100)
        setHoldProgress(pct)
        if (pct < 100) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          if (!didFire.current) {
            didFire.current = true
            if (timerRef.current) clearInterval(timerRef.current)
            setPhase('saving')
            mutation.mutate(buildPayload())
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [phase] // mutation.mutate is stable; exercises read via exercisesRef
  )

  const stopHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
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

  // ── State 1: Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
          <Nav />
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
            <p className="text-gray-500 text-sm uppercase tracking-widest">Ready to train?</p>
            <button
              onClick={startWorkout}
              className="w-full max-w-xs bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold text-xl rounded-2xl px-10 py-5 transition-all shadow-xl shadow-orange-500/25 min-h-[64px]"
            >
              🏋️ Start Workout
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // ── State 3b: Saved ───────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
          <Nav />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl">💪</span>
            <p className="text-3xl font-bold text-green-400">Saved!</p>
            <p className="text-gray-500 text-sm">Redirecting to dashboard…</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // ── State 2: Active  /  State 3a: Saving ─────────────────────────────
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">

          {/* Live Timer — large and centered */}
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Workout Time</p>
            <p className="text-5xl md:text-6xl font-mono font-bold text-orange-400 tabular-nums leading-none">
              {formatTime(elapsed)}
            </p>
          </div>

          {/* Exercise list */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">🏋️ Exercises</h2>
              <button
                type="button"
                onClick={addRow}
                className="text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors min-h-[44px] px-2"
              >
                + Add Exercise
              </button>
            </div>

            {/* Column headers — only show on larger screens */}
            {exercises.length > 0 && (
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
                <div className="col-span-5">Exercise</div>
                <div className="col-span-2 text-center">Sets</div>
                <div className="col-span-2 text-center">Reps</div>
                <div className="col-span-2 text-center">kg</div>
                <div className="col-span-1" />
              </div>
            )}

            {exercises.map((ex, i) => (
              <div key={i} className="space-y-2 sm:space-y-0">
                {/* Mobile layout: name full width, then numbers in a row */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm min-h-[44px]"
                      placeholder="Exercise name (e.g. Bench press)"
                      value={ex.name}
                      onChange={(e) => updateRow(i, 'name', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-gray-600 hover:text-red-400 text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-500 text-center mb-1">Sets</div>
                      <input
                        type="number"
                        className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center min-h-[44px]"
                        min="1"
                        value={ex.sets}
                        onChange={(e) => updateRow(i, 'sets', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 text-center mb-1">Reps</div>
                      <input
                        type="number"
                        className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center min-h-[44px]"
                        min="1"
                        value={ex.reps}
                        onChange={(e) => updateRow(i, 'reps', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 text-center mb-1">kg</div>
                      <input
                        type="number"
                        className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center min-h-[44px]"
                        placeholder="BW"
                        step="0.5"
                        value={ex.weight_kg}
                        onChange={(e) => updateRow(i, 'weight_kg', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop layout: single row grid */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                    placeholder="Bench press"
                    value={ex.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center"
                    min="1"
                    value={ex.sets}
                    onChange={(e) => updateRow(i, 'sets', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center"
                    min="1"
                    value={ex.reps}
                    onChange={(e) => updateRow(i, 'reps', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center"
                    placeholder="BW"
                    step="0.5"
                    value={ex.weight_kg}
                    onChange={(e) => updateRow(i, 'weight_kg', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="col-span-1 text-gray-600 hover:text-red-400 text-center transition-colors text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {exercises.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">
                No exercises yet — tap + Add Exercise
              </p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm text-center">
              Failed to save. Please try again.
            </p>
          )}

          {/* Hold-to-confirm Finish button — full width, comfortable thumb reach */}
          <div className="relative select-none pb-4">
            <button
              disabled={phase === 'saving'}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              className={`w-full relative overflow-hidden rounded-2xl px-4 py-5 font-bold text-lg transition-all min-h-[64px]
                ${phase === 'saving'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : isHolding
                  ? 'bg-green-700 text-white cursor-grabbing'
                  : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                }`}
            >
              {/* Green progress sweep */}
              {isHolding && (
                <span
                  className="absolute inset-0 bg-green-400 origin-left transition-none"
                  style={{ transform: `scaleX(${holdProgress / 100})`, opacity: 0.45 }}
                />
              )}
              <span className="relative z-10">
                {phase === 'saving'
                  ? '💾 Saving…'
                  : isHolding
                  ? `${holdCountdown}s…`
                  : '🏁 Finish Workout'}
              </span>
            </button>

            {!isHolding && phase === 'active' && (
              <p className="text-center text-gray-600 text-xs mt-2">
                Hold for 5 seconds to save
              </p>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}
