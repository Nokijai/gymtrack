'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useTimerStore } from '@/lib/store'
import Avatar from './Avatar'
import XPBadge from './XPBadge'

// ─── Routes ──────────────────────────────────────────────────────────────────
const PRIMARY_ROUTES = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/log', label: 'Workout' },
  { href: '/programs', label: 'Programs' },
  { href: '/leaderboard', label: 'Ranks' },
]

const SECONDARY_ROUTES = [
  { href: '/recovery', label: 'Recovery' },
  { href: '/profile', label: 'Profile' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header 
      className="sticky top-0 z-40 border-b"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between h-12 px-4 md:px-6 max-w-6xl mx-auto">
        {/* Logo */}
        <Link 
          href="/dashboard" 
          className="font-semibold text-sm mr-6 shrink-0"
          style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
        >
          GymTrack
        </Link>

        {/* Desktop: primary routes inline */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {PRIMARY_ROUTES.map((r) => {
            const active = isActive(r.href)
            return (
              <Link
                key={r.href}
                href={r.href}
                className="px-3 py-1.5 text-sm rounded-md transition-colors"
                style={{
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {r.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side: avatar + XP + More */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden md:flex items-center gap-2 mr-1">
              <XPBadge xp={user.xp} />
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
            </div>
          )}

          {/* More dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-md transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="More menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-44 py-1 rounded-lg shadow-lg z-50"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                {/* Mobile: show all routes */}
                <div className="md:hidden">
                  {[...PRIMARY_ROUTES, ...SECONDARY_ROUTES].map((r) => {
                    const active = isActive(r.href)
                    return (
                      <Link
                        key={r.href}
                        href={r.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm"
                        style={{
                          color: active ? 'var(--text)' : 'var(--text-secondary)',
                          background: active ? 'var(--bg-hover)' : 'transparent',
                        }}
                      >
                        {r.label}
                      </Link>
                    )
                  })}
                  {user?.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Admin
                    </Link>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                </div>

                {/* Desktop: secondary routes only */}
                <div className="hidden md:block">
                  {SECONDARY_ROUTES.map((r) => {
                    const active = isActive(r.href)
                    return (
                      <Link
                        key={r.href}
                        href={r.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm"
                        style={{
                          color: active ? 'var(--text)' : 'var(--text-secondary)',
                          background: active ? 'var(--bg-hover)' : 'transparent',
                        }}
                      >
                        {r.label}
                      </Link>
                    )
                  })}
                  {user?.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Admin
                    </Link>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                </div>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}