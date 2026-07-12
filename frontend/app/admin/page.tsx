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

        <div className="max-w-3xl mx-auto px-4 py-6 pb-8 space-y-4">

          <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Admin
          </h1>

          {/* ── Users ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Users
              </span>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : error ? (
              <div className="px-4 py-6 text-sm" style={{ color: 'var(--red)' }}>{error}</div>
            ) : (
              <div>
                {users.map((u) => (
                  <div key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* User row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium capitalize">{u.username}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Lv.{u.level} &middot; {u.xp.toLocaleString()} XP
                          {u.is_admin && <span className="ml-2" style={{ color: 'var(--orange)' }}>Admin</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-ghost text-xs" onClick={() => loadSessions(u.id, u.username)}>
                          Sessions
                        </button>
                        <button className="btn btn-ghost text-xs" onClick={() => { setXpOverrideId(xpOverrideId === u.id ? null : u.id); setXpOverrideValue(String(u.xp)); setXpError(null) }}>
                          {xpOverrideId === u.id ? 'Cancel' : 'XP'}
                        </button>
                        <button className="btn btn-ghost text-xs" onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditPassword(''); setEditError(null) }}>
                          {editingId === u.id ? 'Cancel' : 'Password'}
                        </button>
                        {u.id !== user.id && (
                          <button className="btn btn-danger text-xs" onClick={() => handleDelete(u.id, u.username)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* XP override */}
                    {xpOverrideId === u.id && (
                      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Override XP</span>
                        <input type="number" min="0" value={xpOverrideValue}
                          onChange={(e) => setXpOverrideValue(e.target.value)}
                          className="input" style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                        />
                        <button className="btn btn-primary text-xs" onClick={() => handleOverrideXP(u.id)}>Save</button>
                        <button className="btn btn-ghost text-xs" onClick={() => setXpOverrideId(null)}>Cancel</button>
                        {xpError && <span className="text-xs" style={{ color: 'var(--red)' }}>{xpError}</span>}
                      </div>
                    )}

                    {/* Password edit */}
                    {editingId === u.id && (
                      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                        <input type="password" value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="New password"
                          className="input" style={{ flex: 1, minWidth: 160, padding: '4px 8px', fontSize: 13 }}
                        />
                        <button className="btn btn-primary text-xs" onClick={() => handleChangePassword(u.id)}>Save</button>
                        {editError && <span className="text-xs" style={{ color: 'var(--red)' }}>{editError}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sessions panel ────────────────────────────────────── */}
          {sessionsPanelUserId !== null && (
            <div className="card">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sessions &mdash; <span style={{ color: 'var(--accent)' }}>{sessionsPanelUsername}</span>
                </span>
                <button onClick={() => setSessionsPanelUserId(null)}
                  className="btn btn-ghost" style={{ padding: 4, lineHeight: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {sessionsLoading ? (
                <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
              ) : sessionsError ? (
                <div className="px-4 py-6 text-sm" style={{ color: 'var(--red)' }}>{sessionsError}</div>
              ) : sessions.length === 0 ? (
                <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No sessions</div>
              ) : (
                <div>
                  {sessions.map((s) => (
                    <div key={s.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      {editingSessionId === s.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
                              <input type="date" value={editSessionForm.date}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, date: e.target.value }))}
                                className="input" style={{ fontSize: 13 }}
                              />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Duration (min)</label>
                              <input type="number" min="1" value={editSessionForm.duration_minutes}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                                className="input" style={{ fontSize: 13 }}
                              />
                            </div>
                          </div>
                          <textarea value={editSessionForm.notes}
                            onChange={(e) => setEditSessionForm((f) => ({ ...f, notes: e.target.value }))}
                            rows={2} placeholder="Notes (optional)"
                            className="input" style={{ fontSize: 13, resize: 'none' }}
                          />
                          {editSessionError && <span className="text-xs" style={{ color: 'var(--red)' }}>{editSessionError}</span>}
                          <div className="flex gap-1.5">
                            <button className="btn btn-primary text-xs" onClick={() => handleEditSession(s.id)}>Save</button>
                            <button className="btn btn-ghost text-xs" onClick={() => setEditingSessionId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{s.date}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {s.duration_minutes} min
                              {s.notes ? ` · ${s.notes}` : ''}
                              {s.exercises.length > 0 ? ` · ${s.exercises.length} ex` : ''}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button className="btn btn-ghost text-xs" onClick={() => startEditSession(s)}>Edit</button>
                            <button className="btn btn-danger text-xs" onClick={() => handleDeleteSession(s.id)}
                              disabled={deletingSessionId === s.id}>
                              {deletingSessionId === s.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Add user ──────────────────────────────────────────── */}
          <div className="card">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Add User
              </span>
            </div>
            <form onSubmit={handleAddUser} className="px-4 py-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username" required
                  className="input" style={{ flex: 1, fontSize: 13 }}
                />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password" required
                  className="input" style={{ flex: 1, fontSize: 13 }}
                />
                <button type="submit" disabled={addLoading}
                  className="btn btn-primary" style={{ opacity: addLoading ? 0.6 : 1 }}>
                  {addLoading ? 'Adding...' : 'Add User'}
                </button>
              </div>
              {addError && <p className="text-xs mt-2" style={{ color: 'var(--red)' }}>{addError}</p>}
            </form>
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}
