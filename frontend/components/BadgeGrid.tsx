'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface BadgeData {
  key: string
  name: string
  name_cn: string
  desc: string
  desc_cn: string
  icon: string
  unlocked: boolean
}

export default function BadgeGrid() {
  const { data, isLoading } = useQuery<{ badges: BadgeData[] }>({
    queryKey: ['badges'],
    queryFn: () => api.get('/profile/badges').then((r) => r.data),
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)', width: '40%' }} />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4 animate-pulse h-24" style={{ background: 'var(--bg-surface)' }} />
          ))}
        </div>
      </div>
    )
  }

  const badges = data?.badges || []
  const unlocked = badges.filter((b) => b.unlocked)
  const locked = badges.filter((b) => !b.unlocked)

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Achievements ({unlocked.length}/{badges.length})
      </h2>

      {badges.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No achievements defined yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {unlocked.map((badge) => (
            <div
              key={badge.key}
              className="rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                boxShadow: '0 0 12px rgba(34,197,94,0.15)',
              }}
              title={`${badge.desc} — ${badge.desc_cn}`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: '#4ade80' }}>
                {badge.name}
              </span>
            </div>
          ))}
          {locked.map((badge) => (
            <div
              key={badge.key}
              className="rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: 0.45,
                filter: 'grayscale(0.6)',
              }}
              title={`🔒 ${badge.desc} — ${badge.desc_cn}`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--text-muted)' }}>
                ???
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}