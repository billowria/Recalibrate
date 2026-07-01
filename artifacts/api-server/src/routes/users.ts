import { Router } from "express";
import crypto from "crypto";
import { eq, or, sql, inArray } from "drizzle-orm";
import {
  db,
  users,
  exercises,
  programs,
  workoutDays,
  workoutDayExercises,
  workoutSessions,
  exerciseLogs,
  journals
} from "@workspace/db";
import { RegisterUserBody, SyncUserDataBody, LoginUserBody, UpdatePushTokenBody } from "@workspace/api-zod";
import { Expo } from "expo-server-sdk";
import { createClient } from "@supabase/supabase-js";

const expo = new Expo();

// Supabase client for Storage uploads
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || "";
const supabase = (supabaseUrl && supabaseServiceKey && supabaseServiceKey !== "your_secret_key_here")
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password: string, hash: string) => {
  const [salt, key] = hash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
};

const router = Router();

/**
 * POST /api/users/register
 * Registers a new user and enrolls them in the default hypertrophy program.
 */
router.post("/users/register", async (req, res, next) => {
  try {
    const body = RegisterUserBody.parse(req.body);
    const userId = crypto.randomUUID();
    const today = body.startDate || new Date().toISOString().split("T")[0];

    // Check if email already exists
    if (body.email) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, body.email));
      if (existingUser) {
        res.status(400).json({ error: "This email is already registered." });
        return;
      }
    }

    const hashedPassword = body.password ? hashPassword(body.password) : null;

    await db.transaction(async (tx) => {
      // Create the user profile enrolled in PPL split as default
      await tx.insert(users).values({
        id: userId,
        name: body.name,
        email: body.email,
        password: hashedPassword,
        startDate: today,
        wakeTime: body.wakeTime || "06:00",
        bedTime: body.bedTime || "22:30",
        totalXP: 0,
        highestStreak: 0,
        onboardingComplete: false,
        activeProgramIds: ["ppl-split-template"],
        savedProgramIds: ["ppl-split-template"]
      });
    });

    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));

    res.status(201).json({
      userId,
      profile: {
        name: userRecord.name,
        wakeTime: userRecord.wakeTime || "06:00",
        bedTime: userRecord.bedTime || "22:30",
        startDate: userRecord.startDate,
        totalXP: userRecord.totalXP || 0,
        highestStreak: userRecord.highestStreak || 0,
        onboardingComplete: userRecord.onboardingComplete || false,
        activeProgramIds: userRecord.activeProgramIds || [],
        savedProgramIds: userRecord.savedProgramIds || []
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/login
 * Authenticates a user and returns their profile.
 */
router.post("/users/login", async (req, res, next) => {
  try {
    const body = LoginUserBody.parse(req.body);

    const [userRecord] = await db.select().from(users).where(eq(users.email, body.email));
    if (!userRecord || !userRecord.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = verifyPassword(body.password, userRecord.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.status(200).json({
      userId: userRecord.id,
      onboardingComplete: userRecord.onboardingComplete || false,
      profile: {
        name: userRecord.name,
        wakeTime: userRecord.wakeTime || "06:00",
        bedTime: userRecord.bedTime || "22:30",
        startDate: userRecord.startDate,
        totalXP: userRecord.totalXP || 0,
        highestStreak: userRecord.highestStreak || 0,
        onboardingComplete: userRecord.onboardingComplete || false,
        activeProgramIds: userRecord.activeProgramIds || [],
        savedProgramIds: userRecord.savedProgramIds || [],
        avatarUrl: userRecord.avatarUrl || null,
        bio: userRecord.bio || null,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/data
 * Restores or fetches the complete sync state for a user.
 */
router.get("/users/:userId/data", async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const [profileRecord] = await db.select().from(users).where(eq(users.id, userId));
    if (!profileRecord) {
      res.status(404).json({ error: `User not found: ${userId}` });
      return;
    }

    // 1. Fetch exercises (both global templates and user's custom ones)
    const dbExercises = await db.select().from(exercises).where(
      or(eq(exercises.userId, userId), sql`user_id IS NULL`)
    );

    // 2. Fetch programs (both templates and user's custom ones)
    const dbPrograms = await db.select().from(programs).where(
      or(eq(programs.userId, userId), eq(programs.isTemplate, true))
    );

    const programIds = dbPrograms.map(p => p.id);

    // 3. Fetch workoutDays for these programs
    const dbWorkoutDays = programIds.length > 0
      ? await db.select().from(workoutDays).where(inArray(workoutDays.programId, programIds))
      : [];

    const dayIds = dbWorkoutDays.map(d => d.id);

    // 4. Fetch workoutDayExercises for these days
    const dbWorkoutDayExercises = dayIds.length > 0
      ? await db.select().from(workoutDayExercises).where(inArray(workoutDayExercises.workoutDayId, dayIds))
      : [];

    // 5. Fetch workoutSessions for this user
    const dbWorkoutSessions = await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId));
    const sessionIds = dbWorkoutSessions.map(s => s.id);

    // 6. Fetch exerciseLogs for these sessions
    const dbExerciseLogs = sessionIds.length > 0
      ? await db.select().from(exerciseLogs).where(inArray(exerciseLogs.workoutSessionId, sessionIds))
      : [];

    // 7. Fetch journals for this user
    const dbJournals = await db.select().from(journals).where(eq(journals.userId, userId));

    res.json({
      profile: {
        name: profileRecord.name,
        wakeTime: profileRecord.wakeTime || "06:00",
        bedTime: profileRecord.bedTime || "22:30",
        startDate: profileRecord.startDate,
        totalXP: profileRecord.totalXP || 0,
        highestStreak: profileRecord.highestStreak || 0,
        onboardingComplete: profileRecord.onboardingComplete || false,
        activeProgramIds: profileRecord.activeProgramIds || [],
        savedProgramIds: profileRecord.savedProgramIds || [],
        avatarUrl: profileRecord.avatarUrl || null,
        bio: profileRecord.bio || null,
      },
      exercises: dbExercises.map((e) => ({
        id: e.id,
        userId: e.userId || null,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment || null
      })),
      programs: dbPrograms.map((p) => ({
        id: p.id,
        userId: p.userId || null,
        title: p.title,
        description: p.description || null,
        isTemplate: p.isTemplate,
        color: p.color,
        emoji: p.emoji
      })),
      workoutDays: dbWorkoutDays.map((wd) => ({
        id: wd.id,
        programId: wd.programId,
        dayNumber: wd.dayNumber,
        title: wd.title,
        targetMuscleGroups: wd.targetMuscleGroups
      })),
      workoutDayExercises: dbWorkoutDayExercises.map((wde) => ({
        id: wde.id,
        workoutDayId: wde.workoutDayId,
        exerciseId: wde.exerciseId,
        sortOrder: wde.sortOrder,
        targetSets: wde.targetSets,
        targetReps: wde.targetReps,
        targetRpe: wde.targetRpe || null
      })),
      workoutSessions: dbWorkoutSessions.map((ws) => ({
        id: ws.id,
        userId: ws.userId,
        workoutDayId: ws.workoutDayId || null,
        startedAt: ws.startedAt.toISOString(),
        completedAt: ws.completedAt ? ws.completedAt.toISOString() : null,
        volumeScore: ws.volumeScore
      })),
      exerciseLogs: dbExerciseLogs.map((el) => ({
        id: el.id,
        workoutSessionId: el.workoutSessionId,
        exerciseId: el.exerciseId,
        setNumber: el.setNumber,
        weight: Number(el.weight),
        reps: el.reps,
        rpe: el.rpe || null,
        isPr: el.isPr
      })),
      journals: dbJournals.map((j) => ({
        id: j.id,
        userId: j.userId,
        date: j.date,
        content: j.content,
        mood: j.mood || null
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/sync
 * Syncs the local storage data to the Supabase database.
 */
router.post("/users/:userId/sync", async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const body = SyncUserDataBody.parse(req.body);

    const [userExists] = await db.select().from(users).where(eq(users.id, userId));
    if (!userExists) {
      res.status(444).json({ error: `User ${userId} not registered` });
      return;
    }

    await db.transaction(async (tx) => {
      // 1. Sync profile
      if (body.profile) {
        await tx.insert(users).values({
          id: userId,
          name: body.profile.name,
          wakeTime: body.profile.wakeTime,
          bedTime: body.profile.bedTime,
          startDate: body.profile.startDate,
          totalXP: body.profile.totalXP,
          highestStreak: body.profile.highestStreak,
          onboardingComplete: body.profile.onboardingComplete,
          activeProgramIds: body.profile.activeProgramIds,
          savedProgramIds: body.profile.savedProgramIds
        }).onConflictDoUpdate({
          target: users.id,
          set: {
            name: body.profile.name,
            wakeTime: body.profile.wakeTime,
            bedTime: body.profile.bedTime,
            startDate: body.profile.startDate,
            totalXP: body.profile.totalXP,
            highestStreak: body.profile.highestStreak,
            onboardingComplete: body.profile.onboardingComplete,
            activeProgramIds: body.profile.activeProgramIds,
            savedProgramIds: body.profile.savedProgramIds,
            updatedAt: new Date()
          }
        });
      }

      // 2. Sync custom exercises
      if (body.exercises && body.exercises.length > 0) {
        for (const e of body.exercises) {
          if (!e.userId) continue; // Only sync custom user-owned exercises
          await tx.insert(exercises).values({
            id: e.id,
            userId: e.userId,
            name: e.name,
            muscleGroup: e.muscleGroup,
            equipment: e.equipment || null
          }).onConflictDoUpdate({
            target: exercises.id,
            set: {
              name: e.name,
              muscleGroup: e.muscleGroup,
              equipment: e.equipment || null
            }
          });
        }
      }

      // 3. Sync custom programs
      if (body.programs && body.programs.length > 0) {
        for (const p of body.programs) {
          if (!p.userId) continue; // Only sync custom user-owned programs
          await tx.insert(programs).values({
            id: p.id,
            userId: p.userId,
            title: p.title,
            description: p.description || null,
            isTemplate: p.isTemplate,
            color: p.color,
            emoji: p.emoji
          }).onConflictDoUpdate({
            target: programs.id,
            set: {
              title: p.title,
              description: p.description || null,
              isTemplate: p.isTemplate,
              color: p.color,
              emoji: p.emoji
            }
          });
        }
      }

      // 4. Sync workoutDays
      if (body.workoutDays && body.workoutDays.length > 0) {
        for (const wd of body.workoutDays) {
          await tx.insert(workoutDays).values({
            id: wd.id,
            programId: wd.programId,
            dayNumber: wd.dayNumber,
            title: wd.title,
            targetMuscleGroups: wd.targetMuscleGroups
          }).onConflictDoUpdate({
            target: workoutDays.id,
            set: {
              dayNumber: wd.dayNumber,
              title: wd.title,
              targetMuscleGroups: wd.targetMuscleGroups
            }
          });
        }
      }

      // 5. Sync workoutDayExercises
      if (body.workoutDayExercises && body.workoutDayExercises.length > 0) {
        for (const wde of body.workoutDayExercises) {
          await tx.insert(workoutDayExercises).values({
            id: wde.id,
            workoutDayId: wde.workoutDayId,
            exerciseId: wde.exerciseId,
            sortOrder: wde.sortOrder,
            targetSets: wde.targetSets,
            targetReps: wde.targetReps,
            targetRpe: wde.targetRpe || null
          }).onConflictDoUpdate({
            target: workoutDayExercises.id,
            set: {
              exerciseId: wde.exerciseId,
              sortOrder: wde.sortOrder,
              targetSets: wde.targetSets,
              targetReps: wde.targetReps,
              targetRpe: wde.targetRpe || null
            }
          });
        }
      }

      // 6. Sync workoutSessions
      if (body.workoutSessions && body.workoutSessions.length > 0) {
        for (const ws of body.workoutSessions) {
          await tx.insert(workoutSessions).values({
            id: ws.id,
            userId,
            workoutDayId: ws.workoutDayId || null,
            startedAt: new Date(ws.startedAt),
            completedAt: ws.completedAt ? new Date(ws.completedAt) : null,
            volumeScore: ws.volumeScore
          }).onConflictDoUpdate({
            target: workoutSessions.id,
            set: {
              workoutDayId: ws.workoutDayId || null,
              completedAt: ws.completedAt ? new Date(ws.completedAt) : null,
              volumeScore: ws.volumeScore
            }
          });
        }
      }

      // 7. Sync exerciseLogs
      if (body.exerciseLogs && body.exerciseLogs.length > 0) {
        for (const el of body.exerciseLogs) {
          await tx.insert(exerciseLogs).values({
            id: el.id,
            workoutSessionId: el.workoutSessionId,
            exerciseId: el.exerciseId,
            setNumber: el.setNumber,
            weight: el.weight,
            reps: el.reps,
            rpe: el.rpe || null,
            isPr: el.isPr || false
          }).onConflictDoUpdate({
            target: exerciseLogs.id,
            set: {
              weight: el.weight,
              reps: el.reps,
              rpe: el.rpe || null,
              isPr: el.isPr || false
            }
          });
        }
      }

      // 8. Sync journals
      if (body.journals && body.journals.length > 0) {
        for (const j of body.journals) {
          await tx.insert(journals).values({
            id: j.id,
            userId,
            date: j.date,
            content: j.content,
            mood: j.mood || null
          }).onConflictDoUpdate({
            target: journals.id,
            set: {
              content: j.content,
              mood: j.mood || null,
              updatedAt: new Date()
            }
          });
        }
      }
    });

    res.json({
      success: true,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/push-token
 * Stores the device push token
 */
router.post("/users/:userId/push-token", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const body = UpdatePushTokenBody.parse(req.body);

    await db.update(users).set({
      expoPushToken: body.token
    }).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/test-push
 * Triggers a test push notification
 */
router.post("/users/:userId/test-push", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));

    if (!userRecord || !userRecord.expoPushToken) {
      res.status(400).json({ error: "User or push token not found" });
      return;
    }

    if (!Expo.isExpoPushToken(userRecord.expoPushToken)) {
      res.status(400).json({ error: "Invalid Expo push token" });
      return;
    }

    const messages = [{
      to: userRecord.expoPushToken,
      sound: 'default' as const,
      title: 'FitBuddy: Time to lift! 🏋️‍♂️',
      body: 'Consistency builds iron focus. Let\'s crush today\'s gym session and level up your Fit Score!',
      data: { withSome: 'data' },
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error("Error sending push:", error);
      }
    }

    res.json({ success: true, message: "Push sent successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:userId/profile
 * Update profile fields
 */
router.patch("/users/:userId/profile", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, bio, wakeTime, bedTime, isProfilePublic, socialLinks } = req.body;

    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (wakeTime !== undefined) updateFields.wakeTime = wakeTime;
    if (bedTime !== undefined) updateFields.bedTime = bedTime;
    if (isProfilePublic !== undefined) updateFields.isProfilePublic = isProfilePublic;
    if (socialLinks !== undefined) updateFields.socialLinks = socialLinks;

    const [updated] = await db.update(users)
      .set(updateFields)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      name: updated.name,
      bio: updated.bio || null,
      avatarUrl: updated.avatarUrl || null,
      wakeTime: updated.wakeTime,
      bedTime: updated.bedTime,
      isProfilePublic: updated.isProfilePublic ?? true,
      socialLinks: updated.socialLinks || {},
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/:userId/avatar
 * Upload a profile photo to Supabase Storage
 */
router.post("/users/:userId/avatar", async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!supabase) {
      res.status(503).json({ error: "Storage not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY." });
      return;
    }

    const { imageBase64, contentType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const fileExt = (contentType || "image/jpeg").split("/")[1] || "jpg";
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const fileBuffer = Buffer.from(imageBase64, "base64");

    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        contentType: contentType || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      res.status(500).json({ error: "Failed to upload avatar", detail: uploadError.message });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    await db.update(users)
      .set({ avatarUrl: publicUrl, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ avatarUrl: publicUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:userId/public-profile
 * Returns a public profile view with stats
 */
router.get("/users/:userId/public-profile", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [userPrograms, daysResult, journalResult, avgScoreResult, friendCountResult] = await Promise.all([
      db.select().from(programs).where(eq(programs.userId, userId)),

      // Count distinct workout days
      db.execute(
        sql`SELECT COUNT(DISTINCT started_at::date) as days FROM workout_sessions WHERE user_id = ${userId}`
      ),

      // Count journals
      db.execute(
        sql`SELECT COUNT(*) as count FROM journals WHERE user_id = ${userId}`
      ),

      // 7-day rolling average volume score
      db.execute(
        sql`SELECT ROUND(CAST(AVG(volume_score) AS numeric), 1) as avg_score 
        FROM workout_sessions 
        WHERE user_id = ${userId} 
          AND started_at >= NOW() - INTERVAL '7 days'`
      ),

      // Friend count
      db.execute(
        sql`SELECT COUNT(*) as friend_count FROM friendships
        WHERE status = 'accepted'
          AND (requester_id = ${userId} OR addressee_id = ${userId})`
      ),
    ]);

    const daysTracked = Number(daysResult.rows[0]?.days) || 0;
    const journalCount = Number(journalResult.rows[0]?.count) || 0;
    const averageScore = Number(avgScoreResult.rows[0]?.avg_score) || 0;
    const friendCount = Number(friendCountResult.rows[0]?.friend_count) || 0;

    const totalXP = userRecord.totalXP || 0;
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;

    res.json({
      id: userRecord.id,
      name: userRecord.name,
      avatarUrl: userRecord.avatarUrl || null,
      bio: userRecord.bio || null,
      socialLinks: userRecord.socialLinks || {},
      isProfilePublic: userRecord.isProfilePublic ?? true,
      totalXP,
      level,
      highestStreak: userRecord.highestStreak || 0,
      averageScore,
      startDate: userRecord.startDate,
      daysTracked,
      journalCount,
      friendCount,
      completedChallenges: 0,
      activeProgramIds: userRecord.activeProgramIds || [],
      programProgress: [],
      publishedPrograms: userPrograms.map(p => ({
        id: p.id,
        title: p.title,
        emoji: p.emoji,
        description: p.description,
        totalWeeks: 1,
        color: p.color,
        isPublished: true,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/search?q=&limit=20
 * Search users by name or email
 */
router.get("/users/search", async (req, res, next) => {
  try {
    const q = (req.query.q as string || "").trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const excludeUserId = req.query.excludeUserId as string;

    if (!q || q.length < 2) {
      res.json({ users: [] });
      return;
    }

    const searchPattern = `%${q}%`;

    let conditions = or(
      ilike(users.name, searchPattern),
      ilike(users.email, searchPattern)
    );

    if (excludeUserId) {
      conditions = sql`(${conditions}) AND ${users.id} != ${excludeUserId}`;
    }

    const results = await db.select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      totalXP: users.totalXP,
      highestStreak: users.highestStreak,
      activeProgramIds: users.activeProgramIds,
    }).from(users)
      .where(conditions as any)
      .limit(limit);

    res.json({ users: results });
  } catch (error) {
    next(error);
  }
});

export default router;
