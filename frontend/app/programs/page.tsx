'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'
import type { WorkoutTemplate, TrainingProgram } from '@/lib/types'
import { ProgramCard, TemplatesList, CalendarView, LoadingState, EmptyState, CreateModal } from './components'

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

  if (isLoading) return <LoadingState />

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
        <EmptyState message="No programs yet" hint="Create your first training program" />
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