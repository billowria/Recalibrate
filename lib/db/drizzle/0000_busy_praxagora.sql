CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"date" text NOT NULL,
	"value" real NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"mood" integer NOT NULL,
	"energy" integer NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"word_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"input_type" text NOT NULL,
	"score_weight" integer DEFAULT 1 NOT NULL,
	"is_custom" boolean DEFAULT false,
	"implementation_intention" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" text NOT NULL,
	"current_week" integer DEFAULT 1 NOT NULL,
	"week_start_date" text NOT NULL,
	"completed_weeks" jsonb DEFAULT '[]'::jsonb,
	"reset_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"is_habit" boolean DEFAULT false NOT NULL,
	"metric_category" text,
	"metric_input_type" text,
	"metric_unit_label" text,
	"metric_score_weight" integer
);
--> statement-breakpoint
CREATE TABLE "program_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"theme" text NOT NULL,
	"goal" text NOT NULL,
	"psychology_rationale" text NOT NULL,
	"daily_journal_prompt" text,
	"weekly_reflection_prompt" text
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"emoji" text NOT NULL,
	"description" text NOT NULL,
	"total_weeks" integer NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"color" text NOT NULL,
	"author_id" uuid,
	"is_published" boolean DEFAULT false NOT NULL,
	"forked_from_id" text
);
--> statement-breakpoint
CREATE TABLE "relapse_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"date" text NOT NULL,
	"trigger_category" text NOT NULL,
	"trigger_reflection" text NOT NULL,
	"next_action" text NOT NULL,
	"compassion_statement" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"password" text,
	"wake_time" text DEFAULT '06:00',
	"bed_time" text DEFAULT '22:30',
	"start_date" text NOT NULL,
	"total_xp" integer DEFAULT 0,
	"highest_streak" integer DEFAULT 0,
	"onboarding_complete" boolean DEFAULT false,
	"active_program_ids" jsonb DEFAULT '[]'::jsonb,
	"expo_push_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "week_task_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"task_id" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_logs" ADD CONSTRAINT "focus_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_progress" ADD CONSTRAINT "program_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_tasks" ADD CONSTRAINT "program_tasks_week_id_program_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."program_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relapse_logs" ADD CONSTRAINT "relapse_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relapse_logs" ADD CONSTRAINT "relapse_logs_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_task_progress" ADD CONSTRAINT "week_task_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;