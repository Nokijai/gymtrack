'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, setUser } = useAuthStore()

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    api.get('/auth/me').then((r) => setUser(r.data)).catch(() => {
      router.push('/login')
    })
  }, [token, router, setUser])

  if (!token) return null
  return <>{children}</>
}
