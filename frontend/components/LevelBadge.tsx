const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-gray-600 text-gray-200',
  2: 'bg-green-700 text-green-100',
  3: 'bg-blue-700 text-blue-100',
  4: 'bg-purple-700 text-purple-100',
  5: 'bg-orange-500 text-white',
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Rookie',
  2: 'Grinder',
  3: 'Beast',
  4: 'Monster',
  5: 'Legend',
}

export default function LevelBadge({ level }: { level: number }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[level] ?? LEVEL_COLORS[1]}`}>
      Lv.{level} {LEVEL_NAMES[level] ?? 'Rookie'}
    </span>
  )
}
