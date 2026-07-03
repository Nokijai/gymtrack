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

  // Inline password edit: track which user is being edited
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  // Redirect non-admins (wait until user is loaded)
  useEffect(() => {
    if (user === null) return // still loading
    if (!user.is_admin) {
      router.replace('/dashboard')
    }
  }, [user, router])

  // Load users list
  function loadUsers() {
    setLoading(true)
    api
      .get('/admin/users')
      .then((r) => {
        setUsers(r.data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.response?.data?.detail ?? 'Failed to load users')
        setLoading(false)
      })
  }

  useEffect(() => {
    if (user?.is_admin) loadUsers()
  }, [user])

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
    } finally {
      setAddLoading(false)
    }
  }

  // Change password
  async function handleChangePassword(userId: number) {
    setEditError(null)
    if (!editPassword) { setEditError('Password cannot be empty'); return }
    try {
      await api.put(`/admin/users/${userId}/password`, { new_password: editPassword })
      setEditingId(null)
      setEditPassword('')
    } catch (e: any) {
      setEditError(e.response?.data?.detail ?? 'Failed to update password')
    }
  }

  // Delete user
  async function handleDelete(userId: number, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${userId}`)
      loadUsers()
    } catch (e: any) {
      alert(e.response?.data?.detail ?? 'Failed to delete user')
    }
  }

  // Don't render anything until we know if user is admin
  if (!user) return null
  if (!user.is_admin) return null

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Title */}
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
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">User</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
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
                                className="px-3 py-1.5 text-xs rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
                              >
                                Save
                              </button>
                            </div>
                            {editError && (
                              <p className="text-red-400 text-xs mt-1">{editError}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>

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
