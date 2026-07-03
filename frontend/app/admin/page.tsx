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

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add user form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // Inline password edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  // XP override
  const [xpOverrideId, setXpOverrideId] = useState<number | null>(null)
  const [xpOverrideValue, setXpOverrideValue] = useState('')
  const [xpError, setXpError] = useState<string | null>(null)

  // Sessions panel
  const [sessionsPanelUserId, setSessionsPanelUserId] = useState<number | null>(null)
  const [sessionsPanelUsername, setSessionsPanelUsername] = useState('')
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  // Session edit inline
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editSessionForm, setEditSessionForm] = useState({ date: '', duration_minutes: '', notes: '' })
  const [editSessionError, setEditSessionError] = useState<string | null>(null)

  // Delete session confirm
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)

  // Redirect non-admins
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

  // Add user
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    setAddLoading(true)
    try {
      await api.post('/admin/users', { username: newUsername, password: newPassword })
      setNewUsername('')
      setNewPassword('')
      loadUsers()
    } catch (e: any) {
      setAddError(e.response?.data?.detail ?? 'Failed to create user')
    } finally { setAddLoading(false) }
  }

  // Change password
  async function handleChangePassword(userId: number) {
    setEditError(null)
    if (!editPassword) { setEditError('Password cannot be empty'); return }
    try {
      await api.put(`/admin/users/${userId}/password`, { new_password: editPassword })
      setEditingId(null)
      setEditPassword('')
    } catch (e: any) { setEditError(e.response?.data?.detail ?? 'Failed to update password') }
  }

  // Delete user
  async function handleDelete(userId: number, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${userId}`)
      loadUsers()
    } catch (e: any) { alert(e.response?.data?.detail ?? 'Failed to delete user') }
  }

  // Override XP
  async function handleOverrideXP(userId: number) {
    setXpError(null)
    const xp = parseInt(xpOverrideValue)
    if (isNaN(xp) || xp < 0) { setXpError('Enter a valid non-negative number'); return }
    try {
      await api.put(`/admin/users/${userId}/xp`, { xp })
      setXpOverrideId(null)
      setXpOverrideValue('')
      loadUsers()
    } catch (e: any) { setXpError(e.response?.data?.detail ?? 'Failed to override XP') }
  }

  // View sessions
  async function loadSessions(userId: number, username: string) {
    setSessionsPanelUserId(userId)
    setSessionsPanelUsername(username)
    setSessionsLoading(true)
    setSessionsError(null)
    setEditingSessionId(null)
    try {
      const r = await api.get(`/admin/users/${userId}/sessions`)
      setSessions(r.data)
    } catch (e: any) {
      setSessionsError(e.response?.data?.detail ?? 'Failed to load sessions')
    } finally { setSessionsLoading(false) }
  }

  // Edit session
  function startEditSession(s: AdminSession) {
    setEditingSessionId(s.id)
    setEditSessionForm({ date: s.date, duration_minutes: String(s.duration_minutes), notes: s.notes ?? '' })
    setEditSessionError(null)
  }

  async function handleEditSession(sessionId: number) {
    setEditSessionError(null)
    const dur = parseInt(editSessionForm.duration_minutes)
    if (!editSessionForm.date || isNaN(dur) || dur < 1) {
      setEditSessionError('Date and valid duration are required')
      return
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

  // Delete session
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

  if (!user) return null
  if (!user.is_admin) return null

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>

          {/* User table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-lg">Users</h2>
            </div>

            {loading ? (
              <div className="px-6 py-8 text-gray-400">Loading users…</div>
            ) : error ? (
              <div className="px-6 py-8 text-red-400">{error}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left px-6 py-3 font-medium">Username</th>
                    <th className="text-left px-6 py-3 font-medium">Level</th>
                    <th className="text-left px-6 py-3 font-medium">XP</th>
                    <th className="text-left px-6 py-3 font-medium">Role</th>
                    <th className="text-right px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <>
                      <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                        <td className="px-6 py-3 font-medium">{u.username}</td>
                        <td className="px-6 py-3 text-gray-300">Lv.{u.level}</td>
                        <td className="px-6 py-3 text-orange-400">{u.xp}</td>
                        <td className="px-6 py-3">
                          {u.is_admin ? (
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">Admin</span>
                          ) : (
                            <span className="text-xs text-gray-500">User</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => loadSessions(u.id, u.username)}
                              className="px-3 py-1 text-xs rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-300 transition-colors"
                            >
                              View Sessions
                            </button>
                            <button
                              onClick={() => {
                                setXpOverrideId(xpOverrideId === u.id ? null : u.id)
                                setXpOverrideValue(String(u.xp))
                                setXpError(null)
                              }}
                              className="px-3 py-1 text-xs rounded-lg bg-yellow-900/60 hover:bg-yellow-800 text-yellow-300 transition-colors"
                            >
                              Override XP
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(editingId === u.id ? null : u.id)
                                setEditPassword('')
                                setEditError(null)
                              }}
                              className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                            >
                              {editingId === u.id ? 'Cancel' : 'Edit Password'}
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleDelete(u.id, u.username)}
                                className="px-3 py-1 text-xs rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* XP override row */}
                      {xpOverrideId === u.id && (
                        <tr key={`xp-${u.id}`} className="bg-yellow-950/20 border-b border-gray-800">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-yellow-300 text-xs font-medium">Override XP for {u.username}:</span>
                              <input
                                type="number"
                                min="0"
                                value={xpOverrideValue}
                                onChange={(e) => setXpOverrideValue(e.target.value)}
                                className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                              />
                              <button
                                onClick={() => handleOverrideXP(u.id)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-medium"
                              >
                                Save
                              </button>
                              <button onClick={() => setXpOverrideId(null)} className="text-gray-400 text-xs hover:text-white">Cancel</button>
                            </div>
                            {xpError && <p className="text-red-400 text-xs mt-1">{xpError}</p>}
                          </td>
                        </tr>
                      )}

                      {/* Password edit row */}
                      {editingId === u.id && (
                        <tr key={`edit-${u.id}`} className="bg-gray-800/60 border-b border-gray-800">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="New password"
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                              />
                              <button
                                onClick={() => handleChangePassword(u.id)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
                              >
                                Save
                              </button>
                            </div>
                            {editError && <p className="text-red-400 text-xs mt-1">{editError}</p>}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sessions panel */}
          {sessionsPanelUserId !== null && (
            <div className="bg-gray-900 border border-blue-800/50 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-lg">
                  📋 Sessions for <span className="text-blue-400">{sessionsPanelUsername}</span>
                </h2>
                <button
                  onClick={() => setSessionsPanelUserId(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕ Close
                </button>
              </div>

              {sessionsLoading ? (
                <div className="px-6 py-6 text-gray-400">Loading sessions…</div>
              ) : sessionsError ? (
                <div className="px-6 py-6 text-red-400">{sessionsError}</div>
              ) : sessions.length === 0 ? (
                <div className="px-6 py-6 text-gray-500">No sessions found.</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {sessions.map((s) => (
                    <div key={s.id} className="px-6 py-4">
                      {editingSessionId === s.id ? (
                        // Edit form
                        <div className="space-y-3">
                          <div className="flex gap-3 flex-wrap">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Date</label>
                              <input
                                type="date"
                                value={editSessionForm.date}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, date: e.target.value }))}
                                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Duration (min)</label>
                              <input
                                type="number"
                                min="1"
                                value={editSessionForm.duration_minutes}
                                onChange={(e) => setEditSessionForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                                className="w-24 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Notes</label>
                            <textarea
                              value={editSessionForm.notes}
                              onChange={(e) => setEditSessionForm((f) => ({ ...f, notes: e.target.value }))}
                              rows={2}
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500 resize-none"
                            />
                          </div>
                          {editSessionError && <p className="text-red-400 text-xs">{editSessionError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSession(s.id)}
                              className="px-4 py-1.5 text-xs rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="px-4 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display row
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="font-medium text-sm">{s.date}</div>
                            <div className="text-gray-400 text-xs mt-0.5">
                              {s.duration_minutes} min
                              {s.notes ? ` · ${s.notes}` : ''}
                              {s.exercises.length > 0 ? ` · ${s.exercises.length} exercise${s.exercises.length !== 1 ? 's' : ''}` : ''}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditSession(s)}
                              className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              disabled={deletingSessionId === s.id}
                              className="px-3 py-1 text-xs rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 disabled:opacity-50"
                            >
                              {deletingSessionId === s.id ? 'Deleting…' : 'Delete'}
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

          {/* Add User form */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-4">Add User</h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
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
