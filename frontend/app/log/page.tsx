'use client'
import { useState } from 'react'
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

export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseRow[]>([
    { name: '', sets: '', reps: '', weight_kg: '' },
  ])

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/sessions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      router.push('/dashboard')
    },
  })

  function addRow() {
    setExercises([...exercises, { name: '', sets: '', reps: '', weight_kg: '' }])
  }

  function updateRow(i: number, field: keyof ExerciseRow, value: string) {
    const next = [...exercises]
    next[i] = { ...next[i], [field]: value }
    setExercises(next)
  }

  function removeRow(i: number) {
    setExercises(exercises.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      date,
      duration_minutes: parseInt(duration),
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
    mutation.mutate(payload)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">➕ Log Session</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic info */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                    required
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
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Notes (optional)</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Felt great today..."
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Exercises */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Exercises</h2>
                <button type="button" onClick={addRow} className="text-orange-400 hover:text-orange-300 text-sm font-medium">
                  + Add Exercise
                </button>
              </div>
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
                <div className="col-span-4">Exercise</div>
                <div className="col-span-2 text-center">Sets</div>
                <div className="col-span-2 text-center">Reps</div>
                <div className="col-span-3 text-center">Weight (kg)</div>
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
                    placeholder="3"
                    min="1"
                    value={ex.sets}
                    onChange={(e) => updateRow(i, 'sets', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 bg-gray-800 text-white rounded-lg px-2 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm text-center"
                    placeholder="10"
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
                    className="col-span-1 text-gray-600 hover:text-red-400 text-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {mutation.isError && (
              <p className="text-red-400 text-sm">Failed to save session. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
            >
              {mutation.isPending ? 'Saving...' : '💾 Save Session'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}
