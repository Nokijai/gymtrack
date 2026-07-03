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
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionId === null) { setDetail(null); return }
    setLoading(true)
    setError('')
    api.get(`/sessions/${sessionId}`)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load session details'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (sessionId === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Session Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-gray-400 text-center py-8">Loading…</div>
        )}

        {error && (
          <div className="text-red-400 text-center py-4">{error}</div>
        )}

        {detail && !loading && (
          <>
            {/* Session meta */}
            <div className="flex gap-4 mb-5">
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-xs text-gray-400 mb-1">Date</div>
                <div className="font-semibold text-white">{detail.date}</div>
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-xs text-gray-400 mb-1">Duration</div>
                <div className="font-semibold text-orange-400">{detail.duration_minutes} min</div>
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
                <div className="text-xs text-gray-400 mb-1">XP Earned</div>
                <div className="font-semibold text-yellow-400">⚡ {detail.xp_earned}</div>
              </div>
            </div>

            {/* Exercises */}
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Exercises</h3>
            {detail.exercises.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No exercises recorded for this session</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-4">Exercise</th>
                      <th className="text-center py-2 px-2">Sets</th>
                      <th className="text-center py-2 px-2">Reps</th>
                      <th className="text-center py-2 pl-2">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.exercises.map((ex) => (
                      <tr key={ex.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 pr-4 text-white font-medium">{ex.name}</td>
                        <td className="py-2 px-2 text-center text-gray-300">{ex.sets}</td>
                        <td className="py-2 px-2 text-center text-gray-300">{ex.reps}</td>
                        <td className="py-2 pl-2 text-center text-gray-300">
                          {ex.weight_kg != null ? `${ex.weight_kg} kg` : 'BW'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="mt-5 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
