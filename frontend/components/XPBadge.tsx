export default function XPBadge({ xp, size = 'sm' }: { xp: number; size?: 'sm' | 'md' }) {
  const padding  = size === 'md' ? '0.25rem 0.7rem' : '0.15rem 0.5rem'
  const fontSize = size === 'md' ? '0.8rem' : '0.72rem'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding,
        borderRadius: '9999px',
        background: 'rgba(245,158,11,0.15)',
        color: '#fbbf24',
        border: '1px solid rgba(245,158,11,0.3)',
        fontSize,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      ⚡ {xp.toLocaleString()} XP
    </span>
  )
}
