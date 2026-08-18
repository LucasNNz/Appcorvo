CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_id` text NOT NULL,
  `title` text NOT NULL,
  `topic` text DEFAULT '' NOT NULL,
  `format` text DEFAULT 'REELS' NOT NULL,
  `quantity` text DEFAULT '1 VÍDEO' NOT NULL,
  `mode` text DEFAULT 'RÁPIDO' NOT NULL,
  `status` text DEFAULT 'DRAFT' NOT NULL,
  `current_step` text DEFAULT 'IDEIA' NOT NULL,
  `ready_for_ai` integer DEFAULT false NOT NULL,
  `idea_text` text DEFAULT '' NOT NULL,
  `script_text` text DEFAULT '' NOT NULL,
  `prompts_text` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_updated_idx` ON `projects` (`owner_id`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `scenes` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_id` text NOT NULL,
  `project_id` text NOT NULL,
  `position` integer NOT NULL,
  `title` text DEFAULT '' NOT NULL,
  `narration` text DEFAULT '' NOT NULL,
  `prompt` text DEFAULT '' NOT NULL,
  `variant` text DEFAULT 'SINGLE' NOT NULL,
  `status` text DEFAULT 'PENDING' NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `image_file` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scenes_project_position_idx` ON `scenes` (`owner_id`,`project_id`,`position`);
--> statement-breakpoint
CREATE TABLE `jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_id` text NOT NULL,
  `project_id` text NOT NULL,
  `scene_id` text,
  `type` text DEFAULT 'GENERATE_IMAGE' NOT NULL,
  `status` text DEFAULT 'PENDING' NOT NULL,
  `prompt` text DEFAULT '' NOT NULL,
  `output_url` text DEFAULT '' NOT NULL,
  `output_file` text DEFAULT '' NOT NULL,
  `error` text DEFAULT '' NOT NULL,
  `attempt` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `jobs_project_updated_idx` ON `jobs` (`owner_id`,`project_id`,`updated_at`);
