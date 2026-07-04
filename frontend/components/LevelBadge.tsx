interface BadgeTier {
  icon: string
  label: string
  bg: string
  textColor: string
  glow: string
}

function getTier(level: number): BadgeTier {
  if (level >= 20) return { icon: '👑', label: 'Legend',   bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', textColor: '#fff', glow: 'rgba(168,85,247,0.4)' }
  if (level >= 15) return { icon: '💎', label: 'Diamond',  bg: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', textColor: '#fff', glow: 'rgba(56,189,248,0.4)' }
  if (level >= 10) return { icon: '🥇', label: 'Gold',     bg: 'linear-gradient(135deg,#f59e0b,#d97706)', textColor: '#fff', glow: 'rgba(245,158,11,0.4)' }
  if (level >= 5)  return { icon: '🥈', label: 'Silver',   bg: 'linear-gradient(135deg,#94a3b8,#64748b)', textColor: '#fff', glow: 'rgba(148,163,184,0.4)' }
  return             { icon: '🥉', label: 'Bronze',  bg: 'linear-gradient(135deg,#d97706,#92400e)', textColor: '#fff', glow: 'rgba(180,120,40,0.4)' }
}

// XP required for each level (1–20)
export function xpForLevel(level: number): number {
  const thresholds: Record<number, number> = {
    1: 0, 2: 100, 3: 250, 4: 500, 5: 900,
    6: 1400, 7: 2000, 8: 2800, 9: 3700, 10: 5000,
    11: 6500, 12: 8200, 13: 10000, 14: 12500, 15: 15000,
    16: 18000, 17: 21500, 18: 25000, 19: 29000, 20: 33000,
  }
  return thresholds[Math.min(Math.max(level, 1), 20)] ?? 0
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(Math.min(level + 1, 20))
}

export default function LevelBadge({ level, size = 'sm' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getTier(level)
  const padding  = size === 'lg' ? '0.35rem 0.9rem' : size === 'md' ? '0.25rem 0.7rem' : '0.15rem 0.5rem'
  const fontSize = size === 'lg' ? '0.95rem'         : size === 'md' ? '0.8rem'         : '0.72rem'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding,
        borderRadius: '9999px',
        background: tier.bg,
        color: tier.textColor,
        fontSize,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        boxShadow: `0 0 8px ${tier.glow}`,
        letterSpacing: '0.01em',
      }}
    >
      {tier.icon} Lv.{level}
    </span>
  )
}
