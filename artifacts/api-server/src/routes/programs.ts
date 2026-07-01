import { Router } from "express";
import { db } from "@workspace/db";
import { programs, workoutDays, workoutDayExercises, exercises } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";

const router = Router();

// Get all published programs (Community / System) plus custom programs for authorId
router.get("/programs", async (req, res) => {
  try {
    const { authorId } = req.query;
    let condition = eq(programs.isTemplate, true);
    
    if (authorId && typeof authorId === "string" && authorId.trim().length > 0) {
      condition = or(eq(programs.isTemplate, true), eq(programs.userId, authorId)) as any;
    }

    const allPrograms = await db.select().from(programs).where(condition);
    
    const fullPrograms = await Promise.all(allPrograms.map(async (p) => {
      const days = await db.select().from(workoutDays).where(eq(workoutDays.programId, p.id));
      
      const daysWithExercises = await Promise.all(days.map(async (d) => {
        const dayExs = await db.select().from(workoutDayExercises).where(eq(workoutDayExercises.workoutDayId, d.id));
        
        const dayExsWithDetails = await Promise.all(dayExs.map(async (de) => {
          const [exDetails] = await db.select().from(exercises).where(eq(exercises.id, de.exerciseId));
          return { ...de, exercise: exDetails };
        }));

        return { ...d, exercises: dayExsWithDetails };
      }));
      
      return { ...p, days: daysWithExercises };
    }));

    res.json(fullPrograms);
  } catch (error) {
    console.error("Error fetching programs:", error);
    res.status(500).json({ error: "Failed to fetch programs" });
  }
});

// Create a custom program
router.post("/programs", async (req, res) => {
  try {
    const { title, emoji, description, color, authorId, days } = req.body;
    const programId = `custom-${Date.now()}`;
    
    const [newProgram] = await db.insert(programs).values({
      id: programId,
      userId: authorId,
      title,
      emoji: emoji || "💪",
      description,
      color: color || "#7C3AED",
      isTemplate: false
    }).returning();

    if (days && Array.isArray(days)) {
      for (const d of days) {
        const [newDay] = await db.insert(workoutDays).values({
          programId,
          dayNumber: d.dayNumber,
          title: d.title,
          targetMuscleGroups: d.targetMuscleGroups || []
        }).returning();

        if (d.exercises && Array.isArray(d.exercises)) {
          for (let i = 0; i < d.exercises.length; i++) {
            const ex = d.exercises[i];
            await db.insert(workoutDayExercises).values({
              workoutDayId: newDay.id,
              exerciseId: ex.exerciseId,
              sortOrder: i + 1,
              targetSets: ex.targetSets || 3,
              targetReps: ex.targetReps || 10,
              targetRpe: ex.targetRpe || 8
            });
          }
        }
      }
    }

    res.status(201).json(newProgram);
  } catch (error) {
    console.error("Error creating program:", error);
    res.status(500).json({ error: "Failed to create program" });
  }
});

// Update program templates (publish/template flags)
router.patch("/programs/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const { isTemplate } = req.body;
    
    const [updated] = await db.update(programs)
      .set({ isTemplate })
      .where(eq(programs.id, id))
      .returning();
      
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update program" });
  }
});

// Update an existing custom program
router.put("/programs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, emoji, description, color, days } = req.body;
    
    const existingProgram = await db.select().from(programs).where(eq(programs.id, id));
    if (existingProgram.length === 0) {
      res.status(404).json({ error: "Program not found" });
      return;
    }

    const [updatedProgram] = await db.update(programs).set({
      title, emoji, description, color
    }).where(eq(programs.id, id)).returning();

    if (days && Array.isArray(days)) {
      await db.delete(workoutDays).where(eq(workoutDays.programId, id));
      
      for (const d of days) {
        const [newDay] = await db.insert(workoutDays).values({
          programId: id,
          dayNumber: d.dayNumber,
          title: d.title,
          targetMuscleGroups: d.targetMuscleGroups || []
        }).returning();

        if (d.exercises && Array.isArray(d.exercises)) {
          for (let i = 0; i < d.exercises.length; i++) {
            const ex = d.exercises[i];
            await db.insert(workoutDayExercises).values({
              workoutDayId: newDay.id,
              exerciseId: ex.exerciseId,
              sortOrder: i + 1,
              targetSets: ex.targetSets || 3,
              targetReps: ex.targetReps || 10,
              targetRpe: ex.targetRpe || 8
            });
          }
        }
      }
    }

    res.json(updatedProgram);
  } catch (error) {
    console.error("Error updating program:", error);
    res.status(500).json({ error: "Failed to update program" });
  }
});

// Delete a custom program
router.delete("/programs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingProgram = await db.select().from(programs).where(eq(programs.id, id));
    if (existingProgram.length === 0) {
      res.status(404).json({ error: "Program not found" });
      return;
    }

    await db.delete(programs).where(eq(programs.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting program:", error);
    res.status(500).json({ error: "Failed to delete program" });
  }
});

export default router;
