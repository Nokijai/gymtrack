interface BadgeTier {
  icon: string
  label: string
  bg: string
  textColor: string
  glow: string
}

function getTier(level: number): BadgeTier {
  if (level >= 50) return { icon: '👁️', label: 'GOD',       bg: 'linear-gradient(135deg,#ff006e,#8338ec)', textColor: '#fff', glow: 'rgba(255,0,110,0.5)' }
  if (level >= 45) return { icon: '✨', label: 'Celestial', bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', textColor: '#fff', glow: 'rgba(124,58,237,0.5)' }
  if (level >= 35) return { icon: '⚡', label: 'Mythic',    bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', textColor: '#fff', glow: 'rgba(245,158,11,0.5)' }
  if (level >= 25) return { icon: '💎', label: 'Platinum',  bg: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', textColor: '#fff', glow: 'rgba(56,189,248,0.4)' }
  if (level >= 20) return { icon: '👑', label: 'Legend',    bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', textColor: '#fff', glow: 'rgba(168,85,247,0.4)' }
  if (level >= 15) return { icon: '💎', label: 'Diamond',   bg: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', textColor: '#fff', glow: 'rgba(56,189,248,0.4)' }
  if (level >= 10) return { icon: '🥇', label: 'Gold',      bg: 'linear-gradient(135deg,#f59e0b,#d97706)', textColor: '#fff', glow: 'rgba(245,158,11,0.4)' }
  if (level >= 5)  return { icon: '🥈', label: 'Silver',    bg: 'linear-gradient(135deg,#94a3b8,#64748b)', textColor: '#fff', glow: 'rgba(148,163,184,0.4)' }
  return             { icon: '🥉', label: 'Bronze',   bg: 'linear-gradient(135deg,#d97706,#92400e)', textColor: '#fff', glow: 'rgba(180,120,40,0.4)' }
}

// XP required for each level (1–50) — matches backend calculate_level
export function xpForLevel(level: number): number {
  const thresholds: Record<number, number> = {
    1: 0, 2: 2, 3: 6, 4: 12, 5: 20,
    6: 30, 7: 40, 8: 50, 9: 65, 10: 80,
    11: 100, 12: 120, 13: 150, 14: 180, 15: 220,
    16: 270, 17: 330, 18: 400, 19: 500, 20: 600,
    21: 700, 22: 850, 23: 1000, 24: 1200, 25: 1400,
    26: 1600, 27: 1800, 28: 2100, 29: 2400, 30: 2700,
    31: 3100, 32: 3600, 33: 4200, 34: 4900, 35: 5700,
    36: 6700, 37: 7800, 38: 9000, 39: 10500, 40: 12000,
    41: 14000, 42: 16000, 43: 18500, 44: 21500, 45: 25000,
    46: 29000, 47: 33500, 48: 38500, 49: 44000, 50: 50000,
  }
  return thresholds[Math.min(Math.max(level, 1), 50)] ?? 50000
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(Math.min(level + 1, 50))
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