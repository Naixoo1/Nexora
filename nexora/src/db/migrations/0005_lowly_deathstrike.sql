CREATE TABLE "user_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"academic_strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"academic_weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"learning_style" text DEFAULT 'Visual analogies, step-by-step Socratic guidance' NOT NULL,
	"academic_goal" text DEFAULT 'Persiapan Ujian & Penguasaan Konsep Mandiri' NOT NULL,
	"extracted_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_memory_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_memory" ADD CONSTRAINT "user_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_memory_user_id" ON "user_memory" USING btree ("user_id");