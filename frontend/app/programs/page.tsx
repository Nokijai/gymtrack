'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import type { WorkoutTemplate, TrainingProgram } from '@/lib/types'

// ═══════════════════════════════════════════════════════════════════════════
// Programs Page - Main view for training programs and templates
// ═══════════════════════════════════════════════════════════════════════════

export default function ProgramsPage() {
  const [activeTab, setActiveTab] = useState<'programs' | 'templates' | 'calendar'>('programs')
  
  return (
    <>
      <AuthGuard>
        <div className="min-h-screen pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>
          <Nav />
          
          <main className="max-w-6xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                Programs & Templates
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Plan your training journey
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { key: 'programs', label: 'Training Programs' },
                { key: 'templates', label: 'Workout Templates' },
                { key: 'calendar', label: 'Calendar View' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    background: activeTab === tab.key ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                    boxShadow: activeTab === tab.key ? '0 0 12px var(--accent-glow)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === 'programs' && <ProgramsList />}
            {activeTab === 'templates' && <TemplatesList />}
            {activeTab === 'calendar' && <CalendarView />}
          </main>
        </div>
      </AuthGuard>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Programs List Component
// ═══════════════════════════════════════════════════════════════════════════

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
        params: {
          goal: data.goal,
          weeks: data.weeks,
          sessions_per_week: 4,
        },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      setShowCreate(false)
    },
  })

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full py-3 rounded-lg font-medium transition-all"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 0 16px var(--accent-glow)',
        }}
      >
        + Create New Program
      </button>

      {/* Programs Grid */}
      {programs && programs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
          <div className="text-4xl mb-2">🏋️</div>
          <p style={{ color: 'var(--text-muted)' }}>No programs yet. Create your first training program!</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateProgramModal
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Program Card Component
// ═══════════════════════════════════════════════════════════════════════════

function ProgramCard({ program }: { program: TrainingProgram }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{program.name}</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {program.goal || 'General Fitness'}
          </p>
        </div>
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            background: program.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
            color: program.status === 'active' ? '#22c55e' : '#9ca3af',
          }}
        >
          {program.status}
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Week {program.current_week} of {program.total_weeks}</span>
          <span>{program.overall_adherence?.toFixed(0) || 0}% adherence</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${program.overall_adherence || 0}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{program.weeks?.length || 0} weeks</span>
        <span>{program.total_weeks} total</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Create Program Modal
// ═══════════════════════════════════════════════════════════════════════════

function CreateProgramModal({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void
  onCreate: (data: { name: string; goal: string; weeks: number }) => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('strength')
  const [weeks, setWeeks] = useState(8)

  const goals = [
    { value: 'strength', label: '💪 Strength' },
    { value: 'hypertrophy', label: '🎯 Muscle Building' },
    { value: 'endurance', label: '🏃 Endurance' },
    { value: 'general_fitness', label: '⚡ General Fitness' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative rounded-2xl p-6 w-full max-w-md space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Create Training Program</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Program Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Strength Program"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className="px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: goal === g.value ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: goal === g.value ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              Duration: {weeks} weeks
            </label>
            <input
              type="range"
              min={4}
              max={24}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ name: name || `${goal} Program`, goal, weeks })}
            disabled={loading}
            className="flex-1 py-2 rounded-lg font-medium transition-all"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Templates List Component
// ═══════════════════════════════════════════════════════════════════════════

function TemplatesList() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates')
      return res.data.templates as WorkoutTemplate[]
    },
  })

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
          <div className="text-4xl mb-2">📋</div>
          <p style={{ color: 'var(--text-muted)' }}>No templates yet. Create workout templates to reuse!</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Template Card Component
// ═══════════════════════════════════════════════════════════════════════════

function TemplateCard({ template }: { template: WorkoutTemplate }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{template.name}</h3>
        {template.is_public && (
          <span className="text-xs" style={{ color: 'var(--accent)' }}>Public</span>
        )}
      </div>

      {template.description && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{template.description}</p>
      )}

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{template.exercises?.length || 0} exercises</span>
        <span>•</span>
        <span>{template.days_per_week} days/week</span>
        <span>•</span>
        <span>{template.duration_weeks} weeks</span>
      </div>

      {template.split_type && (
        <div className="flex gap-1">
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}
          >
            {template.split_type}
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Calendar View Component
// ═══════════════════════════════════════════════════════════════════════════

function CalendarView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await api.get('/calendar', { params: { year, month } })
      return res.data
    },
  })

  if (isLoading) {
    return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading calendar...</div>
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (month === 1) {
              setMonth(12)
              setYear(year - 1)
            } else {
              setMonth(month - 1)
            }
          }}
          className="px-3 py-1 rounded"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
        >
          ←
        </button>
        <h2 className="font-semibold" style={{ color: 'var(--text)' }}>
          {monthNames[month - 1]} {year}
        </h2>
        <button
          onClick={() => {
            if (month === 12) {
              setMonth(1)
              setYear(year + 1)
            } else {
              setMonth(month + 1)
            }
          }}
          className="px-3 py-1 rounded"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
        >
          →
        </button>
      </div>

      {/* Calendar Grid */}
      {calendar && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                {calendar.calendar.total_workouts_planned}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Planned</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                {calendar.calendar.total_workouts_completed}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                {calendar.calendar.overall_adherence?.toFixed(0) || 0}%
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Adherence</div>
            </div>
          </div>

          {/* Weeks */}
          <div className="space-y-2">
            {calendar.calendar.weeks.map((week: any) => (
              <div key={week.week_start} className="space-y-2">
                <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Week of {new Date(week.week_start).toLocaleDateString()}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {week.days.map((day: any) => (
                    <div
                      key={day.date}
                      className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all"
                      style={{
                        background: day.is_rest_day
                          ? 'rgba(147, 51, 234, 0.1)'
                          : day.has_actual_session
                          ? 'rgba(34, 197, 94, 0.2)'
                          : day.has_program_workout
                          ? 'rgba(139, 92, 246, 0.2)'
                          : 'rgba(255,255,255,0.05)',
                        border: new Date(day.date).toDateString() === today.toDateString()
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)' }}>
                        {new Date(day.date).getDate()}
                      </div>
                      {day.has_actual_session && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {day.has_program_workout && !day.has_actual_session && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}