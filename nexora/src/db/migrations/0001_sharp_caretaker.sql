CREATE TABLE "canvas_edges" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"canvas_id" uuid NOT NULL,
	"source_node_id" varchar(100) NOT NULL,
	"target_node_id" varchar(100) NOT NULL,
	"edge_type" varchar(30) DEFAULT 'implication' NOT NULL,
	"label" varchar(100),
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_nodes" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"canvas_id" uuid NOT NULL,
	"node_type" varchar(30) NOT NULL,
	"parent_node_id" varchar(100),
	"position_x" real DEFAULT 0 NOT NULL,
	"position_y" real DEFAULT 0 NOT NULL,
	"width" real,
	"height" real,
	"title" varchar(255) NOT NULL,
	"content" text,
	"latex_formula" text,
	"validation_status" varchar(20) DEFAULT 'tentative' NOT NULL,
	"is_collapsed" boolean DEFAULT false NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"viewport" jsonb DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb NOT NULL,
	"global_vars" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_edges" ADD CONSTRAINT "canvas_edges_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_nodes" ADD CONSTRAINT "canvas_nodes_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_canvas_edges_canvas_id" ON "canvas_edges" USING btree ("canvas_id");--> statement-breakpoint
CREATE INDEX "idx_canvas_edges_source" ON "canvas_edges" USING btree ("canvas_id","source_node_id");--> statement-breakpoint
CREATE INDEX "idx_canvas_edges_target" ON "canvas_edges" USING btree ("canvas_id","target_node_id");--> statement-breakpoint
CREATE INDEX "idx_canvas_nodes_canvas_id" ON "canvas_nodes" USING btree ("canvas_id");--> statement-breakpoint
CREATE INDEX "idx_canvas_nodes_parent" ON "canvas_nodes" USING btree ("canvas_id","parent_node_id");--> statement-breakpoint
CREATE INDEX "idx_canvas_nodes_type" ON "canvas_nodes" USING btree ("canvas_id","node_type");--> statement-breakpoint
CREATE INDEX "idx_canvases_user_id" ON "canvases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_canvases_task_id" ON "canvases" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_canvases_category" ON "canvases" USING btree ("user_id","category");