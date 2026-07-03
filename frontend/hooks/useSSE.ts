'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useSSE() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Pass token as query param since EventSource doesn't support headers
    const es = new EventSource(`/api/events?token=${token}`)

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data)
        if (ev.scope === 'leaderboard') {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
        }
        if (ev.scope === 'dashboard') {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
      } catch {}
    }

    es.onerror = () => {
      // EventSource auto-reconnects natively — just close on auth error
      if (es.readyState === EventSource.CLOSED) es.close()
    }

    return () => es.close()
  }, [queryClient])
}
