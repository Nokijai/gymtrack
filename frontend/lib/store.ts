import { create } from 'zustand'
import type { User } from './types'

// ─── Auth Store ──────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
}))

// ─── Timer Store (background-persistent) ─────────────────────────────────────
// Uses startTimestamp in localStorage so elapsed time survives page navigation
// and app backgrounding. elapsed is ALWAYS computed as Date.now() - startTimestamp.

const TIMER_KEY = 'gymtrack_timer_start'

export interface TimerState {
  /** Whether a workout is currently in progress */
  isRunning: boolean
  /** The epoch ms when the timer was started (stored in localStorage) */
  startTimestamp: number | null
  /** Current displayed elapsed seconds — derived, updated by tick() */
  elapsed: number

  /** Call when user taps "Start Workout" */
  startTimer: () => void
  /** Sync elapsed from stored timestamp (call on visibility, focus, render) */
  syncElapsed: () => void
  /** Stop & clear the timer (called when session is saved) */
  stopTimer: () => void
}

export const useTimerStore = create<TimerState>((set) => {
  // Rehydrate from localStorage on module load
  let initialTimestamp: number | null = null
  let initialElapsed = 0
  let initialRunning = false

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TIMER_KEY)
    if (stored) {
      const ts = parseInt(stored, 10)
      if (!isNaN(ts)) {
        initialTimestamp = ts
        initialElapsed = Math.floor((Date.now() - ts) / 1000)
        initialRunning = true
      }
    }
  }

  return {
    isRunning: initialRunning,
    startTimestamp: initialTimestamp,
    elapsed: initialElapsed,

    startTimer: () => {
      const ts = Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(TIMER_KEY, String(ts))
      }
      set({ isRunning: true, startTimestamp: ts, elapsed: 0 })
    },

    syncElapsed: () => {
      if (typeof window === 'undefined') return
      const stored = localStorage.getItem(TIMER_KEY)
      if (!stored) return
      const ts = parseInt(stored, 10)
      if (isNaN(ts)) return
      const elapsed = Math.floor((Date.now() - ts) / 1000)
      set({ elapsed, startTimestamp: ts, isRunning: true })
    },

    stopTimer: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TIMER_KEY)
      }
      set({ isRunning: false, startTimestamp: null, elapsed: 0 })
    },
  }
})
