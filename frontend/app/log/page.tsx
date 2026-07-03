'use client'
import { useState, useRef, useCallback } from 'react'
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

export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseRow[]>([
    { name: '', sets: '3', reps: '10', weight_kg: '' },
  ])

  // Hold-to-confirm state
  const [holdProgress, setHoldProgress] = useState(0) // 0–100
  const [isHolding, setIsHolding] = useState(false)
  const holdStart = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const didFire = useRef(false)

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/sessions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      router.push('/dashboard')
    },
  })

  function buildPayload() {
    return {
      date,
      duration_minutes: parseInt(duration) || 1,
      notes: notes || null,
      exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name.trim(),
          sets: parseInt(ex.sets) || 1,
          reps: parseInt(ex.reps) || 1,
          weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        })),
    }
  }

  // Hold-to-confirm logic
  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (mutation.isPending) return
    didFire.current = false
    setIsHolding(true)
    holdStart.current = Date.now()

    const tick = () => {
      if (!holdStart.current) return
      const elapsed = Date.now() - holdStart.current
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setHoldProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        if (!didFire.current) {
          didFire.current = true
          mutation.mutate(buildPayload())
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [mutation, date, duration, notes, exercises])

  const stopHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    holdStart.current = null
    setIsHolding(false)
    setHoldProgress(0)
  }, [])

  function addRow() {
    setExercises([...exercises, { name: '', sets: '3', reps: '10', weight_kg: '' }])
  }

  function updateRow(i: number, field: keyof ExerciseRow, value: string) {
    const next = [...exercises]
    next[i] = { ...next[i], [field]: value }
    setExercises(next)
  }

  function removeRow(i: number) {
    setExercises(exercises.filter((_, idx) => idx !== i))
  }

  const filledExercises = exercises.filter((e) => e.name.trim()).length
  const isReady = filledExercises > 0 && duration

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <h1 className="text-2xl font-bold">➕ Log Session</h1>

          {/* Date + Duration */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  min="1"
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Chest day, felt strong..."
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Exercise record */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">🏋️ Exercise Record</h2>
              <button
                type="button"
                onClick={addRow}
                className="text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                + Add Exercise
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
              <div className="col-span-4">Exercise</div>
              <div className="col-span-2 text-center">Sets</div>
              <div className="col-span-2 text-center">Reps</div>
              <div className="col-span-3 text-center">kg</div>
              <div className="col-span-1" />
            </div>

            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-4 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                  className="col-span-3 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center"
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
            ))}

            {exercises.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-2">
                No exercises yet — tap + Add Exercise
              </p>
            )}
          </div>

          {/* Summary */}
          {filledExercises > 0 && duration && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex gap-6 text-sm">
              <span className="text-gray-400">📋 <span className="text-white font-medium">{filledExercises}</span> exercises</span>
              <span className="text-gray-400">⏱ <span className="text-white font-medium">{duration}</span> min</span>
              <span className="text-gray-400">📅 <span className="text-white font-medium">{date}</span></span>
            </div>
          )}

          {mutation.isError && (
            <p className="text-red-400 text-sm">Failed to save. Please try again.</p>
          )}

          {/* Hold-to-confirm button */}
          <div className="relative select-none">
            <button
              disabled={!isReady || mutation.isPending}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              className={`w-full relative overflow-hidden rounded-2xl px-4 py-5 font-bold text-lg transition-all
                ${!isReady || mutation.isPending
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : isHolding
                  ? 'bg-orange-600 text-white cursor-grabbing'
                  : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                }`}
            >
              {/* Progress fill */}
              {isHolding && (
                <span
                  className="absolute inset-0 bg-green-500 transition-none origin-left"
                  style={{ transform: `scaleX(${holdProgress / 100})`, opacity: 0.35 }}
                />
              )}
              <span className="relative z-10">
                {mutation.isPending
                  ? '💾 Saving...'
                  : isHolding
                  ? `Hold... ${Math.ceil((HOLD_DURATION - (holdProgress / 100) * HOLD_DURATION) / 1000)}s`
                  : !isReady
                  ? 'Add exercises + duration first'
                  : '🔒 Hold 5s to Log Session'}
              </span>
            </button>

            {!isHolding && isReady && (
              <p className="text-center text-gray-600 text-xs mt-2">
                Hold button for 5 seconds to confirm
              </p>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}
