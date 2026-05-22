import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "paradigm"."enum_team_members_socials_platform" AS ENUM('twitter', 'linkedin', 'github', 'website', 'email');
  CREATE TYPE "paradigm"."enum_team_members_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_team_members_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__team_members_v_version_socials_platform" AS ENUM('twitter', 'linkedin', 'github', 'website', 'email');
  CREATE TYPE "paradigm"."enum__team_members_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__team_members_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__team_members_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_testimonials_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_testimonials_service_tag" AS ENUM('web', 'meo', 'seo', 'ai', 'video', 'japan-entry', 'other');
  CREATE TYPE "paradigm"."enum_testimonials_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__testimonials_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__testimonials_v_version_service_tag" AS ENUM('web', 'meo', 'seo', 'ai', 'video', 'japan-entry', 'other');
  CREATE TYPE "paradigm"."enum__testimonials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__testimonials_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_categories_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_categories_color" AS ENUM('indigo', 'emerald', 'rose', 'amber', 'violet', 'teal');
  CREATE TYPE "paradigm"."enum_settings_announcement_variant" AS ENUM('ink', 'accent', 'tech');
  CREATE TYPE "paradigm"."enum_footer_social_links_platform" AS ENUM('twitter', 'instagram', 'facebook', 'linkedin', 'line', 'youtube', 'github');
  CREATE TABLE "paradigm"."team_members_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "paradigm"."enum_team_members_socials_platform",
  	"url" varchar
  );
  
  CREATE TABLE "paradigm"."team_members_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_team_members_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."team_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_team_members_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."team_members_locales" (
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_team_members_v_version_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "paradigm"."enum__team_members_v_version_socials_platform",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_team_members_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__team_members_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_team_members_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_photo_id" integer,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_is_active" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__team_members_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__team_members_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_team_members_v_locales" (
  	"version_name" varchar,
  	"version_role" varchar,
  	"version_bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."testimonials_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_testimonials_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author_name" varchar,
  	"company" varchar,
  	"photo_id" integer,
  	"rating" numeric DEFAULT 5,
  	"service_tag" "paradigm"."enum_testimonials_service_tag",
  	"consent_given" boolean DEFAULT false,
  	"is_anonymous" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"is_published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_testimonials_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."testimonials_locales" (
  	"quote" varchar,
  	"author_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_testimonials_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__testimonials_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_author_name" varchar,
  	"version_company" varchar,
  	"version_photo_id" integer,
  	"version_rating" numeric DEFAULT 5,
  	"version_service_tag" "paradigm"."enum__testimonials_v_version_service_tag",
  	"version_consent_given" boolean DEFAULT false,
  	"version_is_anonymous" boolean DEFAULT false,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_is_published" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__testimonials_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__testimonials_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_testimonials_v_locales" (
  	"version_quote" varchar,
  	"version_author_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."categories_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_categories_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"color" "paradigm"."enum_categories_color" DEFAULT 'indigo',
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."categories_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."header_nav_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "paradigm"."header_nav_items_children_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "paradigm"."header_nav_items_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_enabled" boolean DEFAULT true,
  	"cta_href" varchar DEFAULT '/contact',
  	"show_locale_switcher" boolean DEFAULT true,
  	"show_theme_toggle" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "paradigm"."header_locales" (
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "paradigm"."footer_columns_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_columns_locales" (
  	"heading" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "paradigm"."enum_footer_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer_legal_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "paradigm"."footer_locales" (
  	"tagline" varchar,
  	"studio_location" varchar,
  	"copyright" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "paradigm"."posts" ADD COLUMN "category_ref_id" integer;
  ALTER TABLE "paradigm"."_posts_v" ADD COLUMN "version_category_ref_id" integer;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD COLUMN "team_members_id" integer;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "seo_default_og_image_id" integer;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "seo_favicon_id" integer;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "seo_twitter_handle" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "tracking_gtm_id" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "tracking_ga4_id" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "tracking_meta_pixel_id" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "tracking_head_scripts" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "tracking_body_scripts" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "announcement_enabled" boolean DEFAULT false;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "announcement_link_href" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "announcement_variant" "paradigm"."enum_settings_announcement_variant" DEFAULT 'ink';
  ALTER TABLE "paradigm"."settings" ADD COLUMN "company_legal_name" varchar DEFAULT 'Paradigm合同会社';
  ALTER TABLE "paradigm"."settings" ADD COLUMN "company_representative_name" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "company_registration_number" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "company_founded_year" varchar;
  ALTER TABLE "paradigm"."settings" ADD COLUMN "company_postal_code" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "seo_default_meta_title" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "seo_default_meta_description" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "seo_keywords" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "announcement_message" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "announcement_link_label" varchar;
  ALTER TABLE "paradigm"."settings_locales" ADD COLUMN "company_address" varchar;
  ALTER TABLE "paradigm"."team_members_socials" ADD CONSTRAINT "team_members_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."team_members_available_locales" ADD CONSTRAINT "team_members_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."team_members" ADD CONSTRAINT "team_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."team_members_locales" ADD CONSTRAINT "team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_team_members_v_version_socials" ADD CONSTRAINT "_team_members_v_version_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_team_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_team_members_v_version_available_locales" ADD CONSTRAINT "_team_members_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_team_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_team_members_v" ADD CONSTRAINT "_team_members_v_parent_id_team_members_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."team_members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_team_members_v" ADD CONSTRAINT "_team_members_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_team_members_v_locales" ADD CONSTRAINT "_team_members_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_team_members_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."testimonials_available_locales" ADD CONSTRAINT "testimonials_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."testimonials" ADD CONSTRAINT "testimonials_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."testimonials_locales" ADD CONSTRAINT "testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_testimonials_v_version_available_locales" ADD CONSTRAINT "_testimonials_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_testimonials_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_testimonials_v_locales" ADD CONSTRAINT "_testimonials_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_testimonials_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."categories_available_locales" ADD CONSTRAINT "categories_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."header_nav_items_children" ADD CONSTRAINT "header_nav_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."header_nav_items_children_locales" ADD CONSTRAINT "header_nav_items_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."header_nav_items_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."header_nav_items" ADD CONSTRAINT "header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."header_nav_items_locales" ADD CONSTRAINT "header_nav_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."header_locales" ADD CONSTRAINT "header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_columns_links_locales" ADD CONSTRAINT "footer_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_columns_locales" ADD CONSTRAINT "footer_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_legal_links_locales" ADD CONSTRAINT "footer_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "team_members_socials_order_idx" ON "paradigm"."team_members_socials" USING btree ("_order");
  CREATE INDEX "team_members_socials_parent_id_idx" ON "paradigm"."team_members_socials" USING btree ("_parent_id");
  CREATE INDEX "team_members_available_locales_order_idx" ON "paradigm"."team_members_available_locales" USING btree ("order");
  CREATE INDEX "team_members_available_locales_parent_idx" ON "paradigm"."team_members_available_locales" USING btree ("parent_id");
  CREATE INDEX "team_members_photo_idx" ON "paradigm"."team_members" USING btree ("photo_id");
  CREATE INDEX "team_members_updated_at_idx" ON "paradigm"."team_members" USING btree ("updated_at");
  CREATE INDEX "team_members_created_at_idx" ON "paradigm"."team_members" USING btree ("created_at");
  CREATE INDEX "team_members__status_idx" ON "paradigm"."team_members" USING btree ("_status");
  CREATE UNIQUE INDEX "team_members_locales_locale_parent_id_unique" ON "paradigm"."team_members_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_team_members_v_version_socials_order_idx" ON "paradigm"."_team_members_v_version_socials" USING btree ("_order");
  CREATE INDEX "_team_members_v_version_socials_parent_id_idx" ON "paradigm"."_team_members_v_version_socials" USING btree ("_parent_id");
  CREATE INDEX "_team_members_v_version_available_locales_order_idx" ON "paradigm"."_team_members_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_team_members_v_version_available_locales_parent_idx" ON "paradigm"."_team_members_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_team_members_v_parent_idx" ON "paradigm"."_team_members_v" USING btree ("parent_id");
  CREATE INDEX "_team_members_v_version_version_photo_idx" ON "paradigm"."_team_members_v" USING btree ("version_photo_id");
  CREATE INDEX "_team_members_v_version_version_updated_at_idx" ON "paradigm"."_team_members_v" USING btree ("version_updated_at");
  CREATE INDEX "_team_members_v_version_version_created_at_idx" ON "paradigm"."_team_members_v" USING btree ("version_created_at");
  CREATE INDEX "_team_members_v_version_version__status_idx" ON "paradigm"."_team_members_v" USING btree ("version__status");
  CREATE INDEX "_team_members_v_created_at_idx" ON "paradigm"."_team_members_v" USING btree ("created_at");
  CREATE INDEX "_team_members_v_updated_at_idx" ON "paradigm"."_team_members_v" USING btree ("updated_at");
  CREATE INDEX "_team_members_v_snapshot_idx" ON "paradigm"."_team_members_v" USING btree ("snapshot");
  CREATE INDEX "_team_members_v_published_locale_idx" ON "paradigm"."_team_members_v" USING btree ("published_locale");
  CREATE INDEX "_team_members_v_latest_idx" ON "paradigm"."_team_members_v" USING btree ("latest");
  CREATE INDEX "_team_members_v_autosave_idx" ON "paradigm"."_team_members_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_team_members_v_locales_locale_parent_id_unique" ON "paradigm"."_team_members_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "testimonials_available_locales_order_idx" ON "paradigm"."testimonials_available_locales" USING btree ("order");
  CREATE INDEX "testimonials_available_locales_parent_idx" ON "paradigm"."testimonials_available_locales" USING btree ("parent_id");
  CREATE INDEX "testimonials_photo_idx" ON "paradigm"."testimonials" USING btree ("photo_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "paradigm"."testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "paradigm"."testimonials" USING btree ("created_at");
  CREATE INDEX "testimonials__status_idx" ON "paradigm"."testimonials" USING btree ("_status");
  CREATE UNIQUE INDEX "testimonials_locales_locale_parent_id_unique" ON "paradigm"."testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_testimonials_v_version_available_locales_order_idx" ON "paradigm"."_testimonials_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_testimonials_v_version_available_locales_parent_idx" ON "paradigm"."_testimonials_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_parent_idx" ON "paradigm"."_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_photo_idx" ON "paradigm"."_testimonials_v" USING btree ("version_photo_id");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "paradigm"."_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "paradigm"."_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version__status_idx" ON "paradigm"."_testimonials_v" USING btree ("version__status");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "paradigm"."_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "paradigm"."_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_v_snapshot_idx" ON "paradigm"."_testimonials_v" USING btree ("snapshot");
  CREATE INDEX "_testimonials_v_published_locale_idx" ON "paradigm"."_testimonials_v" USING btree ("published_locale");
  CREATE INDEX "_testimonials_v_latest_idx" ON "paradigm"."_testimonials_v" USING btree ("latest");
  CREATE INDEX "_testimonials_v_autosave_idx" ON "paradigm"."_testimonials_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_testimonials_v_locales_locale_parent_id_unique" ON "paradigm"."_testimonials_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_available_locales_order_idx" ON "paradigm"."categories_available_locales" USING btree ("order");
  CREATE INDEX "categories_available_locales_parent_idx" ON "paradigm"."categories_available_locales" USING btree ("parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "paradigm"."categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "paradigm"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "paradigm"."categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "paradigm"."categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "header_nav_items_children_order_idx" ON "paradigm"."header_nav_items_children" USING btree ("_order");
  CREATE INDEX "header_nav_items_children_parent_id_idx" ON "paradigm"."header_nav_items_children" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "header_nav_items_children_locales_locale_parent_id_unique" ON "paradigm"."header_nav_items_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "header_nav_items_order_idx" ON "paradigm"."header_nav_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_parent_id_idx" ON "paradigm"."header_nav_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "header_nav_items_locales_locale_parent_id_unique" ON "paradigm"."header_nav_items_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "header_locales_locale_parent_id_unique" ON "paradigm"."header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "paradigm"."footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "paradigm"."footer_columns_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_columns_links_locales_locale_parent_id_unique" ON "paradigm"."footer_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_columns_order_idx" ON "paradigm"."footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "paradigm"."footer_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_columns_locales_locale_parent_id_unique" ON "paradigm"."footer_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_social_links_order_idx" ON "paradigm"."footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "paradigm"."footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "footer_legal_links_order_idx" ON "paradigm"."footer_legal_links" USING btree ("_order");
  CREATE INDEX "footer_legal_links_parent_id_idx" ON "paradigm"."footer_legal_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "footer_legal_links_locales_locale_parent_id_unique" ON "paradigm"."footer_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "paradigm"."footer_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "paradigm"."posts" ADD CONSTRAINT "posts_category_ref_id_categories_id_fk" FOREIGN KEY ("category_ref_id") REFERENCES "paradigm"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v" ADD CONSTRAINT "_posts_v_version_category_ref_id_categories_id_fk" FOREIGN KEY ("version_category_ref_id") REFERENCES "paradigm"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "paradigm"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "paradigm"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "paradigm"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."settings" ADD CONSTRAINT "settings_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("seo_default_og_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."settings" ADD CONSTRAINT "settings_seo_favicon_id_media_id_fk" FOREIGN KEY ("seo_favicon_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_category_ref_idx" ON "paradigm"."posts" USING btree ("category_ref_id");
  CREATE INDEX "_posts_v_version_version_category_ref_idx" ON "paradigm"."_posts_v" USING btree ("version_category_ref_id");
  CREATE INDEX "payload_locked_documents_rels_team_members_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("team_members_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "settings_seo_seo_default_og_image_idx" ON "paradigm"."settings" USING btree ("seo_default_og_image_id");
  CREATE INDEX "settings_seo_seo_favicon_idx" ON "paradigm"."settings" USING btree ("seo_favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "paradigm"."team_members_socials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."team_members_available_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."team_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."team_members_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_team_members_v_version_socials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_team_members_v_version_available_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_team_members_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_team_members_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."testimonials_available_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_testimonials_v_version_available_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_testimonials_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."_testimonials_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."categories_available_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header_nav_items_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header_nav_items_children_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header_nav_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header_nav_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_columns_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_columns_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_columns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_columns_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_legal_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_legal_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "paradigm"."footer_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "paradigm"."team_members_socials" CASCADE;
  DROP TABLE "paradigm"."team_members_available_locales" CASCADE;
  DROP TABLE "paradigm"."team_members" CASCADE;
  DROP TABLE "paradigm"."team_members_locales" CASCADE;
  DROP TABLE "paradigm"."_team_members_v_version_socials" CASCADE;
  DROP TABLE "paradigm"."_team_members_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_team_members_v" CASCADE;
  DROP TABLE "paradigm"."_team_members_v_locales" CASCADE;
  DROP TABLE "paradigm"."testimonials_available_locales" CASCADE;
  DROP TABLE "paradigm"."testimonials" CASCADE;
  DROP TABLE "paradigm"."testimonials_locales" CASCADE;
  DROP TABLE "paradigm"."_testimonials_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_testimonials_v" CASCADE;
  DROP TABLE "paradigm"."_testimonials_v_locales" CASCADE;
  DROP TABLE "paradigm"."categories_available_locales" CASCADE;
  DROP TABLE "paradigm"."categories" CASCADE;
  DROP TABLE "paradigm"."categories_locales" CASCADE;
  DROP TABLE "paradigm"."header_nav_items_children" CASCADE;
  DROP TABLE "paradigm"."header_nav_items_children_locales" CASCADE;
  DROP TABLE "paradigm"."header_nav_items" CASCADE;
  DROP TABLE "paradigm"."header_nav_items_locales" CASCADE;
  DROP TABLE "paradigm"."header" CASCADE;
  DROP TABLE "paradigm"."header_locales" CASCADE;
  DROP TABLE "paradigm"."footer_columns_links" CASCADE;
  DROP TABLE "paradigm"."footer_columns_links_locales" CASCADE;
  DROP TABLE "paradigm"."footer_columns" CASCADE;
  DROP TABLE "paradigm"."footer_columns_locales" CASCADE;
  DROP TABLE "paradigm"."footer_social_links" CASCADE;
  DROP TABLE "paradigm"."footer_legal_links" CASCADE;
  DROP TABLE "paradigm"."footer_legal_links_locales" CASCADE;
  DROP TABLE "paradigm"."footer" CASCADE;
  DROP TABLE "paradigm"."footer_locales" CASCADE;
  ALTER TABLE "paradigm"."posts" DROP CONSTRAINT "posts_category_ref_id_categories_id_fk";
  
  ALTER TABLE "paradigm"."_posts_v" DROP CONSTRAINT "_posts_v_version_category_ref_id_categories_id_fk";
  
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_members_fk";
  
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_testimonials_fk";
  
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "paradigm"."settings" DROP CONSTRAINT "settings_seo_default_og_image_id_media_id_fk";
  
  ALTER TABLE "paradigm"."settings" DROP CONSTRAINT "settings_seo_favicon_id_media_id_fk";
  
  DROP INDEX "paradigm"."posts_category_ref_idx";
  DROP INDEX "paradigm"."_posts_v_version_version_category_ref_idx";
  DROP INDEX "paradigm"."payload_locked_documents_rels_team_members_id_idx";
  DROP INDEX "paradigm"."payload_locked_documents_rels_testimonials_id_idx";
  DROP INDEX "paradigm"."payload_locked_documents_rels_categories_id_idx";
  DROP INDEX "paradigm"."settings_seo_seo_default_og_image_idx";
  DROP INDEX "paradigm"."settings_seo_seo_favicon_idx";
  ALTER TABLE "paradigm"."posts" DROP COLUMN "category_ref_id";
  ALTER TABLE "paradigm"."_posts_v" DROP COLUMN "version_category_ref_id";
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP COLUMN "team_members_id";
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "paradigm"."payload_locked_documents_rels" DROP COLUMN "categories_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "seo_default_og_image_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "seo_favicon_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "seo_twitter_handle";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "tracking_gtm_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "tracking_ga4_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "tracking_meta_pixel_id";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "tracking_head_scripts";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "tracking_body_scripts";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "announcement_enabled";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "announcement_link_href";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "announcement_variant";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "company_legal_name";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "company_representative_name";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "company_registration_number";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "company_founded_year";
  ALTER TABLE "paradigm"."settings" DROP COLUMN "company_postal_code";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "seo_default_meta_title";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "seo_default_meta_description";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "seo_keywords";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "announcement_message";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "announcement_link_label";
  ALTER TABLE "paradigm"."settings_locales" DROP COLUMN "company_address";
  DROP TYPE "paradigm"."enum_team_members_socials_platform";
  DROP TYPE "paradigm"."enum_team_members_available_locales";
  DROP TYPE "paradigm"."enum_team_members_status";
  DROP TYPE "paradigm"."enum__team_members_v_version_socials_platform";
  DROP TYPE "paradigm"."enum__team_members_v_version_available_locales";
  DROP TYPE "paradigm"."enum__team_members_v_version_status";
  DROP TYPE "paradigm"."enum__team_members_v_published_locale";
  DROP TYPE "paradigm"."enum_testimonials_available_locales";
  DROP TYPE "paradigm"."enum_testimonials_service_tag";
  DROP TYPE "paradigm"."enum_testimonials_status";
  DROP TYPE "paradigm"."enum__testimonials_v_version_available_locales";
  DROP TYPE "paradigm"."enum__testimonials_v_version_service_tag";
  DROP TYPE "paradigm"."enum__testimonials_v_version_status";
  DROP TYPE "paradigm"."enum__testimonials_v_published_locale";
  DROP TYPE "paradigm"."enum_categories_available_locales";
  DROP TYPE "paradigm"."enum_categories_color";
  DROP TYPE "paradigm"."enum_settings_announcement_variant";
  DROP TYPE "paradigm"."enum_footer_social_links_platform";`)
}
