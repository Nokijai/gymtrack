interface BadgeTier {
  icon: string
  label: string
  bg: string
  text: string
}

function getTier(level: number): BadgeTier {
  if (level >= 20) return { icon: '👑', label: 'Legend', bg: '#a855f7', text: '#fff' }
  if (level >= 15) return { icon: '💎', label: 'Diamond', bg: '#60a5fa', text: '#fff' }
  if (level >= 10) return { icon: '🥇', label: 'Gold', bg: '#f59e0b', text: '#fff' }
  if (level >= 5)  return { icon: '🥈', label: 'Silver', bg: '#9ca3af', text: '#fff' }
  return             { icon: '🥉', label: 'Bronze', bg: '#cd7f32', text: '#fff' }
}

export default function LevelBadge({ level, size = 'sm' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getTier(level)
  const padding = size === 'lg' ? '0.4rem 1rem' : size === 'md' ? '0.3rem 0.75rem' : '0.2rem 0.5rem'
  const fontSize = size === 'lg' ? '1rem' : size === 'md' ? '0.85rem' : '0.75rem'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding,
        borderRadius: '9999px',
        background: tier.bg,
        color: tier.text,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {tier.icon} Lv.{level}
    </span>
  )
}
