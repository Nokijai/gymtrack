// Program components - no circular imports
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { WorkoutTemplate } from '@/lib/types'

// ═══ Program Card ═════════════════════════════════════════════════

export function ProgramCard({ program }: { program: any }) {
  return (
    <div className="rounded-lg p-4 cursor-pointer transition-all hover:scale-[1.01]"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium" style={{ color: 'var(--text)' }}>{program.name}</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{program.goal || 'General'}</p>
        </div>
        <span className="px-2 py-1 rounded text-xs"
          style={{
            background: program.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)',
            color: program.status === 'active' ? '#22c55e' : '#9ca3af',
          }}>
          {program.status}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>Week {program.current_week}/{program.total_weeks}</span>
          <span>{(program.overall_adherence || 0).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${program.overall_adherence || 0}%`, background: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}

// ═══ Templates List ═════════════════════════════════════════════════

export function TemplatesList() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates')
      return res.data.templates as WorkoutTemplate[]
    },
  })

  if (isLoading) return <div className="text-center py-8 text-sm" style={{color:'var(--text-muted)'}}>Loading...</div>

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {templates && templates.length > 0 ? (
        templates.map((t) => (
          <div key={t.id} className="rounded-lg p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>{t.name}</h3>
            <div className="flex gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{t.exercises?.length || 0} exercises</span>
              <span>{t.days_per_week} days/week</span>
            </div>
            {t.split_type && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs"
                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                {t.split_type}
              </span>
            )}
          </div>
        ))
      ) : (
        <div className="col-span-full text-center py-12 rounded-lg" style={{background:'var(--bg-surface)'}}>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>No templates</p>
        </div>
      )}
    </div>
  )
}

// ═══ Calendar View ══════════════════════════════════════════════════

export function CalendarView() {
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

  if (isLoading) return <div className="text-center py-8 text-sm" style={{color:'var(--text-muted)'}}>Loading calendar...</div>

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => month === 1 ? (setMonth(12), setYear(y => y - 1)) : setMonth(m => m - 1)}
          className="px-3 py-1 rounded" style={{ color: 'var(--text-muted)' }}>←</button>
        <h2 className="font-medium" style={{ color: 'var(--text)' }}>{monthNames[month - 1]} {year}</h2>
        <button onClick={() => month === 12 ? (setMonth(1), setYear(y => y + 1)) : setMonth(m => m + 1)}
          className="px-3 py-1 rounded" style={{ color: 'var(--text-muted)' }}>→</button>
      </div>

      {calendar && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
                {calendar.calendar.total_workouts_planned}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Planned</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-semibold" style={{ color: '#22c55e' }}>
                {calendar.calendar.total_workouts_completed}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Done</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)' }}>
              <div className="text-2xl font-semibold" style={{ color: 'var(--accent)' }}>
                {(calendar.calendar.overall_adherence || 0).toFixed(0)}%
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Adherence</div>
            </div>
          </div>

          <div className="space-y-2">
            {calendar.calendar.weeks.map((week: any) => (
              <div key={week.week_start} className="space-y-1">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Week of {new Date(week.week_start).toLocaleDateString()}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {week.days.map((day: any) => (
                    <div key={day.date}
                      className="aspect-square rounded flex items-center justify-center text-xs"
                      style={{
                        background: day.is_rest_day ? 'rgba(147, 51, 234, 0.1)' :
                          day.has_actual_session ? 'rgba(34, 197, 94, 0.15)' :
                          day.has_program_workout ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: new Date(day.date).toDateString() === today.toDateString() ? '1px solid var(--accent)' : 'none',
                        color: 'var(--text-muted)',
                      }}>
                      {new Date(day.date).getDate()}
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