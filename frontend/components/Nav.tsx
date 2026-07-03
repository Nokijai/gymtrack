'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { clsx } from 'clsx'
import XPBadge from './XPBadge'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

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
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-white font-bold text-lg">🏋️ GymTrack</span>
        <div className="flex gap-1">
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
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-orange-400 font-medium text-sm">{user.username}</span>
            <XPBadge xp={user.xp} />
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-400 text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
