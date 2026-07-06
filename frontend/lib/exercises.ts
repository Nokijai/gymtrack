export interface Exercise {
  id: string        // snake_case unique identifier
  nameEn: string    // English name
  nameCn: string    // Chinese name
  category: string  // muscle group category
  equipment: string // primary equipment
  muscleGroup: string // primary muscle targeted
}

// ─── Category constants ───────────────────────────────────────────────────────
export const CATEGORIES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Cardio',
  'Olympic / Compound',
  'Stretching / Mobility',
] as const

export type Category = typeof CATEGORIES[number]

export const CATEGORY_LABELS: Record<string, string> = {
  'Chest':                '胸部',
  'Back':                 '背部',
  'Shoulders':            '肩部',
  'Biceps':               '二頭肌',
  'Triceps':              '三頭肌',
  'Forearms':             '前臂',
  'Quads':                '股四頭肌',
  'Hamstrings':           '膕繩肌',
  'Glutes':               '臀部',
  'Calves':               '小腿',
  'Core':                 '核心',
  'Cardio':               '有氧',
  'Olympic / Compound':   '奧林匹克/複合',
  'Stretching / Mobility': '拉伸/靈活性',
}

export const EXERCISES: Exercise[] = [
  // ── Chest 胸部 ─────────────────────────────────────────────────────────────
  { id: 'bench_press',              nameEn: 'Bench Press',                   nameCn: '臥推',             category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌' },
  { id: 'incline_bench_press',      nameEn: 'Incline Bench Press',           nameCn: '上斜臥推',         category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌上束' },
  { id: 'decline_bench_press',      nameEn: 'Decline Bench Press',           nameCn: '下斜臥推',         category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌下束' },
  { id: 'dumbbell_bench_press',     nameEn: 'Dumbbell Bench Press',          nameCn: '啞鈴臥推',         category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌' },
  { id: 'incline_db_press',         nameEn: 'Incline Dumbbell Press',        nameCn: '上斜啞鈴臥推',     category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌上束' },
  { id: 'dumbbell_fly',             nameEn: 'Dumbbell Fly',                  nameCn: '啞鈴飛鳥',         category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌' },
  { id: 'incline_db_fly',           nameEn: 'Incline Dumbbell Fly',          nameCn: '上斜啞鈴飛鳥',     category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌上束' },
  { id: 'cable_fly',                nameEn: 'Cable Chest Fly',               nameCn: '繩索夾胸',         category: 'Chest',   equipment: 'Cable',      muscleGroup: '胸大肌' },
  { id: 'pec_deck',                 nameEn: 'Pec Deck / Machine Fly',        nameCn: '蝴蝶機夾胸',       category: 'Chest',   equipment: 'Machine',    muscleGroup: '胸大肌' },
  { id: 'push_up',                  nameEn: 'Push-Up',                       nameCn: '俯臥撐',           category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'wide_push_up',             nameEn: 'Wide Push-Up',                  nameCn: '寬距俯臥撐',       category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'chest_dip',                nameEn: 'Chest Dip',                     nameCn: '胸部雙槓撐起',     category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌下束' },
  { id: 'chest_press_machine',      nameEn: 'Chest Press Machine',           nameCn: '胸部推舉機',       category: 'Chest',   equipment: 'Machine',    muscleGroup: '胸大肌' },

  // ── Back 背部 ──────────────────────────────────────────────────────────────
  { id: 'deadlift',                 nameEn: 'Deadlift',                      nameCn: '硬舉',             category: 'Back',    equipment: 'Barbell',    muscleGroup: '豎脊肌' },
  { id: 'pull_up',                  nameEn: 'Pull-Up',                       nameCn: '引體向上',         category: 'Back',    equipment: 'Bodyweight', muscleGroup: '背闊肌' },
  { id: 'chin_up',                  nameEn: 'Chin-Up',                       nameCn: '反握引體向上',     category: 'Back',    equipment: 'Bodyweight', muscleGroup: '背闊肌' },
  { id: 'lat_pulldown',             nameEn: 'Lat Pulldown',                  nameCn: '下拉',             category: 'Back',    equipment: 'Cable',      muscleGroup: '背闊肌' },
  { id: 'seated_row',               nameEn: 'Seated Cable Row',              nameCn: '坐姿划船',         category: 'Back',    equipment: 'Cable',      muscleGroup: '斜方肌' },
  { id: 'bent_over_row',            nameEn: 'Bent-Over Barbell Row',         nameCn: '俯身槓鈴划船',     category: 'Back',    equipment: 'Barbell',    muscleGroup: '背闊肌' },
  { id: 'dumbbell_row',             nameEn: 'Single-Arm Dumbbell Row',       nameCn: '單臂啞鈴划船',     category: 'Back',    equipment: 'Dumbbell',   muscleGroup: '背闊肌' },
  { id: 'machine_row',              nameEn: 'Machine Row',                   nameCn: '機器划船',         category: 'Back',    equipment: 'Machine',    muscleGroup: '斜方肌' },
  { id: 't_bar_row',                nameEn: 'T-Bar Row',                     nameCn: 'T槓划船',          category: 'Back',    equipment: 'Barbell',    muscleGroup: '斜方肌' },
  { id: 'face_pull',                nameEn: 'Face Pull',                     nameCn: '繩索麪拉',         category: 'Back',    equipment: 'Cable',      muscleGroup: '後三角肌' },
  { id: 'back_extension',           nameEn: 'Back Extension',                nameCn: '背部伸展',         category: 'Back',    equipment: 'Machine',    muscleGroup: '豎脊肌' },
  { id: 'good_morning',             nameEn: 'Good Morning',                  nameCn: '早安式',           category: 'Back',    equipment: 'Barbell',    muscleGroup: '豎脊肌' },
  { id: 'hyperextension',           nameEn: 'Hyperextension',                nameCn: '超伸',             category: 'Back',    equipment: 'Bodyweight', muscleGroup: '豎脊肌' },

  // ── Shoulders 肩部 ─────────────────────────────────────────────────────────
  { id: 'overhead_press',           nameEn: 'Barbell Overhead Press',        nameCn: '槓鈴肩推',         category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '三角肌' },
  { id: 'seated_db_press',          nameEn: 'Seated Dumbbell Press',         nameCn: '坐姿啞鈴肩推',     category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌' },
  { id: 'db_lateral_raise',         nameEn: 'Dumbbell Lateral Raise',        nameCn: '啞鈴側平舉',       category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌中束' },
  { id: 'cable_lateral_raise',      nameEn: 'Cable Lateral Raise',           nameCn: '繩索側平舉',       category: 'Shoulders', equipment: 'Cable',     muscleGroup: '三角肌中束' },
  { id: 'front_raise',              nameEn: 'Front Raise',                   nameCn: '前平舉',           category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌前束' },
  { id: 'rear_delt_fly',            nameEn: 'Rear Delt Fly',                 nameCn: '反向飛鳥',         category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '後三角肌' },
  { id: 'upright_row',              nameEn: 'Upright Row',                   nameCn: '直立划船',         category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '三角肌' },
  { id: 'shoulder_shrug',           nameEn: 'Shoulder Shrug',                nameCn: '聳肩',             category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '斜方肌' },
  { id: 'arnold_press',             nameEn: 'Arnold Press',                  nameCn: '阿諾德推舉',       category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌' },
  { id: 'machine_shoulder_press',   nameEn: 'Machine Shoulder Press',        nameCn: '機器肩推',         category: 'Shoulders', equipment: 'Machine',   muscleGroup: '三角肌' },

  // ── Biceps 二頭肌 ─────────────────────────────────────────────────────────
  { id: 'barbell_curl',             nameEn: 'Barbell Curl',                  nameCn: '槓鈴彎舉',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二頭肌' },
  { id: 'dumbbell_curl',            nameEn: 'Dumbbell Curl',                 nameCn: '啞鈴彎舉',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二頭肌' },
  { id: 'hammer_curl',              nameEn: 'Hammer Curl',                   nameCn: '錘式彎舉',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二頭肌' },
  { id: 'incline_db_curl',          nameEn: 'Incline Dumbbell Curl',         nameCn: '上斜啞鈴彎舉',     category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二頭肌' },
  { id: 'preacher_curl',            nameEn: 'Preacher Curl',                 nameCn: '牧師椅彎舉',       category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二頭肌' },
  { id: 'concentration_curl',       nameEn: 'Concentration Curl',            nameCn: '集中彎舉',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二頭肌' },
  { id: 'cable_curl',               nameEn: 'Cable Curl',                    nameCn: '繩索彎舉',         category: 'Biceps',  equipment: 'Cable',      muscleGroup: '肱二頭肌' },
  { id: 'reverse_curl',             nameEn: 'Reverse Curl',                  nameCn: '反握彎舉',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二頭肌' },
  { id: 'ez_bar_curl',              nameEn: 'EZ-Bar Curl',                   nameCn: 'EZ槓彎舉',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二頭肌' },

  // ── Triceps 三頭肌 ────────────────────────────────────────────────────────
  { id: 'tricep_pushdown',          nameEn: 'Tricep Pushdown',               nameCn: '三頭肌下壓',       category: 'Triceps', equipment: 'Cable',      muscleGroup: '肱三頭肌' },
  { id: 'overhead_tricep_ext',      nameEn: 'Overhead Tricep Extension',     nameCn: '頸後臂屈伸',       category: 'Triceps', equipment: 'Dumbbell',   muscleGroup: '肱三頭肌' },
  { id: 'skull_crusher',            nameEn: 'Skull Crusher',                 nameCn: '仰臥臂屈伸',       category: 'Triceps', equipment: 'Barbell',    muscleGroup: '肱三頭肌' },
  { id: 'tricep_dip',               nameEn: 'Tricep Dip',                    nameCn: '三頭肌撐起',       category: 'Triceps', equipment: 'Bodyweight', muscleGroup: '肱三頭肌' },
  { id: 'close_grip_bench',         nameEn: 'Close-Grip Bench Press',        nameCn: '窄握臥推',         category: 'Triceps', equipment: 'Barbell',    muscleGroup: '肱三頭肌' },
  { id: 'kickback',                 nameEn: 'Dumbbell Kickback',             nameCn: '俯身三頭伸展',     category: 'Triceps', equipment: 'Dumbbell',   muscleGroup: '肱三頭肌' },
  { id: 'cable_overhead_ext',       nameEn: 'Cable Overhead Extension',      nameCn: '繩索頭頂伸展',     category: 'Triceps', equipment: 'Cable',      muscleGroup: '肱三頭肌' },
  { id: 'diamond_push_up',          nameEn: 'Diamond Push-Up',               nameCn: '鑽石俯臥撐',       category: 'Triceps', equipment: 'Bodyweight', muscleGroup: '肱三頭肌' },

  // ── Forearms 前臂 ─────────────────────────────────────────────────────────
  { id: 'wrist_curl',               nameEn: 'Wrist Curl',                    nameCn: '腕彎舉',           category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂屈肌' },
  { id: 'reverse_wrist_curl',       nameEn: 'Reverse Wrist Curl',            nameCn: '反向腕彎舉',       category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂伸肌' },
  { id: 'farmers_walk',             nameEn: "Farmer's Walk",                 nameCn: '行走持鈴',         category: 'Forearms', equipment: 'Dumbbell',  muscleGroup: '前臂' },
  { id: 'plate_pinch',              nameEn: 'Plate Pinch',                   nameCn: '夾片握力訓練',     category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂' },

  // ── Quads 股四頭肌 ────────────────────────────────────────────────────────
  { id: 'squat',                    nameEn: 'Back Squat',                    nameCn: '深蹲',             category: 'Quads',   equipment: 'Barbell',    muscleGroup: '股四頭肌' },
  { id: 'front_squat',              nameEn: 'Front Squat',                   nameCn: '前蹲',             category: 'Quads',   equipment: 'Barbell',    muscleGroup: '股四頭肌' },
  { id: 'goblet_squat',             nameEn: 'Goblet Squat',                  nameCn: '酒杯深蹲',         category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四頭肌' },
  { id: 'leg_press',                nameEn: 'Leg Press',                     nameCn: '腿舉',             category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四頭肌' },
  { id: 'leg_extension',            nameEn: 'Leg Extension',                 nameCn: '腿屈伸',           category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四頭肌' },
  { id: 'lunge',                    nameEn: 'Lunge',                         nameCn: '弓箭步',           category: 'Quads',   equipment: 'Bodyweight', muscleGroup: '股四頭肌' },
  { id: 'walking_lunge',            nameEn: 'Walking Lunge',                 nameCn: '行走弓箭步',       category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四頭肌' },
  { id: 'bulgarian_split_squat',    nameEn: 'Bulgarian Split Squat',         nameCn: '保加利亞分腿蹲',   category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四頭肌' },
  { id: 'hack_squat',               nameEn: 'Hack Squat',                    nameCn: '黑克深蹲',         category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四頭肌' },
  { id: 'step_up',                  nameEn: 'Step-Up',                       nameCn: '臺階蹲',           category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四頭肌' },
  { id: 'wall_sit',                 nameEn: 'Wall Sit',                      nameCn: '靠牆靜蹲',         category: 'Quads',   equipment: 'Bodyweight', muscleGroup: '股四頭肌' },

  // ── Hamstrings 膕繩肌 ─────────────────────────────────────────────────────
  { id: 'romanian_deadlift',        nameEn: 'Romanian Deadlift',             nameCn: '羅馬尼亞硬舉',     category: 'Hamstrings', equipment: 'Barbell',  muscleGroup: '膕繩肌' },
  { id: 'stiff_leg_deadlift',       nameEn: 'Stiff-Leg Deadlift',           nameCn: '直腿硬舉',         category: 'Hamstrings', equipment: 'Barbell',  muscleGroup: '膕繩肌' },
  { id: 'lying_leg_curl',           nameEn: 'Lying Leg Curl',                nameCn: '俯臥腿彎舉',       category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '膕繩肌' },
  { id: 'seated_leg_curl',          nameEn: 'Seated Leg Curl',               nameCn: '坐姿腿彎舉',       category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '膕繩肌' },
  { id: 'nordic_curl',              nameEn: 'Nordic Hamstring Curl',         nameCn: '北歐膕繩肌彎舉',   category: 'Hamstrings', equipment: 'Bodyweight', muscleGroup: '膕繩肌' },
  { id: 'glute_ham_raise',          nameEn: 'Glute-Ham Raise',               nameCn: '臀腿彎舉',         category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '膕繩肌' },

  // ── Glutes 臀部 ───────────────────────────────────────────────────────────
  { id: 'hip_thrust',               nameEn: 'Hip Thrust',                    nameCn: '臀推',             category: 'Glutes',  equipment: 'Barbell',    muscleGroup: '臀大肌' },
  { id: 'glute_bridge',             nameEn: 'Glute Bridge',                  nameCn: '臀橋',             category: 'Glutes',  equipment: 'Bodyweight', muscleGroup: '臀大肌' },
  { id: 'cable_kickback',           nameEn: 'Cable Glute Kickback',          nameCn: '繩索後踢腿',       category: 'Glutes',  equipment: 'Cable',      muscleGroup: '臀大肌' },
  { id: 'sumo_deadlift',            nameEn: 'Sumo Deadlift',                 nameCn: '相撲硬舉',         category: 'Glutes',  equipment: 'Barbell',    muscleGroup: '臀大肌' },
  { id: 'abductor_machine',         nameEn: 'Hip Abductor Machine',          nameCn: '髖外展機',         category: 'Glutes',  equipment: 'Machine',    muscleGroup: '臀中肌' },
  { id: 'side_lying_clamshell',     nameEn: 'Clamshell',                     nameCn: '蚌式開合',         category: 'Glutes',  equipment: 'Band',       muscleGroup: '臀中肌' },
  { id: 'donkey_kick',              nameEn: 'Donkey Kick',                   nameCn: '驢踢',             category: 'Glutes',  equipment: 'Bodyweight', muscleGroup: '臀大肌' },

  // ── Calves 小腿 ───────────────────────────────────────────────────────────
  { id: 'standing_calf_raise',      nameEn: 'Standing Calf Raise',           nameCn: '站姿提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '腓腸肌' },
  { id: 'seated_calf_raise',        nameEn: 'Seated Calf Raise',             nameCn: '坐姿提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '比目魚肌' },
  { id: 'db_calf_raise',            nameEn: 'Dumbbell Calf Raise',           nameCn: '啞鈴提踵',         category: 'Calves',  equipment: 'Dumbbell',   muscleGroup: '腓腸肌' },
  { id: 'leg_press_calf_raise',     nameEn: 'Leg Press Calf Raise',          nameCn: '腿舉提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '腓腸肌' },
  { id: 'jump_rope',                nameEn: 'Jump Rope',                     nameCn: '跳繩',             category: 'Calves',  equipment: 'Bodyweight', muscleGroup: '腓腸肌' },

  // ── Core 核心 ─────────────────────────────────────────────────────────────
  { id: 'crunch',                   nameEn: 'Crunch',                        nameCn: '卷腹',             category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'sit_up',                   nameEn: 'Sit-Up',                        nameCn: '仰臥起坐',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'leg_raise',                nameEn: 'Leg Raise',                     nameCn: '懸掛舉腿',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'plank',                    nameEn: 'Plank',                         nameCn: '平板支撐',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'side_plank',               nameEn: 'Side Plank',                    nameCn: '側平板支撐',       category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'russian_twist',            nameEn: 'Russian Twist',                 nameCn: '俄式轉體',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'bicycle_crunch',           nameEn: 'Bicycle Crunch',                nameCn: '自行車卷腹',       category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'ab_wheel',                 nameEn: 'Ab Wheel Rollout',              nameCn: '腹輪伸展',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'cable_crunch',             nameEn: 'Cable Crunch',                  nameCn: '繩索卷腹',         category: 'Core',    equipment: 'Cable',      muscleGroup: '腹直肌' },
  { id: 'v_up',                     nameEn: 'V-Up',                          nameCn: 'V字卷腹',          category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'dead_bug',                 nameEn: 'Dead Bug',                      nameCn: '死蟲子',           category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'mountain_climber',         nameEn: 'Mountain Climber',              nameCn: '登山者',           category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'dragon_flag',              nameEn: 'Dragon Flag',                   nameCn: '龍旗',             category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'hanging_leg_raise',        nameEn: 'Hanging Leg Raise',             nameCn: '懸掛舉腿',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },

  // ── Cardio 有氧 ───────────────────────────────────────────────────────────
  { id: 'treadmill_run',            nameEn: 'Treadmill Run',                 nameCn: '跑步機',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'cycling',                  nameEn: 'Stationary Bike',               nameCn: '固定自行車',       category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'rowing',                   nameEn: 'Rowing Machine',                nameCn: '划船機',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'elliptical',               nameEn: 'Elliptical',                    nameCn: '橢圓機',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'stair_climber',            nameEn: 'Stair Climber',                 nameCn: '爬樓機',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '腿部' },
  { id: 'hiit',                     nameEn: 'HIIT',                          nameCn: '高強度間歇訓練',   category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'burpee',                   nameEn: 'Burpee',                        nameCn: '波比跳',           category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'box_jump',                 nameEn: 'Box Jump',                      nameCn: '跳箱',             category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '腿部' },
  { id: 'outdoor_run',              nameEn: 'Outdoor Run',                   nameCn: '戶外跑步',         category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'sprint',                   nameEn: 'Sprint',                        nameCn: '短跑衝刺',         category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },

  // ── Olympic / Compound 奧林匹克/複合 ─────────────────────────────────────
  { id: 'clean_and_jerk',           nameEn: 'Clean and Jerk',                nameCn: '抓舉挺舉',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'power_clean',              nameEn: 'Power Clean',                   nameCn: '高翻',             category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'snatch',                   nameEn: 'Snatch',                        nameCn: '抓舉',             category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'thruster',                 nameEn: 'Thruster',                      nameCn: '推舉深蹲',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'push_press',               nameEn: 'Push Press',                    nameCn: '借力推舉',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'hang_clean',               nameEn: 'Hang Clean',                    nameCn: '懸掛翻',           category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'kettlebell_swing',         nameEn: 'Kettlebell Swing',              nameCn: '壺鈴擺動',         category: 'Olympic / Compound', equipment: 'Kettlebell', muscleGroup: '全身' },
  { id: 'turkish_getup',            nameEn: 'Turkish Get-Up',                nameCn: '土耳其起立',       category: 'Olympic / Compound', equipment: 'Kettlebell', muscleGroup: '全身' },

  // ── Stretching / Mobility 拉伸/靈活性 ────────────────────────────────────
  { id: 'hip_flexor_stretch',       nameEn: 'Hip Flexor Stretch',            nameCn: '髖屈肌拉伸',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '髖屈肌' },
  { id: 'hamstring_stretch',        nameEn: 'Hamstring Stretch',             nameCn: '膕繩肌拉伸',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '膕繩肌' },
  { id: 'quad_stretch',             nameEn: 'Quad Stretch',                  nameCn: '股四頭肌拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '股四頭肌' },
  { id: 'pigeon_pose',              nameEn: 'Pigeon Pose',                   nameCn: '鴿子式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '臀部' },
  { id: 'child_pose',               nameEn: "Child's Pose",                  nameCn: '嬰兒式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '背部' },
  { id: 'cat_cow',                  nameEn: 'Cat-Cow Stretch',               nameCn: '貓牛式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '脊柱' },
  { id: 'doorway_chest_stretch',    nameEn: 'Doorway Chest Stretch',         nameCn: '門框胸部拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'shoulder_cross_stretch',   nameEn: 'Cross-Body Shoulder Stretch',   nameCn: '跨體肩部拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '三角肌' },
  { id: 'tricep_overhead_stretch',  nameEn: 'Overhead Tricep Stretch',       nameCn: '頭頂三頭肌拉伸',   category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '肱三頭肌' },
  { id: 'calf_stretch',             nameEn: 'Calf Stretch',                  nameCn: '小腿拉伸',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '腓腸肌' },
  { id: 'seated_forward_fold',      nameEn: 'Seated Forward Fold',           nameCn: '坐姿前屈',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '膕繩肌' },
  { id: 'thoracic_rotation',        nameEn: 'Thoracic Rotation',             nameCn: '胸椎旋轉',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '胸椎' },
  { id: 'ankle_circles',            nameEn: 'Ankle Circles',                 nameCn: '踝關節畫圈',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '踝關節' },
  { id: 'foam_roll_it_band',        nameEn: 'Foam Roll IT Band',             nameCn: '泡沫軸滾壓IT束',   category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '髂脛束' },
  { id: 'world_greatest_stretch',   nameEn: 'World\'s Greatest Stretch',     nameCn: '世界最佳拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '全身' },
]

// ─── Helper: group exercises by category ─────────────────────────────────────
export function groupByCategory(exercises: Exercise[]): Record<string, Exercise[]> {
  return exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)
}

// ─── Helper: search exercises ─────────────────────────────────────────────────
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  const q = query.trim().toLowerCase()
  if (!q) return exercises
  return exercises.filter(
    (ex) =>
      ex.nameEn.toLowerCase().includes(q) ||
      ex.nameCn.includes(q) ||
      ex.category.toLowerCase().includes(q) ||
      ex.muscleGroup.includes(q),
  )
}
