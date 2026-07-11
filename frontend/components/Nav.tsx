'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, useTimerStore } from '@/lib/store'
import Avatar from './Avatar'
import XPBadge from './XPBadge'

// Lucide-style icons (inline SVG to avoid extra deps)
const icons = {
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  log: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="12" x2="15" y2="14"/>
    </svg>
  ),
  leaderboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 20 18 10"/>
      <polyline points="12 20 12 4"/>
      <polyline points="6 20 6 14"/>
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  recovery: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  admin: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z"/>
    </svg>
  ),
  programs: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1"/>
      <rect x="3" y="10" width="18" height="4" rx="1"/>
      <rect x="3" y="16" width="18" height="4" rx="1"/>
    </svg>
  ),
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { isRunning } = useTimerStore()

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { href: '/programs', label: 'Programs', icon: icons.programs },
    { href: '/log', label: 'Workout', icon: icons.log },
    { href: '/leaderboard', label: 'Ranks', icon: icons.leaderboard },
    { href: '/recovery', label: 'Recovery', icon: icons.recovery },
    { href: '/profile', label: 'Profile', icon: icons.profile },
    ...(user?.is_admin ? [{ href: '/admin', label: 'Admin', icon: icons.admin }] : []),
  ]

  return (
    <>
      {/* ── Top bar (desktop) ─────────────────────────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-6 h-14 border-b sticky top-0 z-40"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <span className="text-xl">💪</span>
          <span style={{ color: 'var(--text)' }}>GymTrack</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const isActive = pathname === l.href
            const isLog = l.href === '/log'
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  boxShadow: isActive ? `0 0 12px var(--accent-glow)` : 'none',
                }}
              >
                {isLog && isRunning && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                {l.label}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar username={user.username} size="sm" avatarUrl={user.avatar_url} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{user.username}</span>
              <XPBadge xp={user.xp} />
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Bottom navigation bar (mobile) ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-safe"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-stretch h-16">
          {links.map((l) => {
            const isActive = pathname === l.href
            const isLog = l.href === '/log'
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'var(--accent)' }} />
                )}
                {/* Timer running dot */}
                {isLog && isRunning && !isActive && (
                  <span className="absolute top-2 right-1/2 translate-x-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {l.icon}
                </span>
                <span className="text-[10px] font-medium"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {l.label}
                </span>
              </Link>
            )
          })}
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Bottom padding spacer for mobile so content clears the nav */}
      <div className="md:hidden h-16" />
    </>
  )
}
