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

// ═══ Program Builder Types ═══════════════════════════════════════

export interface TemplateExercise {
  id: number
  template_id: number
  exercise_name: string
  exercise_name_cn?: string | null
  day_of_week: number
  sort_order: number
  target_sets: number
  target_reps: string
  target_rpe?: string | null
  rest_seconds: number
  is_warmup: boolean
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface WorkoutTemplate {
  id: number
  user_id: number
  name: string
  description?: string | null
  split_type?: string | null
  days_per_week: number
  duration_weeks: number
  is_public: boolean
  is_active: boolean
  exercises: TemplateExercise[]
  created_at?: string | null
  updated_at?: string | null
}

export interface ProgramWorkout {
  id: number
  week_id: number
  program_id: number
  week_number: number
  day_number: number
  scheduled_date: string
  workout_template_id?: number | null
  is_rest_day: boolean
  completed: boolean
  completed_at?: string | null
  actual_session_id?: number | null
  template_name?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ProgramWeek {
  id: number
  program_id: number
  week_number: number
  week_type: string
  is_completed: boolean
  scheduled_sessions: number
  completed_sessions: number
  adherence_pct: number
  notes?: string | null
  workouts: ProgramWorkout[]
  created_at?: string | null
}

export interface TrainingProgram {
  id: number
  user_id: number
  name: string
  goal?: string | null
  template_id?: number | null
  start_date?: string | null
  end_date?: string | null
  total_weeks: number
  current_week: number
  status: string
  weeks: ProgramWeek[]
  overall_adherence: number
  created_at?: string | null
  updated_at?: string | null
}
