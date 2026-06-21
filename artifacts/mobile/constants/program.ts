export interface ProgramWeek {
  weekNumber: number;
  theme: string;
  goal: string;
  psychologyRationale: string;
  tasks: WeekTask[];
}

export interface WeekTask {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'reduction' | 'reflection';
  isPersistent: boolean;
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

export const DEFAULT_METRICS: DefaultMetric[] = [
  {
    id: 'wake-time',
    name: 'Wake on time',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 8,
  },
  {
    id: 'make-bed',
    name: 'Made bed',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 5,
  },
  {
    id: 'sunlight',
    name: '10 min sunlight',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 6,
  },
  {
    id: 'water',
    name: 'Water intake',
    category: 'build',
    inputType: 'counter',
    unitLabel: 'L',
    isSensitive: false,
    scoreWeight: 6,
  },
  {
    id: 'mindfulness',
    name: '10 min mindfulness',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 7,
  },
  {
    id: 'sleep-time',
    name: 'Slept on time',
    category: 'build',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: false,
    scoreWeight: 8,
  },
  {
    id: 'cigarettes',
    name: 'Cigarettes',
    category: 'reduce',
    inputType: 'counter',
    unitLabel: 'smoked',
    isSensitive: false,
    scoreWeight: 10,
  },
  {
    id: 'alcohol',
    name: 'Alcohol',
    category: 'reduce',
    inputType: 'counter',
    unitLabel: 'units',
    isSensitive: false,
    scoreWeight: 10,
  },
  {
    id: 'porn',
    name: 'Porn',
    category: 'reduce',
    inputType: 'boolean',
    unitLabel: '',
    isSensitive: true,
    scoreWeight: 12,
  },
  {
    id: 'mood',
    name: 'Mood',
    category: 'neutral',
    inputType: 'scale',
    unitLabel: '/10',
    isSensitive: false,
    scoreWeight: 4,
  },
  {
    id: 'productivity',
    name: 'Productivity',
    category: 'neutral',
    inputType: 'scale',
    unitLabel: '/10',
    isSensitive: false,
    scoreWeight: 4,
  },
];

export const PROGRAM_WEEKS: ProgramWeek[] = [
  {
    weekNumber: 1,
    theme: 'Awareness & Stabilization',
    goal: 'Collect baseline data. No reduction targets — just log honestly.',
    psychologyRationale: 'Self-monitoring: The act of tracking changes behavior before any intervention begins.',
    tasks: [
      { id: 'w1-t1', title: 'Log every metric daily', description: 'No judgment. Data only.', type: 'reflection', isPersistent: true },
      { id: 'w1-t2', title: 'Set your wake time target', description: 'Pick a consistent time you can maintain.', type: 'action', isPersistent: false },
      { id: 'w1-t3', title: 'Set your sleep time target', description: 'Work backwards from wake time (7-9 hrs).', type: 'action', isPersistent: false },
      { id: 'w1-t4', title: 'Write your baseline journal', description: 'Where are you honestly right now?', type: 'reflection', isPersistent: false },
    ],
  },
  {
    weekNumber: 2,
    theme: 'Environmental Reset',
    goal: 'Make bad habits harder. Make good habits easier.',
    psychologyRationale: 'Environment > Motivation: Behavior follows context, not willpower.',
    tasks: [
      { id: 'w2-t1', title: 'Remove alcohol from home', description: 'Physical removal reduces friction to abstain.', type: 'action', isPersistent: false },
      { id: 'w2-t2', title: 'Install website blockers', description: 'Cold Turkey or Freedom app — set restrictions.', type: 'action', isPersistent: false },
      { id: 'w2-t3', title: 'Phone outside bedroom', description: 'Charge it in another room tonight.', type: 'action', isPersistent: false },
      { id: 'w2-t4', title: 'Lay gym clothes the night before', description: 'Reduce morning decision friction.', type: 'action', isPersistent: true },
    ],
  },
  {
    weekNumber: 3,
    theme: 'Physical Recovery',
    goal: 'Rebuild energy and executive function through movement.',
    psychologyRationale: 'Exercise improves prefrontal cortex function — the seat of impulse control.',
    tasks: [
      { id: 'w3-t1', title: 'Gym 3x this week (Workout A)', description: 'Squats 3x8, Pushups 3x10, Bent Row 3x8', type: 'action', isPersistent: true },
      { id: 'w3-t2', title: 'Gym 3x this week (Workout B)', description: 'Deadlift 3x5, Press 3x8, Pullups 3x max', type: 'action', isPersistent: true },
      { id: 'w3-t3', title: '8,000+ steps daily', description: 'Track via phone or wearable.', type: 'action', isPersistent: true },
      { id: 'w3-t4', title: 'Cold shower after gym', description: 'Builds stress tolerance and mental clarity.', type: 'action', isPersistent: false },
    ],
  },
  {
    weekNumber: 4,
    theme: 'Dopamine Reset',
    goal: 'Reduce artificial stimulation. Replace with natural rewards.',
    psychologyRationale: 'Dopamine baseline must recover before self-control improves.',
    tasks: [
      { id: 'w4-t1', title: 'Reduce smoking by 20-30%', description: 'Use tracked daily count to hit target.', type: 'reduction', isPersistent: false },
      { id: 'w4-t2', title: 'Reduce alcohol by 50%', description: 'Track units — half last week\'s total.', type: 'reduction', isPersistent: false },
      { id: 'w4-t3', title: 'Social media < 30 min/day', description: 'Use screen time settings to enforce this.', type: 'reduction', isPersistent: true },
      { id: 'w4-t4', title: 'Replace with reading or walking', description: '20 min reading before bed instead of scrolling.', type: 'action', isPersistent: true },
    ],
  },
  {
    weekNumber: 5,
    theme: 'Identity Rebuilding',
    goal: 'Align actions with who you are becoming.',
    psychologyRationale: 'Identity-based habits: We sustain behaviors that align with our self-image.',
    tasks: [
      { id: 'w5-t1', title: 'Write your identity statement', description: '"I am becoming a disciplined person."', type: 'reflection', isPersistent: false },
      { id: 'w5-t2', title: 'Daily identity check-in', description: '"Did I act like a disciplined person today?"', type: 'reflection', isPersistent: true },
      { id: 'w5-t3', title: 'Identify 3 identity-aligned actions', description: 'What does your future self do that you can do today?', type: 'reflection', isPersistent: false },
      { id: 'w5-t4', title: 'Remove one identity-misaligned habit', description: 'One thing your future self would not do.', type: 'reduction', isPersistent: false },
    ],
  },
  {
    weekNumber: 6,
    theme: 'Deep Work Training',
    goal: 'Build the capacity for focused, distraction-free work.',
    psychologyRationale: 'Attention is trainable. Flow states require deliberate practice.',
    tasks: [
      { id: 'w6-t1', title: '2x Pomodoro sessions daily', description: '25-min work / 5-min break. Use built-in timer.', type: 'action', isPersistent: true },
      { id: 'w6-t2', title: 'Phone off during work sessions', description: 'Full airplane mode or in another room.', type: 'action', isPersistent: true },
      { id: 'w6-t3', title: 'Build to 90-min focus block', description: 'By end of week: one unbroken 90-min session.', type: 'action', isPersistent: false },
      { id: 'w6-t4', title: 'Daily shutdown ritual', description: 'Write tomorrow\'s 3 priorities before stopping work.', type: 'action', isPersistent: true },
    ],
  },
  {
    weekNumber: 7,
    theme: 'Social Recovery',
    goal: 'Rebuild meaningful human connection.',
    psychologyRationale: 'Social bonds are the single strongest predictor of long-term recovery.',
    tasks: [
      { id: 'w7-t1', title: 'Call family twice this week', description: 'Not text — voice or video call.', type: 'action', isPersistent: false },
      { id: 'w7-t2', title: 'Meet one friend in person', description: 'Plan it now. Set the date.', type: 'action', isPersistent: false },
      { id: 'w7-t3', title: 'Join one community or group', description: 'Gym class, running club, hobby group.', type: 'action', isPersistent: false },
      { id: 'w7-t4', title: 'Do one thing for someone else', description: 'Service restores a sense of self-worth.', type: 'action', isPersistent: false },
    ],
  },
  {
    weekNumber: 8,
    theme: 'Life Direction',
    goal: 'Build a compelling future worth disciplining yourself for.',
    psychologyRationale: 'Future pacing: behavior changes when the future becomes emotionally real.',
    tasks: [
      { id: 'w8-t1', title: 'Write your Health vision', description: 'Who is the healthiest version of you in 1 year?', type: 'reflection', isPersistent: false },
      { id: 'w8-t2', title: 'Write your Career vision', description: 'What does your disciplined future self achieve?', type: 'reflection', isPersistent: false },
      { id: 'w8-t3', title: 'Write your Relationship vision', description: 'What do your relationships look and feel like?', type: 'reflection', isPersistent: false },
      { id: 'w8-t4', title: 'Convert visions to 90-day goals', description: 'What are 3 concrete actions in the next 90 days?', type: 'reflection', isPersistent: false },
    ],
  },
];

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
