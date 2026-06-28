export interface ProgramWeek {
  weekNumber: number;
  theme: string;
  goal: string;
  psychologyRationale: string;
  tasks: WeekTask[];
  dailyJournalPrompt?: string;
  weeklyReflectionPrompt?: string;
}

export interface WeekTask {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'reduction' | 'reflection';
  isPersistent: boolean;
  isHabit?: boolean;
  metricCategory?: 'build' | 'reduce' | 'neutral';
  metricInputType?: 'boolean' | 'counter' | 'scale';
  metricScoreWeight?: number;
  metricUnitLabel?: string;
}

export interface DefaultMetric {
  id: string;
  name: string;
  category: 'build' | 'reduce' | 'neutral';
  inputType: 'boolean' | 'counter' | 'scale';
  unitLabel: string;
  isSensitive: boolean;
  scoreWeight: number;
  emoji?: string;
  isDefault?: boolean;
}

export interface Program {
  id: string;
  title: string;
  emoji: string;
  description: string;
  totalWeeks: number;
  isSystem: boolean;
  weeks: ProgramWeek[];
  color: string;
  isPublished?: boolean;
  authorId?: string;
  forkedFromId?: string;
  imageUrl?: string;
}

export const DEFAULT_METRICS: DefaultMetric[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Wake on time',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 8,
    emoji: '🌅',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Made bed',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 5,
    emoji: '🛏️',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '10 min sunlight',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 6,
    emoji: '☀️',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Water intake',
    category: 'build',
    inputType: 'counter',
    unitLabel: 'L',
    isSensitive: false,
    scoreWeight: 6,
    emoji: '💧',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: '10 min mindfulness',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 7,
    emoji: '🧘',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Slept on time',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 8,
    emoji: '🌙',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    name: 'Cigarettes',
    category: 'reduce',
    inputType: 'counter',
    unitLabel: 'smoked',
    isSensitive: false,
    scoreWeight: 10,
    emoji: '🚬',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    name: 'Alcohol',
    category: 'reduce',
    inputType: 'counter',
    unitLabel: 'units',
    isSensitive: false,
    scoreWeight: 10,
    emoji: '🍺',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Porn',
    category: 'reduce',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: true,
    scoreWeight: 12,
    emoji: '🔞',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Mood',
    category: 'neutral',
    inputType: 'scale',
    unitLabel: '/10',
    isSensitive: false,
    scoreWeight: 4,
    emoji: '😊',
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Productivity',
    category: 'neutral',
    inputType: 'scale',
    unitLabel: '/10',
    isSensitive: false,
    scoreWeight: 4,
    emoji: '⚡',
  },
];

