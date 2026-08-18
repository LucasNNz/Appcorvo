import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  topic: text("topic").notNull().default(""),
  format: text("format").notNull().default("REELS"),
  quantity: text("quantity").notNull().default("1 VÍDEO"),
  mode: text("mode").notNull().default("RÁPIDO"),
  status: text("status").notNull().default("DRAFT"),
  currentStep: text("current_step").notNull().default("IDEIA"),
  readyForAi: integer("ready_for_ai", { mode: "boolean" }).notNull().default(false),
  ideaText: text("idea_text").notNull().default(""),
  scriptText: text("script_text").notNull().default(""),
  promptsText: text("prompts_text").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  projectId: text("project_id").notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull().default(""),
  narration: text("narration").notNull().default(""),
  prompt: text("prompt").notNull().default(""),
  variant: text("variant").notNull().default("SINGLE"),
  status: text("status").notNull().default("PENDING"),
  imageUrl: text("image_url").notNull().default(""),
  imageFile: text("image_file").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  projectId: text("project_id").notNull(),
  sceneId: text("scene_id"),
  type: text("type").notNull().default("GENERATE_IMAGE"),
  status: text("status").notNull().default("PENDING"),
  prompt: text("prompt").notNull().default(""),
  outputUrl: text("output_url").notNull().default(""),
  outputFile: text("output_file").notNull().default(""),
  error: text("error").notNull().default(""),
  attempt: integer("attempt").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
