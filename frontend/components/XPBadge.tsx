export default function XPBadge({ xp, size = 'sm' }: { xp: number; size?: 'sm' | 'md' }) {
  const padding = size === 'md' ? '0.3rem 0.75rem' : '0.2rem 0.5rem'
  const fontSize = size === 'md' ? '0.85rem' : '0.75rem'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        padding,
        borderRadius: '9999px',
        background: '#f59e0b',
        color: '#fff',
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      ⚡ {xp.toLocaleString()} XP
    </span>
  )
}