export const DOPAMINE_DETOX_WEEKS: ProgramWeek[] = [
  {
    weekNumber: 1,
    theme: "Mindful Baseline",
    goal: "Log honest focus levels and establish a screen time boundary.",
    psychologyRationale: "Self-monitoring: Heightening awareness of distraction triggers is the critical first step in behavior change.",
    tasks: [
      { id: "dd-w1-t1", title: "Screen time under 2 hours", description: "Limit phone usage to build resistance to quick dopamine hits.", type: "reduction", isPersistent: true, isHabit: true, metricCategory: "reduce", metricInputType: "counter", metricUnitLabel: "hours", metricScoreWeight: 10 },
      { id: "dd-w1-t2", title: "Unbroken focus work", description: "Complete at least 30 minutes of deep, distraction-free work.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
      { id: "dd-w1-t3", title: "Morning anchor walk", description: "Walk outdoors for 15 minutes immediately after waking to reset circadian rhythm.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 }
    ]
  },
  {
    weekNumber: 2,
    theme: "Friction & Fasting",
    goal: "Add physical barriers to distractions and extend deep work.",
    psychologyRationale: "Environmental design: Restructuring your physical space reduces the cognitive load of resisting temptation.",
    tasks: [
      { id: "dd-w2-t1", title: "App blockers active", description: "Keep distraction blocking apps active during designated focus hours.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
      { id: "dd-w2-t2", title: "No screens after 10 PM", description: "Wind down without blue light stimulation to protect sleep quality.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
      { id: "dd-w2-t3", title: "Deep work (2x Pomodoros)", description: "Log two 25-minute Pomodoro sessions today.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "counter", metricUnitLabel: "sessions", metricScoreWeight: 7 }
    ]
  },
  {
    weekNumber: 3,
    theme: "Physical Anchor",
    goal: "Restore natural dopamine sensitivity through movement and light.",
    psychologyRationale: "BDNF priming: Aerobic exercise and light exposure promote prefrontal cortex recovery and impulse control.",
    tasks: [
      { id: "dd-w3-t1", title: "Get morning sunlight", description: "10 minutes of direct outdoor light to anchor sleep cycles.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 },
      { id: "dd-w3-t2", title: "Strength or Cardio training", description: "30+ minutes of physical training.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 10 },
      { id: "dd-w3-t3", title: "No caffeine after 12 PM", description: "Restrict stimulant intake to restore natural baseline energy.", type: "reduction", isPersistent: true, isHabit: true, metricCategory: "reduce", metricInputType: "boolean", metricScoreWeight: 5 }
    ]
  },
  {
    weekNumber: 4,
    theme: "The Focused Identity",
    goal: "Sustain focus behaviors by embedding them into your identity.",
    psychologyRationale: "Identity alignment: We are far more likely to maintain habits that align with our core self-concept.",
    tasks: [
      { id: "dd-w4-t1", title: "Plan tomorrow's 3 MITs", description: "Write down your 3 Most Important Tasks before going to bed.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 },
      { id: "dd-w4-t2", title: "No scrolling before 9 AM", description: "Delay your first digital dopamine spike until work begins.", type: "reduction", isPersistent: true, isHabit: true, metricCategory: "reduce", metricInputType: "boolean", metricScoreWeight: 8 },
      { id: "dd-w4-t3", title: "Deep focus session (90 min)", description: "Complete one unbroken 90-minute deep work block.", type: "action", isPersistent: true, isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 10 }
    ]
  }
];

export const AVAILABLE_PROGRAMS: Program[] = [
  {
    id: 'dopamine-detox-protocol',
    title: 'Dopamine Detox & Focus Protocol',
    emoji: '⚡',
    description: 'A 4-week structured reset to eliminate digital distractions, rebuild your cognitive focus, and restore baseline mental clarity.',
    totalWeeks: 4,
    isSystem: true,
    color: '#8b5cf6',
    weeks: DOPAMINE_DETOX_WEEKS,
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2574&auto=format&fit=crop', // A beautiful dark/focus themed image
  },
];

export const PROGRAM_IMAGES = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2574&auto=format&fit=crop', // Dopamine/Focus (Clean Desk Workspace)
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2574&auto=format&fit=crop', // Mindfulness/Zen (Mountain Meditation)
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2574&auto=format&fit=crop', // Gym/Discipline (Fitness Weightlifting)
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2574&auto=format&fit=crop', // Recovery/Sleep (Night Window/Cozy Bed)
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=2574&auto=format&fit=crop', // Deep Work/Study (Library Desk & Lamp)
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2574&auto=format&fit=crop', // Habit/Routine (Planner Notebook)
];

export function getProgramImage(programId: string): string {
  if (!programId) return PROGRAM_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < programId.length; i++) {
    hash = programId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROGRAM_IMAGES.length;
  return PROGRAM_IMAGES[index];
}

export const PROGRAM_WEEKS = DOPAMINE_DETOX_WEEKS;

export const DAILY_JOURNAL_PROMPTS: Record<number, string[]> = {
  1: [
    'What did you notice about your behavior today without judgment?',
    'What triggers did you observe in yourself today?',
    'What surprised you about your habits today?',
  ],
  2: [
    'What environmental change made the biggest difference today?',
    'What friction did you add or remove from your environment?',
    'What situation made discipline harder than it needed to be?',
  ],
  3: [
    'How did physical movement change your energy or mood today?',
    'What did your body need today that you gave or denied it?',
    'How did exercise affect your cravings or impulse control?',
  ],
  4: [
    'What did you replace artificial stimulation with today?',
    'When did boredom hit and how did you respond?',
    'What natural activity gave you the most satisfaction today?',
  ],
  5: [
    'Did your actions today align with who you are becoming?',
    'What would your future disciplined self say about today?',
    'What one thing today represented the person you are building?',
  ],
  6: [
    'What was the quality of your focus today?',
    'What interrupted your deep work and how did you recover?',
    'When did you feel most in flow today?',
  ],
  7: [
    'How did connecting with others affect your motivation today?',
    'What relationship did you invest in today?',
    'What would it mean to be the person others can count on?',
  ],
  8: [
    'What is one concrete thing you will do differently in your next chapter?',
    'What have you learned about yourself in 8 weeks?',
    'What does success truly mean to you now?',
  ],
};
