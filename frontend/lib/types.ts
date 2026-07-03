export interface User {
  id: number
  username: string
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  is_admin?: boolean
  avatar_url?: string | null
}

export interface Exercise {
  id?: number
  name: string
  sets: number
  reps: number
  weight_kg: number | null
}

export interface WorkoutSession {
  id: number
  date: string
  duration_minutes: number
  notes: string | null
  exercises: Exercise[]
  created_at: string
}

export interface LeaderboardEntry {
  id: number
  username: string
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  weekly_sessions: number
  monthly_sessions: number
  total_sessions: number
  avatar_url?: string | null
}

export interface DashboardStats {
  user: User
  total_sessions: number
  total_minutes: number
  recent_sessions: WorkoutSession[]
  weekly_data: { day: string; minutes: number }[]
}
