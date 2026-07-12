'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useTimerStore } from '@/lib/store'
import Avatar from './Avatar'
import XPBadge from './XPBadge'

const icons = {
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const allLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/programs', label: 'Programs' },
    { href: '/log', label: 'Workout' },
    { href: '/leaderboard', label: 'Ranks' },
    { href: '/recovery', label: 'Recovery' },
    { href: '/profile', label: 'Profile' },
    ...(user?.is_admin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        
        {/* Logo */}
        <Link href="/dashboard" className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          GymTrack
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {allLinks.slice(0, 4).map((l) => {
            const isActive = pathname === l.href
            return (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                }}>
                {l.label}
              </Link>
            )
          })}

          {/* More Dropdown */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              More {icons.chevron}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg shadow-lg z-50"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {allLinks.slice(4).map((l) => {
                    const isActive = pathname === l.href
                    return (
                      <Link key={l.href} href={l.href}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {l.label}
                      </Link>
                    )
                  })}
                  <hr style={{ borderColor: 'var(--border)' }} />
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm"
                    style={{ color: '#f87171' }}>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Mobile: right-aligned More button */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden px-2 py-1.5 rounded-md text-sm"
          style={{ color: 'var(--text-muted)' }}>
          More {icons.chevron}
        </button>

        {/* Mobile Menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="fixed top-14 right-2 z-50 w-48 py-1 rounded-lg shadow-lg"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {allLinks.map((l) => {
                const isActive = pathname === l.href
                return (
                  <Link key={l.href} href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {l.label}
                  </Link>
                )
              })}
              <hr style={{ borderColor: 'var(--border)' }} />
              <button onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm"
                style={{ color: '#f87171' }}>
                Sign out
              </button>
            </div>
          </>
        )}

        {/* User info (desktop only) */}
        <div className="hidden md:flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
              <XPBadge xp={user.xp} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}