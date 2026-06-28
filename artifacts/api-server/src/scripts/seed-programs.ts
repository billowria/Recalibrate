import { db } from "@workspace/db";
import { programs, programWeeks, programTasks } from "@workspace/db/schema";

const SYSTEM_PROGRAMS = [
  {
    id: "dopamine-detox-protocol",
    title: "Dopamine Detox & Focus Protocol",
    emoji: "⚡",
    description: "A 4-week structured reset to eliminate digital distractions, rebuild your cognitive focus, and restore baseline mental clarity.",
    totalWeeks: 4,
    isSystem: true,
    isPublished: true,
    color: "#8b5cf6",
    weeks: [
      {
        weekNumber: 1,
        theme: "Mindful Baseline",
        goal: "Log honest focus levels and establish a screen time boundary.",
        psychologyRationale: "Self-monitoring: Heightening awareness of distraction triggers is the critical first step in behavior change.",
        dailyJournalPrompt: "Write about your focus quality, craving peaks, and daily mood without judgment.",
        weeklyReflectionPrompt: "What was your biggest source of digital distraction this week, and how did it affect your work?",
        tasks: [
          { title: "Screen time under 2 hours", description: "Limit phone usage to build resistance to quick dopamine hits.", isHabit: true, metricCategory: "reduce", metricInputType: "counter", metricUnitLabel: "hours", metricScoreWeight: 10 },
          { title: "Unbroken focus work", description: "Complete at least 30 minutes of deep, distraction-free work.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
          { title: "Morning anchor walk", description: "Walk outdoors for 15 minutes immediately after waking to reset circadian rhythm.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 }
        ]
      },
      {
        weekNumber: 2,
        theme: "Friction & Fasting",
        goal: "Add physical barriers to distractions and extend deep work.",
        psychologyRationale: "Environmental design: Restructuring your physical space reduces the cognitive load of resisting temptation.",
        dailyJournalPrompt: "What friction did you add to your phone/web apps today, and how did it help?",
        weeklyReflectionPrompt: "How has your baseline concentration shifted after adding friction to your digital distractions?",
        tasks: [
          { title: "App blockers active", description: "Keep distraction blocking apps active during designated focus hours.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
          { title: "No screens after 10 PM", description: "Wind down without blue light stimulation to protect sleep quality.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 8 },
          { title: "Deep work (2x Pomodoros)", description: "Log two 25-minute Pomodoro sessions today.", isHabit: true, metricCategory: "build", metricInputType: "counter", metricUnitLabel: "sessions", metricScoreWeight: 7 }
        ]
      },
      {
        weekNumber: 3,
        theme: "Physical Anchor",
        goal: "Restore natural dopamine sensitivity through movement and light.",
        psychologyRationale: "BDNF priming: Aerobic exercise and light exposure promote prefrontal cortex recovery and impulse control.",
        dailyJournalPrompt: "How did physical exertion affect your craving levels today?",
        weeklyReflectionPrompt: "In what ways did morning sunlight and physical training influence your focus quality?",
        tasks: [
          { title: "Get morning sunlight", description: "10 minutes of direct outdoor light to anchor sleep cycles.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 },
          { title: "Strength or Cardio training", description: "30+ minutes of physical training.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 10 },
          { title: "No caffeine after 12 PM", description: "Restrict stimulant intake to restore natural baseline energy.", isHabit: true, metricCategory: "reduce", metricInputType: "boolean", metricScoreWeight: 5 }
        ]
      },
      {
        weekNumber: 4,
        theme: "The Focused Identity",
        goal: "Sustain focus behaviors by embedding them into your identity.",
        psychologyRationale: "Identity alignment: We are far more likely to maintain habits that align with our core self-concept.",
        dailyJournalPrompt: "How did your choices today align with your identity as a focused and disciplined person?",
        weeklyReflectionPrompt: "Write your vision for the next 90 days of work and physical health.",
        tasks: [
          { title: "Plan tomorrow's 3 MITs", description: "Write down your 3 Most Important Tasks before going to bed.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 6 },
          { title: "No scrolling before 9 AM", description: "Delay your first digital dopamine spike until work begins.", isHabit: true, metricCategory: "reduce", metricInputType: "boolean", metricScoreWeight: 8 },
          { title: "Deep focus session (90 min)", description: "Complete one unbroken 90-minute deep work block.", isHabit: true, metricCategory: "build", metricInputType: "boolean", metricScoreWeight: 10 }
        ]
      }
    ]
  }
];

async function seedPrograms() {
  console.log("Seeding system programs into the database...");
  
  try {
    // Truncate existing program tables first to clear out dummy data
    await db.delete(programTasks);
    await db.delete(programWeeks);
    await db.delete(programs);
    console.log("Cleared old program data from the database.");

    for (const progData of SYSTEM_PROGRAMS) {
      const { weeks, ...programBase } = progData;
      
      // Insert program base
      await db.insert(programs).values(programBase);
      console.log(`Inserted program: ${programBase.title}`);

      // Loop weeks
      for (const w of weeks) {
        const weekId = `${programBase.id}-w${w.weekNumber}`;
        
        await db.insert(programWeeks).values({
          id: weekId,
          programId: programBase.id,
          weekNumber: w.weekNumber,
          theme: w.theme,
          goal: w.goal,
          psychologyRationale: w.psychologyRationale,
          dailyJournalPrompt: w.dailyJournalPrompt,
          weeklyReflectionPrompt: w.weeklyReflectionPrompt,
        });

        // Loop tasks
        for (let i = 0; i < w.tasks.length; i++) {
          const t = w.tasks[i];
          const taskId = `${weekId}-t${i + 1}`;
          
          const taskValues = {
            id: taskId,
            weekId,
            title: t.title,
            description: t.description,
            isHabit: t.isHabit,
            metricCategory: (t as any).metricCategory || null,
            metricInputType: (t as any).metricInputType || null,
            metricUnitLabel: (t as any).metricUnitLabel || null,
            metricScoreWeight: (t as any).metricScoreWeight || null,
          };

          await db.insert(programTasks).values(taskValues);
        }
      }
      console.log(`Successfully seeded all weeks and tasks for: ${programBase.title}`);
    }
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding programs:", error);
  }
  
  process.exit(0);
}

seedPrograms();
