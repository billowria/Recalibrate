import { Router } from "express";
import crypto from "crypto";
import { eq, ilike, ne, or, sql, inArray, count } from "drizzle-orm";
import {
  db,
  users,
  metrics,
  dailyLogs,
  journalEntries,
  relapseLogs,
  programProgress,
  weekTaskProgress,
  focusLogs,
  programs,
  friendships
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

// Deterministic UUIDs for default metrics
const DEFAULT_METRIC_SEEDS = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Wake on time", category: "build", inputType: "boolean", scoreWeight: 8 },
  { id: "00000000-0000-4000-8000-000000000002", name: "Made bed", category: "build", inputType: "boolean", scoreWeight: 5 },
  { id: "00000000-0000-4000-8000-000000000003", name: "10 min sunlight", category: "build", inputType: "boolean", scoreWeight: 6 },
  { id: "00000000-0000-4000-8000-000000000004", name: "Water intake", category: "build", inputType: "counter", scoreWeight: 6 },
  { id: "00000000-0000-4000-8000-000000000005", name: "10 min mindfulness", category: "build", inputType: "boolean", scoreWeight: 7 },
  { id: "00000000-0000-4000-8000-000000000006", name: "Slept on time", category: "build", inputType: "boolean", scoreWeight: 8 },
  { id: "00000000-0000-4000-8000-000000000007", name: "Cigarettes", category: "reduce", inputType: "counter", scoreWeight: 10 },
  { id: "00000000-0000-4000-8000-000000000008", name: "Alcohol", category: "reduce", inputType: "counter", scoreWeight: 10 },
  { id: "00000000-0000-4000-8000-000000000009", name: "Porn", category: "reduce", inputType: "boolean", scoreWeight: 12 },
  { id: "00000000-0000-4000-8000-000000000010", name: "Mood", category: "neutral", inputType: "scale", scoreWeight: 4 },
  { id: "00000000-0000-4000-8000-000000000011", name: "Productivity", category: "neutral", inputType: "scale", scoreWeight: 4 }
];

