import { db } from "@workspace/db";
import { programs, workoutDays, workoutDayExercises, exercises } from "@workspace/db/schema";

const GLOBAL_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbell" },
  { name: "Chest Fly", muscleGroup: "Chest", equipment: "Cables" },
  // Back
  { name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell" },
  { name: "Pull-Up", muscleGroup: "Back", equipment: "Bodyweight" },
  { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable Machine" },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell" },
  { name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly", muscleGroup: "Shoulders", equipment: "Dumbbell" },
  // Legs
  { name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell" },
  { name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell" },
  { name: "Leg Press", muscleGroup: "Legs", equipment: "Leg Press Machine" },
  { name: "Calf Raise", muscleGroup: "Legs", equipment: "Calf Raise Machine" },
  // Arms
  { name: "Barbell Bicep Curl", muscleGroup: "Arms", equipment: "Barbell" },
  { name: "Tricep Pushdown", muscleGroup: "Arms", equipment: "Cable Machine" }
];

const SYSTEM_PROGRAMS = [
  {
    id: "ppl-split-template",
    title: "Push / Pull / Legs (PPL) Hypertrophy",
    description: "A classic 3-day hypertrophy split designed to build balanced strength and muscle mass.",
    isTemplate: true,
    color: "#8b5cf6",
    emoji: "💪",
    days: [
      {
        dayNumber: 1,
        title: "Push Day (Chest, Shoulders & Triceps)",
        targetMuscleGroups: ["Chest", "Shoulders", "Arms"],
        exercises: [
          { name: "Barbell Bench Press", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Overhead Press", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Incline Dumbbell Press", targetSets: 3, targetReps: 10, targetRpe: 7 },
          { name: "Lateral Raise", targetSets: 3, targetReps: 12, targetRpe: 8 },
          { name: "Tricep Pushdown", targetSets: 3, targetReps: 12, targetRpe: 8 }
        ]
      },
      {
        dayNumber: 2,
        title: "Pull Day (Back, Rear Delts & Biceps)",
        targetMuscleGroups: ["Back", "Shoulders", "Arms"],
        exercises: [
          { name: "Barbell Row", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Pull-Up", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Lat Pulldown", targetSets: 3, targetReps: 10, targetRpe: 7 },
          { name: "Rear Delt Fly", targetSets: 3, targetReps: 12, targetRpe: 8 },
          { name: "Barbell Bicep Curl", targetSets: 3, targetReps: 12, targetRpe: 8 }
        ]
      },
      {
        dayNumber: 3,
        title: "Leg Day (Quads, Hamstrings & Calves)",
        targetMuscleGroups: ["Legs"],
        exercises: [
          { name: "Barbell Squat", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Romanian Deadlift", targetSets: 3, targetReps: 8, targetRpe: 8 },
          { name: "Leg Press", targetSets: 3, targetReps: 10, targetRpe: 7 },
          { name: "Calf Raise", targetSets: 3, targetReps: 15, targetRpe: 8 }
        ]
      }
    ]
  }
];

async function seedPrograms() {
  console.log("Seeding system programs and global exercises...");

  try {
    // Truncate existing program tables first to clear out dummy data
    await db.delete(workoutDayExercises);
    await db.delete(workoutDays);
    await db.delete(programs);
    await db.delete(exercises);
    console.log("Cleared old database tables.");

    // Seed Exercises
    const insertedExercises: { [name: string]: string } = {};
    for (const ex of GLOBAL_EXERCISES) {
      const res = await db.insert(exercises).values(ex).returning({ id: exercises.id });
      insertedExercises[ex.name] = res[0].id;
    }
    console.log(`Successfully seeded ${GLOBAL_EXERCISES.length} global exercises.`);

    // Seed Programs
    for (const progData of SYSTEM_PROGRAMS) {
      const { days, ...programBase } = progData;

      // Insert program base
      await db.insert(programs).values(programBase);
      console.log(`Inserted program: ${programBase.title}`);

      // Loop days
      for (const d of days) {
        const dayRes = await db.insert(workoutDays).values({
          programId: programBase.id,
          dayNumber: d.dayNumber,
          title: d.title,
          targetMuscleGroups: d.targetMuscleGroups
        }).returning({ id: workoutDays.id });

        const dayId = dayRes[0].id;

        // Loop and link exercises
        for (let i = 0; i < d.exercises.length; i++) {
          const exReq = d.exercises[i];
          const exerciseId = insertedExercises[exReq.name];

          if (!exerciseId) {
            console.error(`Could not find exercise ID for ${exReq.name}`);
            continue;
          }

          await db.insert(workoutDayExercises).values({
            workoutDayId: dayId,
            exerciseId,
            sortOrder: i + 1,
            targetSets: exReq.targetSets,
            targetReps: exReq.targetReps,
            targetRpe: exReq.targetRpe
          });
        }
      }
      console.log(`Successfully seeded all days and exercises for: ${programBase.title}`);
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding programs:", error);
  }

  process.exit(0);
}

seedPrograms();
