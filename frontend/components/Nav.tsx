'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useTimerStore } from '@/lib/store'
import Avatar from './Avatar'
import XPBadge from './XPBadge'

// Minimal icons
const icons = {
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { isRunning } = useTimerStore()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const primaryLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/log', label: 'Workout' },
  ]

  const secondaryLinks = [
    { href: '/programs', label: 'Programs' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/recovery', label: 'Recovery' },
    { href: '/profile', label: 'Profile' },
    ...(user?.is_admin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 h-14 border-b sticky top-0 z-40"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

        <Link href="/dashboard" className="font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          GymTrack
        </Link>

        <nav className="flex items-center gap-1">
          {primaryLinks.map((l) => {
            const isActive = pathname === l.href
            return (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent)' : 'transparent',
                }}>
                {l.label}
              </Link>
            )
          })}

          {/* Dropdown Menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              More {icons.chevron}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 rounded-lg shadow-lg z-50"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {secondaryLinks.map((l) => {
                    const isActive = pathname === l.href
                    return (
                      <Link key={l.href} href={l.href}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm transition-colors"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {l.label}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
              <XPBadge xp={user.xp} />
            </div>
          )}
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-md"
            style={{ color: 'var(--text-muted)' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-stretch h-16">
          {[...primaryLinks, ...secondaryLinks.slice(0, 3)].map((l) => {
            const isActive = pathname === l.href
            return (
              <Link key={l.href} href={l.href}
                className="flex-1 flex flex-col items-center justify-center text-xs"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                {l.label}
              </Link>
            )
          })}
          <button onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center text-xs"
            style={{ color: 'var(--text-muted)' }}>
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}