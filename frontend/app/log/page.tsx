'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import ExercisePicker, { type SelectedExercise } from '@/components/ExercisePicker'
import { useTimerStore } from '@/lib/store'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SetRow {
  id: string
  weight_kg: string
  reps: string
  duration_min: string
  distance_km: string
  notes: string
  rpe: string
  rir: string
}

interface NextTarget {
  weight: number | null
  reps: number | null
  sets: number
  msg: string
  confidence: number
  last_weight?: number
  last_reps?: number
}

interface ExerciseEntry {
  id: string
  nameEn: string
  nameCn: string
  isCustom?: boolean
  showWeight: boolean
  showReps: boolean
  showDuration: boolean
  showDistance: boolean
  showNotes: boolean
  sets: SetRow[]
  nextTarget?: NextTarget | null
  loadingTarget?: boolean
}

const HOLD_DURATION = 5000
type Phase = 'idle' | 'active' | 'saving' | 'saved'
const EXERCISES_KEY = 'gymtrack_active_session_exercises'
const DRAFT_SESSION_ID_KEY = 'gymtrack_draft_session_id'

function makeSetRow(): SetRow {
  return {
    id: `s_${Date.now()}_${Math.random()}`,
    weight_kg: '', reps: '', duration_min: '', distance_km: '', notes: '', rpe: '', rir: '',
  }
}

