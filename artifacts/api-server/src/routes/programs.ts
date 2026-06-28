import { Router } from "express";
import { db } from "@workspace/db";
import { programs, programWeeks, programTasks } from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";

const router = Router();

// Get all published programs (Community / System) plus custom programs for authorId
router.get("/programs", async (req, res) => {
  try {
    const { authorId } = req.query;
    let condition = eq(programs.isPublished, true);
    
    if (authorId && typeof authorId === "string" && authorId.trim().length > 0) {
      condition = or(eq(programs.isPublished, true), eq(programs.authorId, authorId)) as any;
    }

    const allPrograms = await db.select().from(programs).where(condition);
    
    // For each program, we ideally want to fetch its weeks and tasks.
    // For simplicity, we can do it in a loop here, or use relations if Drizzle relations are configured.
    // Since relations might not be set up in the schema file, we'll fetch manually.
    const fullPrograms = await Promise.all(allPrograms.map(async (p) => {
      const weeks = await db.select().from(programWeeks).where(eq(programWeeks.programId, p.id));
      
      const weeksWithTasks = await Promise.all(weeks.map(async (w) => {
        const tasks = await db.select().from(programTasks).where(eq(programTasks.weekId, w.id));
        return { ...w, tasks };
      }));
      
      return { ...p, weeks: weeksWithTasks };
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
    const { title, emoji, description, color, totalWeeks, authorId, forkedFromId, weeks } = req.body;
    
    // Generate an ID
    const programId = `custom-${Date.now()}`;
    
    const [newProgram] = await db.insert(programs).values({
      id: programId,
      title,
      emoji,
      description,
      color,
      totalWeeks,
      isSystem: false,
      isPublished: false, // Default to private
      authorId,
      forkedFromId
    }).returning();

    if (weeks && Array.isArray(weeks)) {
      for (const w of weeks) {
        const weekId = `${programId}-w${w.weekNumber}`;
        await db.insert(programWeeks).values({
          id: weekId,
          programId,
          weekNumber: w.weekNumber,
          theme: w.theme,
          goal: w.goal,
          psychologyRationale: w.psychologyRationale,
          dailyJournalPrompt: w.dailyJournalPrompt,
          weeklyReflectionPrompt: w.weeklyReflectionPrompt
        });

        if (w.tasks && Array.isArray(w.tasks)) {
          for (let i = 0; i < w.tasks.length; i++) {
            const t = w.tasks[i];
            const taskId = `${weekId}-t${i + 1}`;
            await db.insert(programTasks).values({
              id: taskId,
              weekId,
              title: t.title,
              description: t.description,
              isHabit: t.isHabit,
              metricCategory: t.metricCategory,
              metricInputType: t.metricInputType,
              metricUnitLabel: t.metricUnitLabel,
              metricScoreWeight: t.metricScoreWeight
            });
          }
        }
      }
    }

    res.status(201).json({ ...newProgram, weeks: weeks || [] });
  } catch (error) {
    console.error("Error creating program:", error);
    res.status(500).json({ error: "Failed to create program" });
  }
});

// Update program published status
router.patch("/programs/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const [updated] = await db.update(programs)
      .set({ isPublished })
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
    const { title, emoji, description, color, totalWeeks, weeks } = req.body;
    
    // Validate if the program exists and is not a system program
    const existingProgram = await db.select().from(programs).where(eq(programs.id, id));
    if (existingProgram.length === 0) { res.status(404).json({ error: "Program not found" }); return; }
    if (existingProgram[0].isSystem) { res.status(403).json({ error: "Cannot modify system programs" }); return; }

    // Update main program
    const [updatedProgram] = await db.update(programs).set({
      title, emoji, description, color, totalWeeks
    }).where(eq(programs.id, id)).returning();

    // To properly update weeks/tasks, the easiest approach for a builder is often to drop and recreate them, 
    // or meticulously diff them. For MVP of the program builder, we delete existing weeks/tasks and re-insert.
    if (weeks && Array.isArray(weeks)) {
      await db.delete(programWeeks).where(eq(programWeeks.programId, id));
      for (const w of weeks) {
        const weekId = `${id}-w${w.weekNumber}`;
        await db.insert(programWeeks).values({
          id: weekId,
          programId: id,
          weekNumber: w.weekNumber,
          theme: w.theme,
          goal: w.goal,
          psychologyRationale: w.psychologyRationale,
          dailyJournalPrompt: w.dailyJournalPrompt,
          weeklyReflectionPrompt: w.weeklyReflectionPrompt
        });

        if (w.tasks && Array.isArray(w.tasks)) {
          for (let i = 0; i < w.tasks.length; i++) {
            const t = w.tasks[i];
            const taskId = `${weekId}-t${i + 1}`;
            await db.insert(programTasks).values({
              id: taskId,
              weekId,
              title: t.title,
              description: t.description,
              isHabit: t.isHabit,
              metricCategory: t.metricCategory,
              metricInputType: t.metricInputType,
              metricUnitLabel: t.metricUnitLabel,
              metricScoreWeight: t.metricScoreWeight
            });
          }
        }
      }
    }

    res.json({ ...updatedProgram, weeks: weeks || [] });
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
    if (existingProgram.length === 0) { res.status(404).json({ error: "Program not found" }); return; }
    if (existingProgram[0].isSystem) { res.status(403).json({ error: "Cannot delete system programs" }); return; }

    await db.delete(programs).where(eq(programs.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting program:", error);
    res.status(500).json({ error: "Failed to delete program" });
  }
});

export default router;