/**
 * POST /api/users/register
 * Registers a new user, seeds their default metrics and initializes recovery program.
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
      // 1. Create the user profile
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
        activeProgramIds: ["dopamine-detox-protocol"],
        savedProgramIds: ["dopamine-detox-protocol"]
      });

      // 2. Seed default metrics
      const metricsToInsert = DEFAULT_METRIC_SEEDS.map((m) => ({
        id: crypto.randomUUID(),
        userId,
        name: m.name,
        category: m.category,
        inputType: m.inputType,
        scoreWeight: m.scoreWeight,
        isCustom: false
      }));
      await tx.insert(metrics).values(metricsToInsert);

      // 3. Initialize default program progress
      await tx.insert(programProgress).values({
        userId,
        programId: "dopamine-detox-protocol",
        currentWeek: 1,
        weekStartDate: today,
        completedWeeks: [],
        resetCount: 0
      });
    });

    // Fetch and return the newly created state
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    const userMetrics = await db.select().from(metrics).where(eq(metrics.userId, userId));

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
        activeProgramIds: userRecord.activeProgramIds || []
      },
      metrics: userMetrics.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        inputType: m.inputType,
        scoreWeight: m.scoreWeight,
        isCustom: m.isCustom || false,
        implementationIntention: m.implementationIntention || null
      }))
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

    const [
      dbMetrics,
      dbDailyLogs,
      dbJournalEntries,
      dbRelapseLogs,
      dbProgramProgress,
      dbWeekTaskProgress,
      dbFocusLogs
    ] = await Promise.all([
      db.select().from(metrics).where(eq(metrics.userId, userId)),
      db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId)),
      db.select().from(journalEntries).where(eq(journalEntries.userId, userId)),
      db.select().from(relapseLogs).where(eq(relapseLogs.userId, userId)),
      db.select().from(programProgress).where(eq(programProgress.userId, userId)),
      db.select().from(weekTaskProgress).where(eq(weekTaskProgress.userId, userId)),
      db.select().from(focusLogs).where(eq(focusLogs.userId, userId))
    ]);

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
      metrics: dbMetrics.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        inputType: m.inputType,
        scoreWeight: m.scoreWeight,
        isCustom: m.isCustom || false,
        implementationIntention: m.implementationIntention || null
      })),
      dailyLogs: dbDailyLogs.map((l) => ({
        id: l.id,
        metricId: l.metricId,
        date: l.date,
        value: l.value,
        note: l.note || null
      })),
      journalEntries: dbJournalEntries.map((j) => ({
        id: j.id,
        date: j.date,
        prompt: j.prompt,
        response: j.response,
        mood: j.mood ?? null,
        energy: j.energy ?? null,
        freeResponse: j.freeResponse ?? null,
        isWeeklyReflection: j.isWeeklyReflection ?? false,
        programContext: (j.programContext as any) ?? null,
        tags: j.tags || [],
        wordCount: j.wordCount || 0
      })),
      relapseLogs: dbRelapseLogs.map((r) => ({
        id: r.id,
        date: r.date,
        metricId: r.metricId,
        triggerCategory: r.triggerCategory,
        triggerReflection: r.triggerReflection,
        nextAction: r.nextAction,
        compassionStatement: r.compassionStatement || null
      })),
      programProgress: dbProgramProgress.map((p) => ({
        programId: p.programId,
        currentWeek: p.currentWeek,
        weekStartDate: p.weekStartDate,
        completedWeeks: p.completedWeeks || [],
        resetCount: p.resetCount || 0
      })),
      weekTaskProgress: dbWeekTaskProgress.map((wt) => ({
        programId: wt.programId,
        weekNumber: wt.weekNumber,
        taskId: wt.taskId,
        completed: wt.completed
      })),
      focusLogs: dbFocusLogs.map((fl) => ({
        id: fl.id,
        date: fl.date,
        minutes: fl.minutes
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

      // 2. Sync metrics
      if (body.metrics && body.metrics.length > 0) {
        for (const m of body.metrics) {
          await tx.insert(metrics).values({
            id: m.id,
            userId,
            name: m.name,
            category: m.category,
            inputType: m.inputType,
            scoreWeight: m.scoreWeight,
            isCustom: m.isCustom || false,
            implementationIntention: m.implementationIntention || null
          }).onConflictDoUpdate({
            target: metrics.id,
            set: {
              name: m.name,
              category: m.category,
              inputType: m.inputType,
              scoreWeight: m.scoreWeight,
              isCustom: m.isCustom || false,
              implementationIntention: m.implementationIntention || null
            }
          });
        }
      }

      // 3. Sync daily logs
      if (body.dailyLogs && body.dailyLogs.length > 0) {
        for (const log of body.dailyLogs) {
          await tx.insert(dailyLogs).values({
            id: log.id,
            userId,
            metricId: log.metricId,
            date: log.date,
            value: log.value,
            note: log.note || null
          }).onConflictDoUpdate({
            target: dailyLogs.id,
            set: {
              value: log.value,
              note: log.note || null
            }
          });
        }
      }

      // 4. Sync journal entries
      if (body.journalEntries && body.journalEntries.length > 0) {
        for (const j of body.journalEntries) {
          await tx.insert(journalEntries).values({
            id: j.id,
            userId,
            date: j.date,
            prompt: j.prompt,
            response: j.response,
            mood: j.mood ?? null,
            energy: j.energy ?? null,
            freeResponse: j.freeResponse ?? null,
            isWeeklyReflection: j.isWeeklyReflection ?? false,
            programContext: j.programContext ?? null,
            tags: j.tags || [],
            wordCount: j.wordCount || 0
          }).onConflictDoUpdate({
            target: journalEntries.id,
            set: {
              prompt: j.prompt,
              response: j.response,
              mood: j.mood ?? null,
              energy: j.energy ?? null,
              freeResponse: j.freeResponse ?? null,
              isWeeklyReflection: j.isWeeklyReflection ?? false,
              programContext: j.programContext ?? null,
              tags: j.tags || [],
              wordCount: j.wordCount || 0
            }
          });
        }
      }

      // 5. Sync relapse logs
      if (body.relapseLogs && body.relapseLogs.length > 0) {
        for (const r of body.relapseLogs) {
          await tx.insert(relapseLogs).values({
            id: r.id,
            userId,
            date: r.date,
            metricId: r.metricId,
            triggerCategory: r.triggerCategory,
            triggerReflection: r.triggerReflection,
            nextAction: r.nextAction,
            compassionStatement: r.compassionStatement || null
          }).onConflictDoUpdate({
            target: relapseLogs.id,
            set: {
              triggerCategory: r.triggerCategory,
              triggerReflection: r.triggerReflection,
              nextAction: r.nextAction,
              compassionStatement: r.compassionStatement || null
            }
          });
        }
      }

      // 6. Sync program progress (replace with current array since total count is tiny)
      if (body.programProgress) {
        await tx.delete(programProgress).where(eq(programProgress.userId, userId));
        if (body.programProgress.length > 0) {
          const toInsert = body.programProgress.map((p) => ({
            userId,
            programId: p.programId,
            currentWeek: p.currentWeek,
            weekStartDate: p.weekStartDate,
            completedWeeks: p.completedWeeks,
            resetCount: p.resetCount
          }));
          await tx.insert(programProgress).values(toInsert);
        }
      }

      // 7. Sync week task progress (replace with current array since total count is tiny)
      if (body.weekTaskProgress) {
        await tx.delete(weekTaskProgress).where(eq(weekTaskProgress.userId, userId));
        if (body.weekTaskProgress.length > 0) {
          const toInsert = body.weekTaskProgress.map((wt) => ({
            userId,
            programId: wt.programId,
            weekNumber: wt.weekNumber,
            taskId: wt.taskId,
            completed: wt.completed
          }));
          await tx.insert(weekTaskProgress).values(toInsert);
        }
      }

      // 8. Sync focus logs
      if (body.focusLogs && body.focusLogs.length > 0) {
        for (const fl of body.focusLogs) {
          await tx.insert(focusLogs).values({
            id: fl.id,
            userId,
            date: fl.date,
            minutes: fl.minutes
          }).onConflictDoUpdate({
            target: focusLogs.id,
            set: {
              minutes: fl.minutes
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
 * Triggers a test push notification with custom brand copy
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
      title: 'Recalibrate: Stay Disciplined 🐺',
      body: 'Your habits wait for no one. Tap to log your daily wins and keep your streak alive.',
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
 * Update profile fields (name, bio, wakeTime, bedTime, isProfilePublic)
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
 * Expects multipart/form-data or base64 JSON body { imageBase64, contentType }
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

    // Save to DB
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
 * Returns a public profile view with stats, programs, badges
 */
