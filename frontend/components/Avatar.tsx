'use client'
import { useState } from 'react'

const avatarColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899']

export const getAvatarColor = (username: string) =>
  avatarColors[username.charCodeAt(0) % avatarColors.length]

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-xl',
  lg: 'w-24 h-24 text-4xl',
}

const imgSizeStyle: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
  sm: { width: 32, height: 32, minWidth: 32, minHeight: 32 },
  md: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
  lg: { width: 96, height: 96, minWidth: 96, minHeight: 96 },
}

interface AvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  avatarUrl?: string | null
}

export default function Avatar({ username, size = 'md', avatarUrl }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  // Show image if we have a URL and it hasn't errored
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={`${username}'s avatar`}
        style={imgSizeStyle[size]}
        className="rounded-full object-cover shadow-lg flex-shrink-0 block"
        onError={() => setImgError(true)}
      />
    )
  }

  // Initials fallback
  const color = getAvatarColor(username)
  const initials = username ? username[0].toUpperCase() : '?'
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-lg text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}
