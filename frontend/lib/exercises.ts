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
  'Biceps':               '二头肌',
  'Triceps':              '三头肌',
  'Forearms':             '前臂',
  'Quads':                '股四头肌',
  'Hamstrings':           '腘绳肌',
  'Glutes':               '臀部',
  'Calves':               '小腿',
  'Core':                 '核心',
  'Cardio':               '有氧',
  'Olympic / Compound':   '奥林匹克/复合',
  'Stretching / Mobility': '拉伸/灵活性',
}

export const EXERCISES: Exercise[] = [
  // ── Chest 胸部 ─────────────────────────────────────────────────────────────
  { id: 'bench_press',              nameEn: 'Bench Press',                   nameCn: '卧推',             category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌' },
  { id: 'incline_bench_press',      nameEn: 'Incline Bench Press',           nameCn: '上斜卧推',         category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌上束' },
  { id: 'decline_bench_press',      nameEn: 'Decline Bench Press',           nameCn: '下斜卧推',         category: 'Chest',   equipment: 'Barbell',    muscleGroup: '胸大肌下束' },
  { id: 'dumbbell_bench_press',     nameEn: 'Dumbbell Bench Press',          nameCn: '哑铃卧推',         category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌' },
  { id: 'incline_db_press',         nameEn: 'Incline Dumbbell Press',        nameCn: '上斜哑铃卧推',     category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌上束' },
  { id: 'dumbbell_fly',             nameEn: 'Dumbbell Fly',                  nameCn: '哑铃飞鸟',         category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌' },
  { id: 'incline_db_fly',           nameEn: 'Incline Dumbbell Fly',          nameCn: '上斜哑铃飞鸟',     category: 'Chest',   equipment: 'Dumbbell',   muscleGroup: '胸大肌上束' },
  { id: 'cable_fly',                nameEn: 'Cable Chest Fly',               nameCn: '绳索夹胸',         category: 'Chest',   equipment: 'Cable',      muscleGroup: '胸大肌' },
  { id: 'pec_deck',                 nameEn: 'Pec Deck / Machine Fly',        nameCn: '蝴蝶机夹胸',       category: 'Chest',   equipment: 'Machine',    muscleGroup: '胸大肌' },
  { id: 'push_up',                  nameEn: 'Push-Up',                       nameCn: '俯卧撑',           category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'wide_push_up',             nameEn: 'Wide Push-Up',                  nameCn: '宽距俯卧撑',       category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'chest_dip',                nameEn: 'Chest Dip',                     nameCn: '胸部双杠撑起',     category: 'Chest',   equipment: 'Bodyweight', muscleGroup: '胸大肌下束' },
  { id: 'chest_press_machine',      nameEn: 'Chest Press Machine',           nameCn: '胸部推举机',       category: 'Chest',   equipment: 'Machine',    muscleGroup: '胸大肌' },

  // ── Back 背部 ──────────────────────────────────────────────────────────────
  { id: 'deadlift',                 nameEn: 'Deadlift',                      nameCn: '硬举',             category: 'Back',    equipment: 'Barbell',    muscleGroup: '竖脊肌' },
  { id: 'pull_up',                  nameEn: 'Pull-Up',                       nameCn: '引体向上',         category: 'Back',    equipment: 'Bodyweight', muscleGroup: '背阔肌' },
  { id: 'chin_up',                  nameEn: 'Chin-Up',                       nameCn: '反握引体向上',     category: 'Back',    equipment: 'Bodyweight', muscleGroup: '背阔肌' },
  { id: 'lat_pulldown',             nameEn: 'Lat Pulldown',                  nameCn: '下拉',             category: 'Back',    equipment: 'Cable',      muscleGroup: '背阔肌' },
  { id: 'seated_row',               nameEn: 'Seated Cable Row',              nameCn: '坐姿划船',         category: 'Back',    equipment: 'Cable',      muscleGroup: '斜方肌' },
  { id: 'bent_over_row',            nameEn: 'Bent-Over Barbell Row',         nameCn: '俯身杠铃划船',     category: 'Back',    equipment: 'Barbell',    muscleGroup: '背阔肌' },
  { id: 'dumbbell_row',             nameEn: 'Single-Arm Dumbbell Row',       nameCn: '单臂哑铃划船',     category: 'Back',    equipment: 'Dumbbell',   muscleGroup: '背阔肌' },
  { id: 'machine_row',              nameEn: 'Machine Row',                   nameCn: '机器划船',         category: 'Back',    equipment: 'Machine',    muscleGroup: '斜方肌' },
  { id: 't_bar_row',                nameEn: 'T-Bar Row',                     nameCn: 'T杠划船',          category: 'Back',    equipment: 'Barbell',    muscleGroup: '斜方肌' },
  { id: 'face_pull',                nameEn: 'Face Pull',                     nameCn: '绳索面拉',         category: 'Back',    equipment: 'Cable',      muscleGroup: '后三角肌' },
  { id: 'back_extension',           nameEn: 'Back Extension',                nameCn: '背部伸展',         category: 'Back',    equipment: 'Machine',    muscleGroup: '竖脊肌' },
  { id: 'good_morning',             nameEn: 'Good Morning',                  nameCn: '早安式',           category: 'Back',    equipment: 'Barbell',    muscleGroup: '竖脊肌' },
  { id: 'hyperextension',           nameEn: 'Hyperextension',                nameCn: '超伸',             category: 'Back',    equipment: 'Bodyweight', muscleGroup: '竖脊肌' },

  // ── Shoulders 肩部 ─────────────────────────────────────────────────────────
  { id: 'overhead_press',           nameEn: 'Barbell Overhead Press',        nameCn: '杠铃肩推',         category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '三角肌' },
  { id: 'seated_db_press',          nameEn: 'Seated Dumbbell Press',         nameCn: '坐姿哑铃肩推',     category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌' },
  { id: 'db_lateral_raise',         nameEn: 'Dumbbell Lateral Raise',        nameCn: '哑铃侧平举',       category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌中束' },
  { id: 'cable_lateral_raise',      nameEn: 'Cable Lateral Raise',           nameCn: '绳索侧平举',       category: 'Shoulders', equipment: 'Cable',     muscleGroup: '三角肌中束' },
  { id: 'front_raise',              nameEn: 'Front Raise',                   nameCn: '前平举',           category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌前束' },
  { id: 'rear_delt_fly',            nameEn: 'Rear Delt Fly',                 nameCn: '反向飞鸟',         category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '后三角肌' },
  { id: 'upright_row',              nameEn: 'Upright Row',                   nameCn: '直立划船',         category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '三角肌' },
  { id: 'shoulder_shrug',           nameEn: 'Shoulder Shrug',                nameCn: '耸肩',             category: 'Shoulders', equipment: 'Barbell',   muscleGroup: '斜方肌' },
  { id: 'arnold_press',             nameEn: 'Arnold Press',                  nameCn: '阿诺德推举',       category: 'Shoulders', equipment: 'Dumbbell',  muscleGroup: '三角肌' },
  { id: 'machine_shoulder_press',   nameEn: 'Machine Shoulder Press',        nameCn: '机器肩推',         category: 'Shoulders', equipment: 'Machine',   muscleGroup: '三角肌' },

  // ── Biceps 二头肌 ─────────────────────────────────────────────────────────
  { id: 'barbell_curl',             nameEn: 'Barbell Curl',                  nameCn: '杠铃弯举',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二头肌' },
  { id: 'dumbbell_curl',            nameEn: 'Dumbbell Curl',                 nameCn: '哑铃弯举',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二头肌' },
  { id: 'hammer_curl',              nameEn: 'Hammer Curl',                   nameCn: '锤式弯举',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二头肌' },
  { id: 'incline_db_curl',          nameEn: 'Incline Dumbbell Curl',         nameCn: '上斜哑铃弯举',     category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二头肌' },
  { id: 'preacher_curl',            nameEn: 'Preacher Curl',                 nameCn: '牧师椅弯举',       category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二头肌' },
  { id: 'concentration_curl',       nameEn: 'Concentration Curl',            nameCn: '集中弯举',         category: 'Biceps',  equipment: 'Dumbbell',   muscleGroup: '肱二头肌' },
  { id: 'cable_curl',               nameEn: 'Cable Curl',                    nameCn: '绳索弯举',         category: 'Biceps',  equipment: 'Cable',      muscleGroup: '肱二头肌' },
  { id: 'reverse_curl',             nameEn: 'Reverse Curl',                  nameCn: '反握弯举',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二头肌' },
  { id: 'ez_bar_curl',              nameEn: 'EZ-Bar Curl',                   nameCn: 'EZ杠弯举',         category: 'Biceps',  equipment: 'Barbell',    muscleGroup: '肱二头肌' },

  // ── Triceps 三头肌 ────────────────────────────────────────────────────────
  { id: 'tricep_pushdown',          nameEn: 'Tricep Pushdown',               nameCn: '三头肌下压',       category: 'Triceps', equipment: 'Cable',      muscleGroup: '肱三头肌' },
  { id: 'overhead_tricep_ext',      nameEn: 'Overhead Tricep Extension',     nameCn: '颈后臂屈伸',       category: 'Triceps', equipment: 'Dumbbell',   muscleGroup: '肱三头肌' },
  { id: 'skull_crusher',            nameEn: 'Skull Crusher',                 nameCn: '仰卧臂屈伸',       category: 'Triceps', equipment: 'Barbell',    muscleGroup: '肱三头肌' },
  { id: 'tricep_dip',               nameEn: 'Tricep Dip',                    nameCn: '三头肌撑起',       category: 'Triceps', equipment: 'Bodyweight', muscleGroup: '肱三头肌' },
  { id: 'close_grip_bench',         nameEn: 'Close-Grip Bench Press',        nameCn: '窄握卧推',         category: 'Triceps', equipment: 'Barbell',    muscleGroup: '肱三头肌' },
  { id: 'kickback',                 nameEn: 'Dumbbell Kickback',             nameCn: '俯身三头伸展',     category: 'Triceps', equipment: 'Dumbbell',   muscleGroup: '肱三头肌' },
  { id: 'cable_overhead_ext',       nameEn: 'Cable Overhead Extension',      nameCn: '绳索头顶伸展',     category: 'Triceps', equipment: 'Cable',      muscleGroup: '肱三头肌' },
  { id: 'diamond_push_up',          nameEn: 'Diamond Push-Up',               nameCn: '钻石俯卧撑',       category: 'Triceps', equipment: 'Bodyweight', muscleGroup: '肱三头肌' },

  // ── Forearms 前臂 ─────────────────────────────────────────────────────────
  { id: 'wrist_curl',               nameEn: 'Wrist Curl',                    nameCn: '腕弯举',           category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂屈肌' },
  { id: 'reverse_wrist_curl',       nameEn: 'Reverse Wrist Curl',            nameCn: '反向腕弯举',       category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂伸肌' },
  { id: 'farmers_walk',             nameEn: "Farmer's Walk",                 nameCn: '行走持铃',         category: 'Forearms', equipment: 'Dumbbell',  muscleGroup: '前臂' },
  { id: 'plate_pinch',              nameEn: 'Plate Pinch',                   nameCn: '夹片握力训练',     category: 'Forearms', equipment: 'Barbell',   muscleGroup: '前臂' },

  // ── Quads 股四头肌 ────────────────────────────────────────────────────────
  { id: 'squat',                    nameEn: 'Back Squat',                    nameCn: '深蹲',             category: 'Quads',   equipment: 'Barbell',    muscleGroup: '股四头肌' },
  { id: 'front_squat',              nameEn: 'Front Squat',                   nameCn: '前蹲',             category: 'Quads',   equipment: 'Barbell',    muscleGroup: '股四头肌' },
  { id: 'goblet_squat',             nameEn: 'Goblet Squat',                  nameCn: '酒杯深蹲',         category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四头肌' },
  { id: 'leg_press',                nameEn: 'Leg Press',                     nameCn: '腿举',             category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四头肌' },
  { id: 'leg_extension',            nameEn: 'Leg Extension',                 nameCn: '腿屈伸',           category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四头肌' },
  { id: 'lunge',                    nameEn: 'Lunge',                         nameCn: '弓箭步',           category: 'Quads',   equipment: 'Bodyweight', muscleGroup: '股四头肌' },
  { id: 'walking_lunge',            nameEn: 'Walking Lunge',                 nameCn: '行走弓箭步',       category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四头肌' },
  { id: 'bulgarian_split_squat',    nameEn: 'Bulgarian Split Squat',         nameCn: '保加利亚分腿蹲',   category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四头肌' },
  { id: 'hack_squat',               nameEn: 'Hack Squat',                    nameCn: '黑克深蹲',         category: 'Quads',   equipment: 'Machine',    muscleGroup: '股四头肌' },
  { id: 'step_up',                  nameEn: 'Step-Up',                       nameCn: '台阶蹲',           category: 'Quads',   equipment: 'Dumbbell',   muscleGroup: '股四头肌' },
  { id: 'wall_sit',                 nameEn: 'Wall Sit',                      nameCn: '靠墙静蹲',         category: 'Quads',   equipment: 'Bodyweight', muscleGroup: '股四头肌' },

  // ── Hamstrings 腘绳肌 ─────────────────────────────────────────────────────
  { id: 'romanian_deadlift',        nameEn: 'Romanian Deadlift',             nameCn: '罗马尼亚硬举',     category: 'Hamstrings', equipment: 'Barbell',  muscleGroup: '腘绳肌' },
  { id: 'stiff_leg_deadlift',       nameEn: 'Stiff-Leg Deadlift',           nameCn: '直腿硬举',         category: 'Hamstrings', equipment: 'Barbell',  muscleGroup: '腘绳肌' },
  { id: 'lying_leg_curl',           nameEn: 'Lying Leg Curl',                nameCn: '俯卧腿弯举',       category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '腘绳肌' },
  { id: 'seated_leg_curl',          nameEn: 'Seated Leg Curl',               nameCn: '坐姿腿弯举',       category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '腘绳肌' },
  { id: 'nordic_curl',              nameEn: 'Nordic Hamstring Curl',         nameCn: '北欧腘绳肌弯举',   category: 'Hamstrings', equipment: 'Bodyweight', muscleGroup: '腘绳肌' },
  { id: 'glute_ham_raise',          nameEn: 'Glute-Ham Raise',               nameCn: '臀腿弯举',         category: 'Hamstrings', equipment: 'Machine',  muscleGroup: '腘绳肌' },

  // ── Glutes 臀部 ───────────────────────────────────────────────────────────
  { id: 'hip_thrust',               nameEn: 'Hip Thrust',                    nameCn: '臀推',             category: 'Glutes',  equipment: 'Barbell',    muscleGroup: '臀大肌' },
  { id: 'glute_bridge',             nameEn: 'Glute Bridge',                  nameCn: '臀桥',             category: 'Glutes',  equipment: 'Bodyweight', muscleGroup: '臀大肌' },
  { id: 'cable_kickback',           nameEn: 'Cable Glute Kickback',          nameCn: '绳索后踢腿',       category: 'Glutes',  equipment: 'Cable',      muscleGroup: '臀大肌' },
  { id: 'sumo_deadlift',            nameEn: 'Sumo Deadlift',                 nameCn: '相扑硬举',         category: 'Glutes',  equipment: 'Barbell',    muscleGroup: '臀大肌' },
  { id: 'abductor_machine',         nameEn: 'Hip Abductor Machine',          nameCn: '髋外展机',         category: 'Glutes',  equipment: 'Machine',    muscleGroup: '臀中肌' },
  { id: 'side_lying_clamshell',     nameEn: 'Clamshell',                     nameCn: '蚌式开合',         category: 'Glutes',  equipment: 'Band',       muscleGroup: '臀中肌' },
  { id: 'donkey_kick',              nameEn: 'Donkey Kick',                   nameCn: '驴踢',             category: 'Glutes',  equipment: 'Bodyweight', muscleGroup: '臀大肌' },

  // ── Calves 小腿 ───────────────────────────────────────────────────────────
  { id: 'standing_calf_raise',      nameEn: 'Standing Calf Raise',           nameCn: '站姿提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '腓肠肌' },
  { id: 'seated_calf_raise',        nameEn: 'Seated Calf Raise',             nameCn: '坐姿提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '比目鱼肌' },
  { id: 'db_calf_raise',            nameEn: 'Dumbbell Calf Raise',           nameCn: '哑铃提踵',         category: 'Calves',  equipment: 'Dumbbell',   muscleGroup: '腓肠肌' },
  { id: 'leg_press_calf_raise',     nameEn: 'Leg Press Calf Raise',          nameCn: '腿举提踵',         category: 'Calves',  equipment: 'Machine',    muscleGroup: '腓肠肌' },
  { id: 'jump_rope',                nameEn: 'Jump Rope',                     nameCn: '跳绳',             category: 'Calves',  equipment: 'Bodyweight', muscleGroup: '腓肠肌' },

  // ── Core 核心 ─────────────────────────────────────────────────────────────
  { id: 'crunch',                   nameEn: 'Crunch',                        nameCn: '卷腹',             category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'sit_up',                   nameEn: 'Sit-Up',                        nameCn: '仰卧起坐',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'leg_raise',                nameEn: 'Leg Raise',                     nameCn: '悬挂举腿',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'plank',                    nameEn: 'Plank',                         nameCn: '平板支撑',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'side_plank',               nameEn: 'Side Plank',                    nameCn: '侧平板支撑',       category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'russian_twist',            nameEn: 'Russian Twist',                 nameCn: '俄式转体',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'bicycle_crunch',           nameEn: 'Bicycle Crunch',                nameCn: '自行车卷腹',       category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹斜肌' },
  { id: 'ab_wheel',                 nameEn: 'Ab Wheel Rollout',              nameCn: '腹轮伸展',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'cable_crunch',             nameEn: 'Cable Crunch',                  nameCn: '绳索卷腹',         category: 'Core',    equipment: 'Cable',      muscleGroup: '腹直肌' },
  { id: 'v_up',                     nameEn: 'V-Up',                          nameCn: 'V字卷腹',          category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'dead_bug',                 nameEn: 'Dead Bug',                      nameCn: '死虫子',           category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'mountain_climber',         nameEn: 'Mountain Climber',              nameCn: '登山者',           category: 'Core',    equipment: 'Bodyweight', muscleGroup: '核心' },
  { id: 'dragon_flag',              nameEn: 'Dragon Flag',                   nameCn: '龙旗',             category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },
  { id: 'hanging_leg_raise',        nameEn: 'Hanging Leg Raise',             nameCn: '悬挂举腿',         category: 'Core',    equipment: 'Bodyweight', muscleGroup: '腹直肌' },

  // ── Cardio 有氧 ───────────────────────────────────────────────────────────
  { id: 'treadmill_run',            nameEn: 'Treadmill Run',                 nameCn: '跑步机',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'cycling',                  nameEn: 'Stationary Bike',               nameCn: '固定自行车',       category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'rowing',                   nameEn: 'Rowing Machine',                nameCn: '划船机',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'elliptical',               nameEn: 'Elliptical',                    nameCn: '椭圆机',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '全身' },
  { id: 'stair_climber',            nameEn: 'Stair Climber',                 nameCn: '爬楼机',           category: 'Cardio',  equipment: 'Machine',    muscleGroup: '腿部' },
  { id: 'hiit',                     nameEn: 'HIIT',                          nameCn: '高强度间歇训练',   category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'burpee',                   nameEn: 'Burpee',                        nameCn: '波比跳',           category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'box_jump',                 nameEn: 'Box Jump',                      nameCn: '跳箱',             category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '腿部' },
  { id: 'outdoor_run',              nameEn: 'Outdoor Run',                   nameCn: '户外跑步',         category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },
  { id: 'sprint',                   nameEn: 'Sprint',                        nameCn: '短跑冲刺',         category: 'Cardio',  equipment: 'Bodyweight', muscleGroup: '全身' },

  // ── Olympic / Compound 奥林匹克/复合 ─────────────────────────────────────
  { id: 'clean_and_jerk',           nameEn: 'Clean and Jerk',                nameCn: '抓举挺举',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'power_clean',              nameEn: 'Power Clean',                   nameCn: '高翻',             category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'snatch',                   nameEn: 'Snatch',                        nameCn: '抓举',             category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'thruster',                 nameEn: 'Thruster',                      nameCn: '推举深蹲',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'push_press',               nameEn: 'Push Press',                    nameCn: '借力推举',         category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'hang_clean',               nameEn: 'Hang Clean',                    nameCn: '悬挂翻',           category: 'Olympic / Compound', equipment: 'Barbell', muscleGroup: '全身' },
  { id: 'kettlebell_swing',         nameEn: 'Kettlebell Swing',              nameCn: '壶铃摆动',         category: 'Olympic / Compound', equipment: 'Kettlebell', muscleGroup: '全身' },
  { id: 'turkish_getup',            nameEn: 'Turkish Get-Up',                nameCn: '土耳其起立',       category: 'Olympic / Compound', equipment: 'Kettlebell', muscleGroup: '全身' },

  // ── Stretching / Mobility 拉伸/灵活性 ────────────────────────────────────
  { id: 'hip_flexor_stretch',       nameEn: 'Hip Flexor Stretch',            nameCn: '髋屈肌拉伸',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '髋屈肌' },
  { id: 'hamstring_stretch',        nameEn: 'Hamstring Stretch',             nameCn: '腘绳肌拉伸',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '腘绳肌' },
  { id: 'quad_stretch',             nameEn: 'Quad Stretch',                  nameCn: '股四头肌拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '股四头肌' },
  { id: 'pigeon_pose',              nameEn: 'Pigeon Pose',                   nameCn: '鸽子式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '臀部' },
  { id: 'child_pose',               nameEn: "Child's Pose",                  nameCn: '婴儿式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '背部' },
  { id: 'cat_cow',                  nameEn: 'Cat-Cow Stretch',               nameCn: '猫牛式',           category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '脊柱' },
  { id: 'doorway_chest_stretch',    nameEn: 'Doorway Chest Stretch',         nameCn: '门框胸部拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '胸大肌' },
  { id: 'shoulder_cross_stretch',   nameEn: 'Cross-Body Shoulder Stretch',   nameCn: '跨体肩部拉伸',     category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '三角肌' },
  { id: 'tricep_overhead_stretch',  nameEn: 'Overhead Tricep Stretch',       nameCn: '头顶三头肌拉伸',   category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '肱三头肌' },
  { id: 'calf_stretch',             nameEn: 'Calf Stretch',                  nameCn: '小腿拉伸',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '腓肠肌' },
  { id: 'seated_forward_fold',      nameEn: 'Seated Forward Fold',           nameCn: '坐姿前屈',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '腘绳肌' },
  { id: 'thoracic_rotation',        nameEn: 'Thoracic Rotation',             nameCn: '胸椎旋转',         category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '胸椎' },
  { id: 'ankle_circles',            nameEn: 'Ankle Circles',                 nameCn: '踝关节画圈',       category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '踝关节' },
  { id: 'foam_roll_it_band',        nameEn: 'Foam Roll IT Band',             nameCn: '泡沫轴滚压IT束',   category: 'Stretching / Mobility', equipment: 'Bodyweight', muscleGroup: '髂胫束' },
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
