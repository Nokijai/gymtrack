'use client'

const avatarColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899']

export const getAvatarColor = (username: string) =>
  avatarColors[username.charCodeAt(0) % avatarColors.length]

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-xl',
  lg: 'w-24 h-24 text-4xl',
}

const imgSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
}

interface AvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  avatarUrl?: string | null
}

export default function Avatar({ username, size = 'md', avatarUrl }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${username}'s avatar`}
        className={`${imgSizes[size]} rounded-full object-cover shadow-lg flex-shrink-0`}
      />
    )
  }

  const color = getAvatarColor(username)
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-lg text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {username[0].toUpperCase()}
    </div>
  )
}