router.get("/users/:userId/public-profile", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Run all queries in parallel for performance
    const [userProgramProgress, publishedPrograms, daysResult, journalResult, avgScoreResult, friendCountResult] = await Promise.all([
      // Program progress
      db.select().from(programProgress).where(eq(programProgress.userId, userId)),

      // Published programs by this user
      db.select().from(programs).where(eq(programs.authorId, userId)),

      // Count distinct days tracked
      db.execute(
        sql`SELECT COUNT(DISTINCT date) as days FROM daily_logs WHERE user_id = ${userId}`
      ),

      // Count journal entries
      db.execute(
        sql`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ${userId}`
      ),

      // 7-day rolling average score: avg of daily log values per day scaled to 0-100
      // Each day's score = sum(value * score_weight) / sum(score_weight) * 100
      // We simplify to avg of all logged values in last 7 days as a proxy
      db.execute(
        sql`SELECT
          ROUND(
            CAST(AVG(dl.value / GREATEST(m.score_weight, 1) * 100) AS numeric)
          , 1) as avg_score
        FROM daily_logs dl
        JOIN metrics m ON m.id = dl.metric_id
        WHERE dl.user_id = ${userId}
          AND dl.date >= TO_CHAR(NOW() - INTERVAL '7 days', 'YYYY-MM-DD')
          AND m.category != 'reduce'`
      ),

      // Friend count (accepted friendships)
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

    // Compute level from XP (matches client formula: level = floor(sqrt(totalXP / 100)) + 1)
    const totalXP = userRecord.totalXP || 0;
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;

    // Count completed programs (all weeks done)
    const completedChallenges = userProgramProgress.filter(p => {
      const prog = publishedPrograms.find(pr => pr.id === p.programId);
      const totalWeeks = prog?.totalWeeks || 0;
      return totalWeeks > 0 && (p.completedWeeks || []).length >= totalWeeks;
    }).length;

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
      completedChallenges,
      activeProgramIds: userRecord.activeProgramIds || [],
      programProgress: userProgramProgress.map(p => ({
        programId: p.programId,
        currentWeek: p.currentWeek,
        completedWeeks: p.completedWeeks || [],
        resetCount: p.resetCount || 0,
      })),
      publishedPrograms: publishedPrograms.map(p => ({
        id: p.id,
        title: p.title,
        emoji: p.emoji,
        description: p.description,
        totalWeeks: p.totalWeeks,
        color: p.color,
        isPublished: p.isPublished,
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

    // Exclude the searching user from results
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
