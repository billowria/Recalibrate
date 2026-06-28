import { pgTable, text, timestamp, integer, boolean, real, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Metrics
export const metrics = pgTable("metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'build', 'reduce', 'neutral'
  inputType: text("input_type").notNull(), // 'boolean', 'scale', 'counter'
  scoreWeight: integer("score_weight").notNull().default(1),
  isCustom: boolean("is_custom").default(false),
  implementationIntention: text("implementation_intention"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily Logs
export const dailyLogs = pgTable("daily_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  metricId: uuid("metric_id").references(() => metrics.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  value: real("value").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Journal Entries
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  mood: integer("mood"),
  energy: integer("energy"),
  freeResponse: text("free_response"),
  isWeeklyReflection: boolean("is_weekly_reflection").default(false).notNull(),
  programContext: jsonb("program_context").$type<{ missedTaskIds?: string[]; hitTaskIds?: string[]; programId?: string }>(),
  tags: jsonb("tags").$type<string[]>().default([]),
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relapse Logs
export const relapseLogs = pgTable("relapse_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  metricId: uuid("metric_id").references(() => metrics.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  triggerCategory: text("trigger_category").notNull(),
  triggerReflection: text("trigger_reflection").notNull(),
  nextAction: text("next_action").notNull(),
  compassionStatement: text("compassion_statement"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Program Progress
export const programProgress = pgTable("program_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  programId: text("program_id").notNull(),
  currentWeek: integer("current_week").notNull().default(1),
  weekStartDate: text("week_start_date").notNull(),
  completedWeeks: jsonb("completed_weeks").$type<number[]>().default([]),
  resetCount: integer("reset_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Week Task Progress
export const weekTaskProgress = pgTable("week_task_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  programId: text("program_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  taskId: text("task_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Focus Logs
export const focusLogs = pgTable("focus_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  minutes: integer("minutes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Programs
export const programs = pgTable("programs", {
  id: text("id").primaryKey(), // We use text because of slugs like "eight-week-recovery"
  title: text("title").notNull(),
  emoji: text("emoji").notNull(),
  description: text("description").notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  isSystem: boolean("is_system").default(true).notNull(),
  color: text("color").notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").default(false).notNull(),
  forkedFromId: text("forked_from_id"),
});

// Program Weeks
export const programWeeks = pgTable("program_weeks", {
  id: text("id").primaryKey(),
  programId: text("program_id").references(() => programs.id, { onDelete: "cascade" }).notNull(),
  weekNumber: integer("week_number").notNull(),
  theme: text("theme").notNull(),
  goal: text("goal").notNull(),
  psychologyRationale: text("psychology_rationale").notNull(),
  dailyJournalPrompt: text("daily_journal_prompt"),
  weeklyReflectionPrompt: text("weekly_reflection_prompt"),
});

// Program Tasks
export const programTasks = pgTable("program_tasks", {
  id: text("id").primaryKey(),
  weekId: text("week_id").references(() => programWeeks.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  isHabit: boolean("is_habit").default(false).notNull(),
  metricCategory: text("metric_category"), // 'build' or 'reduce'
  metricInputType: text("metric_input_type"), // 'boolean', 'counter', 'scale'
  metricUnitLabel: text("metric_unit_label"),
  metricScoreWeight: integer("metric_score_weight"),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertMetricSchema = createInsertSchema(metrics);
export const selectMetricSchema = createSelectSchema(metrics);

export const insertDailyLogSchema = createInsertSchema(dailyLogs);
export const selectDailyLogSchema = createSelectSchema(dailyLogs);

export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const selectJournalEntrySchema = createSelectSchema(journalEntries);

export const insertRelapseLogSchema = createInsertSchema(relapseLogs);
export const selectRelapseLogSchema = createSelectSchema(relapseLogs);

export const insertProgramProgressSchema = createInsertSchema(programProgress);
export const selectProgramProgressSchema = createSelectSchema(programProgress);

export const insertWeekTaskProgressSchema = createInsertSchema(weekTaskProgress);
export const selectWeekTaskProgressSchema = createSelectSchema(weekTaskProgress);

export const insertFocusLogSchema = createInsertSchema(focusLogs);
export const selectFocusLogSchema = createSelectSchema(focusLogs);

export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const insertProgramWeekSchema = createInsertSchema(programWeeks);
export const selectProgramWeekSchema = createSelectSchema(programWeeks);

export const insertProgramTaskSchema = createInsertSchema(programTasks);
export const selectProgramTaskSchema = createSelectSchema(programTasks);