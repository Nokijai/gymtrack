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
      <div className="min-h-screen pb-20 md:pb-0" style={{ background: 'var(--bg)' }}>
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Training Programs</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Plan, track, and achieve your fitness goals
            </p>
          </div>

          <div className="flex gap-2 mb-6 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            {[
              { key: 'programs', label: 'Active Programs' },
              { key: 'templates', label: 'Templates' },
              { key: 'calendar', label: 'Calendar' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : 'none',
                }}>
                {tab.label}
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

  if (isLoading) return <div className="text-center py-8 text-sm" style={{color:'var(--text-muted)'}}>Loading...</div>

  return (
    <div className="space-y-4">
      <button onClick={() => setShowCreate(true)}
        className="w-full py-3 rounded-lg text-sm font-medium"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        + New Program
      </button>

      {programs && programs.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {programs.map((p) => <ProgramCard key={p.id} program={p} />)}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg" style={{background:'var(--bg-surface)'}}>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>No programs yet</p>
          <p className="text-xs mt-1" style={{color:'var(--text-muted)',opacity:0.7}}>Create your first training program</p>
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

function CreateModal({ onClose, onCreate, loading }: {
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
      <div className="relative rounded-lg p-6 w-full max-w-md space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Create Program</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {goals.map((g) => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className="px-3 py-2 rounded text-sm"
                  style={{
                    background: goal === g.value ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: goal === g.value ? '#fff' : 'var(--text-muted)',
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Duration: {weeks} weeks
            </label>
            <input type="range" min={4} max={24} value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))} className="w-full" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded text-sm"
            style={{ color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={() => onCreate({ name: `${goal} Program`, goal, weeks })}
            disabled={loading}
            className="flex-1 py-2 rounded text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}