function makeEntry(ex: SelectedExercise): ExerciseEntry {
  const isCardio = ex.category === 'Cardio'
  return {
    id: `e_${Date.now()}_${Math.random()}`,
    nameEn: ex.nameEn,
    nameCn: ex.nameCn,
    isCustom: ex.isCustom,
    showWeight: !isCardio,
    showReps: !isCardio,
    showDuration: isCardio,
    showDistance: isCardio,
    showNotes: false,
    sets: [makeSetRow()],
    nextTarget: null,
    loadingTarget: false,
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  return [m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ─── Post-Session Debrief Modal ───────────────────────────────────────────────
type DebriefPhase = 'ask' | 'loading' | 'show'

function DebriefModal({
  sessionId,
  onClose,
  onSkip,
}: {
  sessionId: number
  onClose: () => void
  onSkip: () => void
}) {
  const [debriefPhase, setDebriefPhase] = useState<DebriefPhase>('ask')
  const [text, setText] = useState<string | null>(null)

  async function handleYes() {
    setDebriefPhase('loading')
    try {
      const r = await api.post(`/ai/debrief/${sessionId}`)
      setText(r.data.debrief_text)
    } catch {
      setText('Great workout. Keep pushing — every session counts.')
    }
    setDebriefPhase('show')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 page-fade">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative card p-6 w-full max-w-sm space-y-5"
      >
        <div className="text-center">
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {debriefPhase === 'ask'
              ? 'Session Complete'
              : debriefPhase === 'loading'
              ? 'Generating debrief...'
              : 'Coach Debrief'}
          </h2>
          {debriefPhase === 'ask' && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Want a coaching debrief for this session?
            </p>
          )}
        </div>

        {debriefPhase === 'loading' && (
          <div className="space-y-2 py-1">
            <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '90%' }} />
            <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '75%' }} />
            <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '82%' }} />
            <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: '60%' }} />
          </div>
        )}

        {debriefPhase === 'show' && text && (
          <div
            className="rounded-md px-4 py-3 text-sm leading-relaxed"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {text}
          </div>
        )}

        {debriefPhase === 'ask' && (
          <div className="space-y-2 pt-1">
            <button
              onClick={handleYes}
              className="btn btn-primary w-full py-2.5 font-semibold"
            >
              Yes, generate debrief
            </button>
            <button
              onClick={onSkip}
              className="btn btn-ghost w-full py-2.5 text-sm"
              style={{ border: '1px solid var(--border)' }}
            >
              Skip
            </button>
          </div>
        )}

        {debriefPhase === 'show' && (
          <button
            onClick={onClose}
            className="btn btn-primary w-full py-2.5 font-semibold"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}

// ─── RPE Dots Selector ────────────────────────────────────────────────────────
function RPESelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? parseInt(value) : null
  return (
    <div className="flex items-center gap-0.5 mt-1">
      <span className="text-[9px] mr-1 font-medium" style={{ color: 'var(--text-muted)' }}>RPE</span>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const isSelected = selected !== null && n <= selected
        const color = selected !== null && n <= selected
          ? n <= 6 ? 'var(--green)' : n <= 8 ? 'var(--orange)' : 'var(--red)'
          : 'var(--bg-hover)'
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(selected === n ? '' : String(n))}
            className="w-3.5 h-3.5 rounded-sm transition-all duration-100"
            style={{ background: color, opacity: isSelected ? 1 : 0.6 }}
            title={`RPE ${n}`}
          />
        )
      })}
      {selected && (
        <span className="text-[9px] ml-1 font-semibold"
          style={{ color: selected <= 6 ? 'var(--green)' : selected <= 8 ? 'var(--orange)' : 'var(--red)' }}>
          {selected}
        </span>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { isRunning, startTimestamp, elapsed, startTimer, syncElapsed, stopTimer } = useTimerStore()
  const [phase, setPhase] = useState<Phase>(() => (isRunning ? 'active' : 'idle'))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [debriefSessionId, setDebriefSessionId] = useState<number | null>(null)
  const [showDebrief, setShowDebrief] = useState(false)
  const [draftSessionId, setDraftSessionId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(DRAFT_SESSION_ID_KEY)
      return stored ? parseInt(stored) : null
    } catch { return null }
  })
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftSessionIdRef = useRef<number | null>(draftSessionId)

  const [exercises, setExercises] = useState<ExerciseEntry[]>(() => {
    if (typeof window === 'undefined') return []
    if (!isRunning) return []
    try {
      const stored = localStorage.getItem(EXERCISES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises)) } catch {}
  }, [exercises])

  const exercisesRef = useRef<ExerciseEntry[]>([])
  useEffect(() => { exercisesRef.current = exercises }, [exercises])

  useEffect(() => { draftSessionIdRef.current = draftSessionId }, [draftSessionId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (draftSessionId !== null) {
        localStorage.setItem(DRAFT_SESSION_ID_KEY, String(draftSessionId))
      } else {
        localStorage.removeItem(DRAFT_SESSION_ID_KEY)
      }
    } catch {}
  }, [draftSessionId])

  // ── Auto-save debounce ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || exercises.length === 0) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving')
        const payload = buildDraftPayload()
        const currentDraftId = draftSessionIdRef.current
        let savedId: number
        if (currentDraftId !== null) {
          try {
            const res = await api.patch(`/sessions/${currentDraftId}`, payload)
            savedId = res.data.id
          } catch (e: any) {
            if (e?.response?.status === 404) {
              setDraftSessionId(null)
              const res = await api.post('/sessions', payload)
              savedId = res.data.id
              setDraftSessionId(savedId)
            } else {
              throw e
            }
          }
        } else {
          const res = await api.post('/sessions', payload)
          savedId = res.data.id
          setDraftSessionId(savedId)
        }
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2500)
      } catch {
        setAutoSaveStatus('error')
        setTimeout(() => setAutoSaveStatus('idle'), 2500)
      }
    }, 1500)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [exercises, isRunning]) // eslint-disable-line

  // ── Timer tick ───────────────────────────────────────────────────────────
  const rafRef2 = useRef<number | null>(null)
  useEffect(() => {
    if (!isRunning) return
    syncElapsed()
    const tick = () => { syncElapsed(); rafRef2.current = requestAnimationFrame(tick) }
    rafRef2.current = requestAnimationFrame(tick)
    const onVisible = () => { if (!document.hidden) syncElapsed() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      if (rafRef2.current) cancelAnimationFrame(rafRef2.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [isRunning, syncElapsed])

  useEffect(() => {
    if (isRunning && phase === 'idle') setPhase('active')
  }, [isRunning, phase])

  // ── Hold-to-confirm ──────────────────────────────────────────────────────
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const holdStartRef = useRef<number | null>(null)
  const holdRafRef   = useRef<number | null>(null)
  const didFire      = useRef(false)

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const currentDraftId = draftSessionIdRef.current
      if (currentDraftId !== null) {
        try {
          return await api.patch(`/sessions/${currentDraftId}`, payload)
        } catch (e: any) {
          if (e?.response?.status === 404) {
            setDraftSessionId(null)
          }
          throw e
        }
      }
      return api.post('/sessions', payload)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      stopTimer()
      try {
        localStorage.removeItem(EXERCISES_KEY)
        localStorage.removeItem(DRAFT_SESSION_ID_KEY)
      } catch {}
      setDraftSessionId(null)

      const sessionId = response.data?.id
      if (sessionId) {
        setDebriefSessionId(sessionId)
        setShowDebrief(true)
        setPhase('saved')
      } else {
        setPhase('saved')
        setTimeout(() => router.push('/dashboard'), 1800)
      }
    },
    onError: () => { setPhase('active') },
  })

  async function handleDiscard() {
    const currentDraftId = draftSessionIdRef.current
    if (currentDraftId !== null) {
      try { await api.delete(`/sessions/${currentDraftId}`) } catch {}
    }
    stopTimer()
    try {
      localStorage.removeItem(EXERCISES_KEY)
      localStorage.removeItem(DRAFT_SESSION_ID_KEY)
    } catch {}
    setDraftSessionId(null)
    setExercises([])
    setPhase('idle')
  }

  function startWorkout() {
    try {
      localStorage.removeItem(EXERCISES_KEY)
      localStorage.removeItem(DRAFT_SESSION_ID_KEY)
    } catch {}
    startTimer()
    setExercises([])
    setDraftSessionId(null)
    setPhase('active')
  }

  function buildDraftPayload() {
    const now = Date.now()
    const start = startTimestamp ?? (now - elapsed * 1000)
    const duration_minutes = Math.max(1, Math.round((now - start) / 60_000))
    const date = new Date(start).toISOString().split('T')[0]
    return {
      date,
      duration_minutes,
      exercises: exercisesRef.current
        .filter((ex) => ex.nameEn.trim() || ex.nameCn.trim())
        .map((ex) => ({
          name:     ex.nameEn || ex.nameCn,
          name_cn:  ex.nameCn || ex.nameEn,
          sets:     ex.sets.length,
          reps:     parseInt(ex.sets[0]?.reps) || 1,
          weight_kg: parseFloat(ex.sets[0]?.weight_kg) || null,
          set_list: ex.sets
            .filter((s) => s.reps || s.weight_kg || s.duration_min || s.distance_km)
            .map((s, i) => ({
              set_number:   i + 1,
              weight_kg:    s.weight_kg   ? parseFloat(s.weight_kg)   : null,
              reps:         s.reps        ? parseInt(s.reps)          : null,
              duration_min: s.duration_min ? parseFloat(s.duration_min) : null,
              distance_km:  s.distance_km  ? parseFloat(s.distance_km)  : null,
              notes:        s.notes || null,
              rpe:          s.rpe ? parseFloat(s.rpe) : null,
              rir:          s.rir ? parseInt(s.rir) : null,
            })),
        })),
    }
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
        .filter((ex) => ex.nameEn.trim() || ex.nameCn.trim())
        .map((ex) => ({
          name:     ex.nameEn || ex.nameCn,
          name_cn:  ex.nameCn || ex.nameEn,
          sets:     ex.sets.length,
          reps:     parseInt(ex.sets[0]?.reps) || 1,
          weight_kg: parseFloat(ex.sets[0]?.weight_kg) || null,
          set_list: ex.sets
            .filter((s) => s.reps || s.weight_kg || s.duration_min || s.distance_km)
            .map((s, i) => ({
              set_number:   i + 1,
              weight_kg:    s.weight_kg   ? parseFloat(s.weight_kg)   : null,
              reps:         s.reps        ? parseInt(s.reps)          : null,
              duration_min: s.duration_min ? parseFloat(s.duration_min) : null,
              distance_km:  s.distance_km  ? parseFloat(s.distance_km)  : null,
              notes:        s.notes || null,
              rpe:          s.rpe ? parseFloat(s.rpe) : null,
              rir:          s.rir ? parseInt(s.rir) : null,
            })),
        })),
    }
  }

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

  // ── Exercise / Set mutations ──────────────────────────────────────────────
  async function addExercise(ex: SelectedExercise) {
    const entry = makeEntry(ex)
    entry.loadingTarget = true
    setExercises((prev) => [...prev, entry])

    try {
      const encodedName = encodeURIComponent(ex.nameEn || ex.nameCn)
      const res = await api.get(`/coach/next-targets/${encodedName}`)
      setExercises((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, nextTarget: res.data, loadingTarget: false } : e
        )
      )
    } catch {
      setExercises((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, loadingTarget: false } : e
        )
      )
    }
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  function toggleField(exId: string, field: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>) {
    setExercises((prev) =>
      prev.map((e) => e.id === exId ? { ...e, [field]: !e[field] } : e)
    )
  }

  function addSet(exId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        const lastSet = e.sets[e.sets.length - 1]
        const newSet: SetRow = {
          ...makeSetRow(),
          weight_kg: lastSet?.weight_kg ?? '',
          reps: lastSet?.reps ?? '',
        }
        return { ...e, sets: [...e.sets, newSet] }
      })
    )
  }

  function removeSet(exId: string, setId: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        if (e.sets.length <= 1) return e
        return { ...e, sets: e.sets.filter((s) => s.id !== setId) }
      })
    )
  }

  function updateSet(exId: string, setId: string, field: keyof SetRow, value: string) {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exId) return e
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, [field]: value } : s
          ),
        }
      })
    )
  }

  const holdCountdown = Math.ceil(((100 - holdProgress) / 100) * (HOLD_DURATION / 1000))

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <Nav />
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11M6.5 17.5h11M3 10h18M3 14h18"/>
                <rect x="2" y="6" width="20" height="12" rx="2"/>
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold">Start Workout</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Timer starts when you begin — add exercises as you go
              </p>
            </div>
            <button onClick={startWorkout}
              className="btn btn-primary w-full max-w-xs py-3 text-sm font-semibold">
              Start Workout
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // ── Saved ─────────────────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <AuthGuard>
        {showDebrief && debriefSessionId && (
          <DebriefModal
            sessionId={debriefSessionId}
            onClose={() => {
              setShowDebrief(false)
              router.push('/dashboard')
            }}
            onSkip={() => {
              setShowDebrief(false)
              router.push('/dashboard')
            }}
          />
        )}
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 page-fade"
          style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,166,69,0.12)', border: '1px solid rgba(34,166,69,0.25)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--green)' }}>Workout Saved</h2>
        </div>
      </AuthGuard>
    )
  }

  // ── Active / Saving ───────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />

        {/* Timer */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          <div className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Workout Time
          </div>
          <div
            className="font-mono font-semibold tabular-nums leading-none"
            style={{ fontSize: 'clamp(3rem, 10vw, 4.5rem)', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {formatTime(elapsed)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
            Recording
          </div>
          {autoSaveStatus !== 'idle' && (
            <div
              className="mt-1.5 text-[11px] font-medium"
              style={{
                color: autoSaveStatus === 'saved' ? 'var(--green)'
                     : autoSaveStatus === 'saving' ? 'var(--text-muted)'
                     : 'var(--red)',
              }}
            >
              {autoSaveStatus === 'saving' && 'Auto-saving...'}
              {autoSaveStatus === 'saved' && 'Saved'}
              {autoSaveStatus === 'error' && 'Auto-save failed'}
            </div>
          )}
        </div>

        <div className="max-w-xl mx-auto px-4 pb-8 space-y-3">

          {/* Exercise cards */}
          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={ex.id}
              entry={ex}
              exIdx={exIdx}
              onRemove={() => removeExercise(ex.id)}
              onToggleField={(field) => toggleField(ex.id, field)}
              onAddSet={() => addSet(ex.id)}
              onRemoveSet={(setId) => removeSet(ex.id, setId)}
              onUpdateSet={(setId, field, val) => updateSet(ex.id, setId, field, val)}
            />
          ))}

          {/* Add Exercise button */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="btn btn-ghost w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
            style={{ border: '1px dashed var(--border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Exercise
          </button>

          {/* Error */}
          {mutation.isError && (
            <div className="rounded-md px-4 py-3 text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}>
              Failed to save — please try again
            </div>
          )}

          {/* Hold-to-confirm finish */}
          <div className="relative select-none pt-2 pb-4">
            <button
              disabled={phase === 'saving'}
              onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
              onTouchStart={startHold} onTouchEnd={stopHold}
              className="relative w-full rounded-md overflow-hidden font-semibold text-sm py-4 min-h-[56px] transition-colors"
              style={{
                background: phase === 'saving' ? 'var(--bg-elevated)' : isHolding ? 'var(--green)' : 'var(--bg-elevated)',
                color: phase === 'saving' ? 'var(--text-muted)' : isHolding ? '#fff' : 'var(--text)',
                border: `1px solid ${phase === 'saving' ? 'var(--border)' : isHolding ? 'transparent' : 'var(--border)'}`,
                cursor: phase === 'saving' ? 'not-allowed' : 'pointer',
              }}
            >
              {isHolding && (
                <span className="absolute inset-0 origin-left"
                  style={{ background: 'rgba(255,255,255,0.15)', transform: `scaleX(${holdProgress / 100})`, transition: 'none' }} />
              )}
              <span className="relative z-10">
                {phase === 'saving' ? 'Saving...' : isHolding ? `Hold ${holdCountdown}s` : 'Finish Workout'}
              </span>
            </button>
            {!isHolding && phase === 'active' && (
              <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Hold for 5 seconds to save</p>
            )}
            {phase === 'active' && !isHolding && (
              <button
                type="button"
                onClick={handleDiscard}
                className="btn btn-danger w-full mt-2 py-2.5 text-sm"
                style={{ border: '1px solid var(--border)' }}
              >
                Discard Session
              </button>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}

// ─── ExerciseCard sub-component ───────────────────────────────────────────────
interface ExerciseCardProps {
  entry: ExerciseEntry
  exIdx: number
  onRemove: () => void
  onToggleField: (field: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onUpdateSet: (setId: string, field: keyof SetRow, value: string) => void
}

function ExerciseCard({ entry, exIdx, onRemove, onToggleField, onAddSet, onRemoveSet, onUpdateSet }: ExerciseCardProps) {
  const [showOptions, setShowOptions] = useState(false)

  const fields: Array<{
    key: keyof Pick<ExerciseEntry, 'showWeight' | 'showReps' | 'showDuration' | 'showDistance' | 'showNotes'>
    label: string
    setField: keyof SetRow
    inputType: string
    placeholder: string
  }> = [
    { key: 'showWeight',   label: 'Weight (kg)', setField: 'weight_kg',    inputType: 'number', placeholder: 'kg' },
    { key: 'showReps',     label: 'Reps',        setField: 'reps',         inputType: 'number', placeholder: 'reps' },
    { key: 'showDuration', label: 'Duration',    setField: 'duration_min', inputType: 'number', placeholder: 'min' },
    { key: 'showDistance', label: 'Distance',    setField: 'distance_km',  inputType: 'number', placeholder: 'km' },
    { key: 'showNotes',    label: 'Notes',       setField: 'notes',        inputType: 'text',   placeholder: 'notes' },
  ]
  const activeFields = fields.filter((f) => entry[f.key])

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">{entry.nameCn}</div>
          {entry.nameCn !== entry.nameEn && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{entry.nameEn}</div>
          )}
        </div>
        <button onClick={() => setShowOptions(!showOptions)}
          className="btn btn-ghost p-1.5 rounded-md"
          style={{ color: 'var(--text-muted)', background: showOptions ? 'var(--bg-hover)' : 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
        <button onClick={onRemove} className="btn btn-ghost p-1.5 rounded-md btn-danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>

      {/* AI Target hint */}
      {(entry.loadingTarget || entry.nextTarget) && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-subtle)' }}>
          {entry.loadingTarget ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Calculating targets...</span>
            </div>
          ) : entry.nextTarget?.weight ? (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Suggested:{' '}
                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                  {entry.nextTarget.weight}kg x {entry.nextTarget.reps}
                </span>
                {' '}from last session
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Field toggle options */}
      {showOptions && (
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {fields.map((f) => (
            <button key={f.key} onClick={() => onToggleField(f.key)}
              className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
              style={{
                background: entry[f.key] ? 'var(--accent)' : 'var(--bg-surface)',
                color: entry[f.key] ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${entry[f.key] ? 'transparent' : 'var(--border)'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Sets table header */}
      <div className="grid px-4 py-1.5" style={{
        gridTemplateColumns: `28px ${activeFields.map(() => '1fr').join(' ')} 28px`,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}>
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>#</span>
        {activeFields.map((f) => (
          <span key={f.key} className="text-[11px] font-medium text-center" style={{ color: 'var(--text-muted)' }}>
            {f.label.split(' ')[0]}
          </span>
        ))}
        <span />
      </div>

      {/* Set rows */}
      <div>
        {entry.sets.map((set, setIdx) => (
          <div key={set.id} className="px-4 pt-2 pb-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="grid items-center gap-1" style={{
              gridTemplateColumns: `28px ${activeFields.map(() => '1fr').join(' ')} 28px`,
            }}>
              {/* Set number */}
              <span className="text-xs font-medium text-center" style={{ color: 'var(--text-muted)' }}>{setIdx + 1}</span>

              {/* Active field inputs */}
              {activeFields.map((f) => (
                <input
                  key={f.key}
                  type={f.inputType}
                  className="input text-sm text-center py-1.5 px-2"
                  placeholder={f.placeholder}
                  value={set[f.setField]}
                  onChange={(e) => onUpdateSet(set.id, f.setField, e.target.value)}
                  min={f.inputType === 'number' ? '0' : undefined}
                  step={f.setField === 'weight_kg' ? '0.5' : f.setField === 'reps' ? '1' : '0.1'}
                />
              ))}

              {/* Remove set */}
              <button onClick={() => onRemoveSet(set.id)}
                className="btn btn-ghost p-1 rounded-md mx-auto btn-danger">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* RPE + RIR row */}
            <div className="flex items-center gap-3 ml-7 mb-1">
              <RPESelector
                value={set.rpe}
                onChange={(v) => onUpdateSet(set.id, 'rpe', v)}
              />
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>RIR</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="input w-10 px-1 py-0.5 text-[11px] text-center"
                  placeholder="--"
                  value={set.rir}
                  onChange={(e) => onUpdateSet(set.id, 'rir', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add set */}
      <div className="px-4 py-2">
        <button onClick={onAddSet}
          className="btn btn-ghost flex items-center gap-1.5 text-xs font-medium py-1 px-2.5 rounded-md"
          style={{ color: 'var(--accent)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Set
        </button>
      </div>
    </div>
  )
}
