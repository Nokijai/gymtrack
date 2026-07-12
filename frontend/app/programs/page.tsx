'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import type { WorkoutTemplate, TrainingProgram } from '@/lib/types'
import { ProgramCard, TemplatesList, CalendarView } from './components'

export default function ProgramsPage() {
  const [activeTab, setActiveTab] = useState<'programs' | 'templates' | 'calendar'>('programs')

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)' }}>
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-6 pb-12">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Programs
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Plan, track, and achieve your fitness goals
            </p>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-0 mb-6 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            {[
              { key: 'programs', label: 'Active Programs' },
              { key: 'templates', label: 'Templates' },
              { key: 'calendar', label: 'Calendar' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="px-4 py-2 text-xs font-medium transition-colors relative"
                style={{
                  color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'programs' && <ProgramsList />}
          {activeTab === 'templates' && <TemplatesList />}
          {activeTab === 'calendar' && <CalendarView />}
        </main>
      </div>
    </AuthGuard>
  )
}

// ═══ Programs List ═════════════════════════════════════════════════

function ProgramsList() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const res = await api.get('/programs')
      return res.data.programs as TrainingProgram[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; goal: string; weeks: number }) => {
      const res = await api.post('/programs/generate', null, {
        params: { goal: data.goal, weeks: data.weeks, sessions_per_week: 4 },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      setShowCreate(false)
    },
  })

  if (isLoading)
    return (
      <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(true)}
        className="btn btn-primary w-full py-2 text-xs"
      >
        New program
      </button>

      {programs && programs.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No programs yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            Create your first training program
          </p>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  )
}

// ═══ Create Modal ═══════════════════════════════════════════════════

function CreateModal({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void
  onCreate: (d: { name: string; goal: string; weeks: number }) => void
  loading: boolean
}) {
  const [goal, setGoal] = useState('strength')
  const [weeks, setWeeks] = useState(8)

  const goals = [
    { value: 'strength', label: 'Strength' },
    { value: 'hypertrophy', label: 'Muscle Building' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'general_fitness', label: 'General Fitness' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative rounded-lg p-5 w-full max-w-sm space-y-4"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Create program
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Goal
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className="px-3 py-2 rounded text-xs transition-colors"
                  style={{
                    background: goal === g.value ? 'var(--accent)' : 'var(--bg-hover)',
                    color: goal === g.value ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Duration: {weeks} weeks
            </label>
            <input
              type="range"
              min={4}
              max={24}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="btn btn-ghost flex-1 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ name: `${goal} Program`, goal, weeks })}
            disabled={loading}
            className="btn btn-primary flex-1 text-xs"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}