'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { clsx } from 'clsx'
import XPBadge from './XPBadge'
import Avatar from './Avatar'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const links = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/log', label: '➕ Log Session' },
    { href: '/leaderboard', label: '🏆 Leaderboard' },
    { href: '/profile', label: '👤 Profile' },
    ...(user?.is_admin ? [{ href: '/admin', label: '🛡️ Admin' }] : []),
  ]

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-lg">🏋️ GymTrack</span>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname === l.href
                  ? 'bg-orange-500 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
              <span className="text-orange-400 font-medium text-sm">{user.username}</span>
              <XPBadge xp={user.xp} />
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 text-sm transition-colors min-h-[44px] px-2"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white text-2xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden mt-3 pb-2 border-t border-gray-800 pt-3 space-y-1">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
              <span className="text-orange-400 font-medium text-sm">{user.username}</span>
              <XPBadge xp={user.xp} />
            </div>
          )}

          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'block px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] flex items-center',
                pathname === l.href
                  ? 'bg-orange-500 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              {l.label}
            </Link>
          ))}

          <button
            onClick={() => { setMenuOpen(false); handleLogout() }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors min-h-[44px] flex items-center"
          >
            🚪 Logout
          </button>
        </div>
      )}
    </nav>
  )
}
