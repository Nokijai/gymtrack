'use client'
import { useState, useEffect, useCallback } from 'react'

const BADGE_NAMES: Record<string, { name: string; name_cn: string; icon: string; desc: string }> = {
  first_blood:   { name: 'First Blood',   name_cn: '首勝',   icon: '🏅', desc: 'Complete your first workout' },
  streak_3:      { name: 'On Fire',       name_cn: '火熱',   icon: '🔥', desc: '3-day streak' },
  streak_7:      { name: 'Iron Will',     name_cn: '鋼鐵意志', icon: '⚔️', desc: '7-day streak' },
  streak_14:     { name: 'Unstoppable',   name_cn: '勢不可擋', icon: '💀', desc: '14-day streak' },
  volume_1000:   { name: 'Volume Rookie', name_cn: '菜鳥之力', icon: '🏋️', desc: '1,000kg total volume' },
  volume_10000:  { name: 'Volume King',   name_cn: '重量之王', icon: '👑', desc: '10,000kg total volume' },
  sessions_10:   { name: 'Getting Started',name_cn: '開始上路', icon: '📈', desc: '10 sessions' },
  sessions_50:   { name: 'Dedicated',     name_cn: '堅持不懈', icon: '🎯', desc: '50 sessions' },
  sessions_100:  { name: 'Centurion',     name_cn: '百戰勇士', icon: '⚡', desc: '100 sessions' },
  level_10:      { name: 'Rising Star',   name_cn: '新星崛起', icon: '⭐', desc: 'Reach level 10' },
  level_25:      { name: 'Elite',         name_cn: '精英',   icon: '💎', desc: 'Reach level 25' },
  level_50:      { name: 'Ascended',      name_cn: '飛昇',   icon: '👁️', desc: 'Reach level 50' },
}

export default function BadgeUnlockPopup() {
  const [badges, setBadges] = useState<string[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handler(e: CustomEvent) {
      const keys = e.detail?.badges || []
      if (keys.length > 0) {
        setBadges(keys)
        setVisible(true)
        // Auto-hide after 5 seconds
        setTimeout(() => setVisible(false), 5000)
      }
    }
    window.addEventListener('badge-unlock', handler as EventListener)
    return () => window.removeEventListener('badge-unlock', handler as EventListener)
  }, [])

  if (!visible || badges.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={() => setVisible(false)} />
      <div className="relative rounded-3xl p-6 w-full max-w-sm text-center space-y-4 animate-bounce-in pointer-events-auto"
        style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #2a1a3e 100%)',
          border: '2px solid rgba(168,85,247,0.4)',
          boxShadow: '0 0 40px rgba(168,85,247,0.3)',
        }}>
        <div className="text-4xl animate-pulse">🏆</div>
        <h2 className="text-xl font-bold" style={{ color: '#a855f7' }}>
          Achievement Unlocked!
        </h2>
        <div className="space-y-3">
          {badges.map((key) => {
            const b = BADGE_NAMES[key]
            if (!b) return null
            return (
              <div key={key} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <span className="text-3xl">{b.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-sm">{b.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Nice! 🔥
        </button>
      </div>
    </div>
  )
}