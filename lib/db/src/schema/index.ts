import { pgTable, text, timestamp, integer, boolean, real, jsonb, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").unique(),
  password: text("password"),
  wakeTime: text("wake_time").default("06:00"),
  bedTime: text("bed_time").default("22:30"),
  startDate: text("start_date").notNull(),
  totalXP: integer("total_xp").default(0),
  highestStreak: integer("highest_streak").default(0),
  onboardingComplete: boolean("onboarding_complete").default(false),
  activeProgramIds: jsonb("active_program_ids").$type<string[]>().default([]),
  savedProgramIds: jsonb("saved_program_ids").$type<string[]>().default([]),
  expoPushToken: text("expo_push_token"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  isProfilePublic: boolean("is_profile_public").default(true),
  socialLinks: jsonb("social_links").$type<{
    instagram?: string;
    snapchat?: string;
    telegram?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercises
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  equipment: text("equipment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Programs
export const programs = pgTable("programs", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isTemplate: boolean("is_template").default(false).notNull(),
  color: text("color").default("#7C3AED").notNull(),
  emoji: text("emoji").default("💪").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workout Days
export const workoutDays = pgTable("workout_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: text("program_id").references(() => programs.id, { onDelete: "cascade" }).notNull(),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  targetMuscleGroups: jsonb("target_muscle_groups").$type<string[]>().default([]).notNull(),
});

// Workout Day Exercises
export const workoutDayExercises = pgTable("workout_day_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutDayId: uuid("workout_day_id").references(() => workoutDays.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  targetSets: integer("target_sets").default(3).notNull(),
  targetReps: integer("target_reps").default(10).notNull(),
  targetRpe: integer("target_rpe").default(8),
});

// Workout Sessions
export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workoutDayId: uuid("workout_day_id").references(() => workoutDays.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  volumeScore: integer("volume_score").default(0).notNull(),
});

// Exercise Logs
export const exerciseLogs = pgTable("exercise_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutSessionId: uuid("workout_session_id").references(() => workoutSessions.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  rpe: integer("rpe"),
  isPr: boolean("is_pr").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Journals
export const journals = pgTable("journals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  content: text("content").notNull(),
  mood: text("mood"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Friendships
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addresseeId: uuid("addressee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  unique("friendships_requester_addressee_unique").on(table.requesterId, table.addresseeId),
]));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertExerciseSchema = createInsertSchema(exercises);
export const selectExerciseSchema = createSelectSchema(exercises);

export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const insertWorkoutDaySchema = createInsertSchema(workoutDays);
export const selectWorkoutDaySchema = createSelectSchema(workoutDays);

export const insertWorkoutDayExerciseSchema = createInsertSchema(workoutDayExercises);
export const selectWorkoutDayExerciseSchema = createSelectSchema(workoutDayExercises);

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions);
export const selectWorkoutSessionSchema = createSelectSchema(workoutSessions);

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs);
export const selectExerciseLogSchema = createSelectSchema(exerciseLogs);

export const insertJournalSchema = createInsertSchema(journals);
export const selectJournalSchema = createSelectSchema(journals);

export const insertFriendshipSchema = createInsertSchema(friendships);
export const selectFriendshipSchema = createSelectSchema(friendships);