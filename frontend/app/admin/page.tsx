'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Nav from '@/components/Nav'
import AuthGuard from '@/components/AuthGuard'
import api from '@/lib/api'

interface AdminUser {
  id: number
  username: string
  xp: number
  level: number
  is_admin: boolean
}

interface AdminSession {
  id: number
  user_id: number
  date: string
  duration_minutes: number
  notes: string | null
  exercises: { id: number; name: string; sets: number; reps: number; weight_kg: number | null }[]
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [users, setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addError, setAddError]       = useState<string | null>(null)
  const [addLoading, setAddLoading]   = useState(false)

  const [editingId, setEditingId]       = useState<number | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError]       = useState<string | null>(null)

  const [xpOverrideId, setXpOverrideId]     = useState<number | null>(null)
  const [xpOverrideValue, setXpOverrideValue] = useState('')
  const [xpError, setXpError]               = useState<string | null>(null)

  const [sessionsPanelUserId, setSessionsPanelUserId]     = useState<number | null>(null)
  const [sessionsPanelUsername, setSessionsPanelUsername] = useState('')
  const [sessions, setSessions]                           = useState<AdminSession[]>([])
  const [sessionsLoading, setSessionsLoading]             = useState(false)
  const [sessionsError, setSessionsError]                 = useState<string | null>(null)

  const [editingSessionId, setEditingSessionId]   = useState<number | null>(null)
  const [editSessionForm, setEditSessionForm]     = useState({ date: '', duration_minutes: '', notes: '' })
  const [editSessionError, setEditSessionError]   = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)

  useEffect(() => {
    if (user === null) return
    if (!user.is_admin) router.replace('/dashboard')
  }, [user, router])

  function loadUsers() {
    setLoading(true)
    api.get('/admin/users')
      .then((r) => { setUsers(r.data); setLoading(false) })
      .catch((e) => { setError(e.response?.data?.detail ?? 'Failed to load users'); setLoading(false) })
  }

  useEffect(() => { if (user?.is_admin) loadUsers() }, [user])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault(); setAddError(null); setAddLoading(true)
    try {
      await api.post('/admin/users', { username: newUsername, password: newPassword })
      setNewUsername(''); setNewPassword(''); loadUsers()
    } catch (e: any) { setAddError(e.response?.data?.detail ?? 'Failed to create user') }
    finally { setAddLoading(false) }
  }

  async function handleChangePassword(userId: number) {
    setEditError(null)
    if (!editPassword) { setEditError('Password cannot be empty'); return }
    try {
      await api.put(`/admin/users/${userId}/password`, { new_password: editPassword })
      setEditingId(null); setEditPassword('')
    } catch (e: any) { setEditError(e.response?.data?.detail ?? 'Failed to update password') }
  }

  async function handleDelete(userId: number, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try { await api.delete(`/admin/users/${userId}`); loadUsers() }
    catch (e: any) { alert(e.response?.data?.detail ?? 'Failed to delete user') }
  }

  async function handleOverrideXP(userId: number) {
    setXpError(null)
    const xp = parseInt(xpOverrideValue)
    if (isNaN(xp) || xp < 0) { setXpError('Enter a valid non-negative number'); return }
    try {
      await api.put(`/admin/users/${userId}/xp`, { xp })
      setXpOverrideId(null); setXpOverrideValue(''); loadUsers()
    } catch (e: any) { setXpError(e.response?.data?.detail ?? 'Failed to override XP') }
  }

  async function loadSessions(userId: number, username: string) {
    setSessionsPanelUserId(userId); setSessionsPanelUsername(username)
    setSessionsLoading(true); setSessionsError(null); setEditingSessionId(null)
    try {
      const r = await api.get(`/admin/users/${userId}/sessions`)
      setSessions(r.data)
    } catch (e: any) { setSessionsError(e.response?.data?.detail ?? 'Failed to load sessions') }
    finally { setSessionsLoading(false) }
  }

  function startEditSession(s: AdminSession) {
    setEditingSessionId(s.id)
    setEditSessionForm({ date: s.date, duration_minutes: String(s.duration_minutes), notes: s.notes ?? '' })
    setEditSessionError(null)
  }

  async function handleEditSession(sessionId: number) {
    setEditSessionError(null)
    const dur = parseInt(editSessionForm.duration_minutes)
    if (!editSessionForm.date || isNaN(dur) || dur < 1) {
      setEditSessionError('Date and valid duration are required'); return
    }
    try {
      await api.put(`/admin/sessions/${sessionId}`, {
        date: editSessionForm.date,
        duration_minutes: dur,
        notes: editSessionForm.notes || null,
      })
      setEditingSessionId(null)
      if (sessionsPanelUserId !== null) loadSessions(sessionsPanelUserId, sessionsPanelUsername)
      loadUsers()
    } catch (e: any) { setEditSessionError(e.response?.data?.detail ?? 'Failed to update session') }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm('Delete this session? XP and streak will be recalculated.')) return
    setDeletingSessionId(sessionId)
    try {
      await api.delete(`/admin/sessions/${sessionId}`)
      if (sessionsPanelUserId !== null) loadSessions(sessionsPanelUserId, sessionsPanelUsername)
      loadUsers()
    } catch (e: any) { alert(e.response?.data?.detail ?? 'Failed to delete session') }
    finally { setDeletingSessionId(null) }
  }

  if (!user || !user.is_admin) return null

  return (
    <AuthGuard>
      <div className="min-h-screen page-fade" style={{ background: 'var(--bg-base)', color: 'var(--text)' }}>
        <Nav />

        <div className="max-w-3xl mx-auto px-4 py-6 pb-8 space-y-5">

          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>🛡️</span> Admin Panel
          </h1>

          {/* ── Users table ─────────────────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Users
              </h2>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
            ) : error ? (
              <div className="px-5 py-8 text-red-400 text-sm">{error}</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {users.map((u) => (
                  <div key={u.id}>
                    {/* User row */}
                    <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm capitalize">{u.username}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Lv.{u.level} · {u.xp.toLocaleString()} XP
                          {u.is_admin && <span className="ml-2 text-orange-400 font-semibold">Admin</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ActionBtn onClick={() => loadSessions(u.id, u.username)} color="blue">Sessions</ActionBtn>
                        <ActionBtn onClick={() => { setXpOverrideId(xpOverrideId === u.id ? null : u.id); setXpOverrideValue(String(u.xp)); setXpError(null) }} color="yellow">XP</ActionBtn>
                        <ActionBtn onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditPassword(''); setEditError(null) }} color="gray">
                          {editingId === u.id ? 'Cancel' : 'Password'}
                        </ActionBtn>
                        {u.id !== user.id && (
                          <ActionBtn onClick={() => handleDelete(u.id, u.username)} color="red">Delete</ActionBtn>
                        )}
                      </div>
                    </div>

                    {/* XP override */}
                    {xpOverrideId === u.id && (
                      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'rgba(245,158,11,0.05)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>Override XP:</span>
                          <input type="number" min="0" value={xpOverrideValue}
                            onChange={(e) => setXpOverrideValue(e.target.value)}
                            className="w-28 rounded-lg px-3 py-1.5 text-sm border"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                          />
                          <ActionBtn onClick={() => handleOverrideXP(u.id)} color="yellow">Save</ActionBtn>
                          <button onClick={() => setXpOverrideId(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                        </div>
                        {xpError && <p className="text-red-400 text-xs mt-1">{xpError}</p>}
                      </div>
                    )}

                    {/* Password edit */}
                    {editingId === u.id && (
                      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="password" value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="New password"
                            className="flex-1 min-w-[160px] rounded-lg px-3 py-1.5 text-sm border"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                          />
                          <ActionBtn onClick={() => handleChangePassword(u.id)} color="gray">Save</ActionBtn>
                        </div>
                        {editError && <p className="text-red-400 text-xs mt-1">{editError}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sessions panel ──────────────────────────────────────────── */}
          {sessionsPanelUserId !== null && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                  Sessions: <span style={{ color: 'var(--accent)' }}>{sessionsPanelUsername}</span>
                </h2>
                <button onClick={() => setSessionsPanelUserId(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {sessionsLoading ? (
                <div className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
              ) : sessionsError ? (
                <div className="px-5 py-6 text-red-400 text-sm">{sessionsError}</div>
              ) : sessions.length === 0 ? (
                <div className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No sessions.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {sessions.map((s) => (
                    <div key={s.id} className="px-5 py-4">
                      {editingSessionId === s.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
                              <input type="date" value={editSessionForm.date}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, date: e.target.value }))}
                                className="w-full rounded-xl px-3 py-2.5 text-sm border min-h-[44px]"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Duration (min)</label>
                              <input type="number" min="1" value={editSessionForm.duration_minutes}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                                className="w-full rounded-xl px-3 py-2.5 text-sm border min-h-[44px]"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                              />
                            </div>
                          </div>
                          <textarea value={editSessionForm.notes}
                            onChange={(e) => setEditSessionForm((f) => ({ ...f, notes: e.target.value }))}
                            rows={2} placeholder="Notes (optional)"
                            className="w-full rounded-xl px-3 py-2.5 text-sm border resize-none"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                          />
                          {editSessionError && <p className="text-red-400 text-xs">{editSessionError}</p>}
                          <div className="flex gap-2">
                            <ActionBtn onClick={() => handleEditSession(s.id)} color="blue">Save</ActionBtn>
                            <ActionBtn onClick={() => setEditingSessionId(null)} color="gray">Cancel</ActionBtn>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{s.date}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {s.duration_minutes} min
                              {s.notes ? ` · ${s.notes}` : ''}
                              {s.exercises.length > 0 ? ` · ${s.exercises.length} ex` : ''}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <ActionBtn onClick={() => startEditSession(s)} color="gray">Edit</ActionBtn>
                            <ActionBtn onClick={() => handleDeleteSession(s.id)} color="red"
                              disabled={deletingSessionId === s.id}>
                              {deletingSessionId === s.id ? '…' : 'Del'}
                            </ActionBtn>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Add user form ──────────────────────────────────────────── */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Add User
            </h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username" required
                  className="flex-1 rounded-xl px-4 py-3 text-sm border min-h-[48px]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password" required
                  className="flex-1 rounded-xl px-4 py-3 text-sm border min-h-[48px]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' }}
                />
                <button type="submit" disabled={addLoading}
                  className="rounded-xl px-5 py-3 text-sm font-semibold min-h-[48px] transition-opacity"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: addLoading ? 0.7 : 1 }}>
                  {addLoading ? 'Adding…' : 'Add User'}
                </button>
              </div>
              {addError && <p className="text-red-400 text-sm">{addError}</p>}
            </form>
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}

// Reusable small action button
function ActionBtn({
  children, onClick, color = 'gray', disabled = false
}: {
  children: React.ReactNode
  onClick?: () => void
  color?: 'blue' | 'yellow' | 'red' | 'gray'
  disabled?: boolean
}) {
  const colorMap = {
    blue:   { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa',  border: 'rgba(59,130,246,0.3)' },
    yellow: { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24',  border: 'rgba(245,158,11,0.3)' },
    red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171',  border: 'rgba(239,68,68,0.25)' },
    gray:   { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)', border: 'var(--border)' },
  }
  const c = colorMap[color]
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[32px] transition-opacity"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </button>
  )
}
