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

// XP required for each level (1–50) — 8x scaled for new formula
export function xpForLevel(level: number): number {
  const thresholds: Record<number, number> = {
    1: 0, 2: 16, 3: 48, 4: 96, 5: 160,
    6: 240, 7: 320, 8: 400, 9: 520, 10: 640,
    11: 800, 12: 960, 13: 1200, 14: 1440, 15: 1760,
    16: 2160, 17: 2640, 18: 3200, 19: 4000, 20: 4800,
    21: 5600, 22: 6800, 23: 8000, 24: 9600, 25: 11200,
    26: 12800, 27: 14400, 28: 16800, 29: 19200, 30: 21600,
    31: 24800, 32: 28800, 33: 33600, 34: 39200, 35: 45600,
    36: 53600, 37: 62400, 38: 72000, 39: 84000, 40: 96000,
    41: 112000, 42: 128000, 43: 148000, 44: 172000, 45: 200000,
    46: 232000, 47: 268000, 48: 308000, 49: 352000, 50: 400000,
  }
  return thresholds[Math.min(Math.max(level, 1), 50)] ?? 400000
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