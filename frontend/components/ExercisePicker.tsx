'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { EXERCISES, CATEGORIES, CATEGORY_LABELS, searchExercises, type Exercise } from '@/lib/exercises'

// ─── Recently-used helpers ────────────────────────────────────────────────────
const RECENT_KEY = 'gymtrack_recent_exercises'
const MAX_RECENT = 10

function loadRecent(): Exercise[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const ids: string[] = JSON.parse(raw)
    return ids
      .map((id) => EXERCISES.find((e) => e.id === id) ?? null)
      .filter(Boolean) as Exercise[]
  } catch {
    return []
  }
}

function saveRecent(exercise: Exercise): void {
  if (typeof window === 'undefined') return
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const next = [exercise.id, ...ids.filter((i) => i !== exercise.id)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SelectedExercise {
  id: string
  nameEn: string
  nameCn: string
  category: string
  equipment: string
  muscleGroup: string
  isCustom?: boolean
}

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (exercise: SelectedExercise) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExercisePicker({ open, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery]               = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName]     = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Load recent on open
  useEffect(() => {
    if (open) {
      setRecentExercises(loadRecent())
      setQuery('')
      setActiveCategory(null)
      setShowCustomInput(false)
      setCustomName('')
      // Auto-focus search after animation
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [open])

  // Filtered list
  const filtered = useMemo(() => {
    let base = EXERCISES
    if (activeCategory) base = base.filter((e) => e.category === activeCategory)
    return searchExercises(base, query)
  }, [query, activeCategory])

  // Group for display
  const grouped = useMemo(() => {
    if (query.trim()) {
      return { 'Search Results': filtered }
    }
    if (activeCategory) {
      return { [activeCategory]: filtered }
    }
    // Show all categories
    const groups: Record<string, Exercise[]> = {}
    CATEGORIES.forEach((cat) => {
      const items = filtered.filter((e) => e.category === cat)
      if (items.length > 0) groups[cat] = items
    })
    return groups
  }, [filtered, query, activeCategory])

  const handleSelect = useCallback((ex: Exercise) => {
    saveRecent(ex)
    setRecentExercises(loadRecent())
    onSelect({ ...ex })
    onClose()
  }, [onSelect, onClose])

  const handleCustomAdd = useCallback(() => {
    const name = customName.trim()
    if (!name) return
    const custom: SelectedExercise = {
      id: `custom_${Date.now()}`,
      nameEn: name,
      nameCn: name,
      category: 'Custom',
      equipment: 'Bodyweight',
      muscleGroup: '自定义',
      isCustom: true,
    }
    onSelect(custom)
    onClose()
  }, [customName, onSelect, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2 className="font-bold text-base flex-1">Add Exercise</h2>
        <button
          onClick={() => { setShowCustomInput(!showCustomInput); setCustomName('') }}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--accent)', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Custom
        </button>
      </div>

      {/* ── Custom exercise input ───────────────────────────────────────────── */}
      {showCustomInput && (
        <div
          className="px-4 py-3 border-b flex gap-2"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
        >
          <input
            type="text"
            className="flex-1 rounded-xl px-3 py-2.5 text-sm border"
            style={{ background: 'var(--bg-surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
            placeholder="Custom exercise name…"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
            autoFocus
          />
          <button
            onClick={handleCustomAdd}
            disabled={!customName.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: customName.trim() ? 'var(--accent)' : 'var(--bg-surface)',
              color: customName.trim() ? '#fff' : 'var(--text-muted)',
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
            placeholder="Search English or 中文…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveCategory(null) }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Category tabs ──────────────────────────────────────────────────── */}
      {!query && (
        <div className="overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-1 px-4 py-2 whitespace-nowrap" style={{ minWidth: 'max-content' }}>
            <CategoryTab
              label="全部"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {CATEGORIES.map((cat) => (
              <CategoryTab
                key={cat}
                label={CATEGORY_LABELS[cat] ?? cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Scrollable list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Recently used */}
        {!query && !activeCategory && recentExercises.length > 0 && (
          <div>
            <SectionHeader label="最近使用" labelEn="Recently Used" />
            {recentExercises.map((ex) => (
              <ExerciseRow key={`recent_${ex.id}`} exercise={ex} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {/* Grouped results */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <SectionHeader
              label={CATEGORY_LABELS[cat] ?? cat}
              labelEn={cat}
            />
            {items.map((ex) => (
              <ExerciseRow key={ex.id} exercise={ex} onSelect={handleSelect} />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No exercises found</p>
            <button
              onClick={() => { setShowCustomInput(true); setQuery('') }}
              className="text-sm px-4 py-2 rounded-xl font-medium"
              style={{ color: 'var(--accent)', background: 'rgba(59,130,246,0.1)' }}
            >
              + Add Custom Exercise
            </button>
          </div>
        )}

        {/* Bottom padding for mobile nav */}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      style={{
        color: active ? '#fff' : 'var(--text-muted)',
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        boxShadow: active ? '0 0 8px var(--accent-glow)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

function SectionHeader({ label, labelEn }: { label: string; labelEn?: string }) {
  return (
    <div
      className="px-4 py-2.5 flex items-center gap-2"
      style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
        {label}
      </span>
      {labelEn && labelEn !== label && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {labelEn}
        </span>
      )}
    </div>
  )
}

function ExerciseRow({ exercise, onSelect }: { exercise: Exercise; onSelect: (ex: Exercise) => void }) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="w-full flex items-center justify-between px-4 py-3.5 border-b text-left transition-colors"
      style={{ borderColor: 'var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 flex-1">
        <div className="font-bold text-base leading-tight" style={{ color: 'var(--text)' }}>
          {exercise.nameCn}
        </div>
        <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {exercise.nameEn}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {exercise.equipment}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  )
}
