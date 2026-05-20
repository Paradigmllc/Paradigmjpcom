import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "paradigm"."_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_users_role" AS ENUM('admin', 'editor', 'viewer');
  CREATE TYPE "paradigm"."enum_posts_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__posts_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__posts_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_services_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_services_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__services_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__services_v_version_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__services_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_faqs_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_faqs_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum_faqs_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__faqs_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__faqs_v_version_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum__faqs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__faqs_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_works_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_works_color" AS ENUM('indigo', 'emerald', 'rose', 'amber', 'violet', 'teal');
  CREATE TYPE "paradigm"."enum_works_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum_works_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__works_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__works_v_version_color" AS ENUM('indigo', 'emerald', 'rose', 'amber', 'violet', 'teal');
  CREATE TYPE "paradigm"."enum__works_v_version_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum__works_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__works_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_pricing_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_pricing_currency" AS ENUM('jpy', 'usd');
  CREATE TYPE "paradigm"."enum_pricing_billing_cycle" AS ENUM('monthly', 'yearly', 'one-time');
  CREATE TYPE "paradigm"."enum_pricing_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum_pricing_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__pricing_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__pricing_v_version_currency" AS ENUM('jpy', 'usd');
  CREATE TYPE "paradigm"."enum__pricing_v_version_billing_cycle" AS ENUM('monthly', 'yearly', 'one-time');
  CREATE TYPE "paradigm"."enum__pricing_v_version_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum__pricing_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__pricing_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_leads_service_interest" AS ENUM('web', 'meo', 'seo', 'ai', 'japan-entry', 'other');
  CREATE TYPE "paradigm"."enum_leads_pipeline_stage" AS ENUM('new', 'in_discussion', 'proposal_sent', 'closed_won', 'closed_lost');
  CREATE TYPE "paradigm"."enum_leads_locale" AS ENUM('ja', 'en');
  CREATE TYPE "paradigm"."enum_audit_logs_action" AS ENUM('create', 'update', 'delete');
  CREATE TYPE "paradigm"."enum_pages_blocks_hero_variant" AS ENUM('centered', 'split-image', 'video-bg');
  CREATE TYPE "paradigm"."enum_pages_blocks_section_alignment" AS ENUM('center', 'left');
  CREATE TYPE "paradigm"."enum_pages_blocks_section_background" AS ENUM('default', 'surface', 'accent-soft');
  CREATE TYPE "paradigm"."enum_pages_blocks_card_grid_variant" AS ENUM('bento', 'equal', 'list');
  CREATE TYPE "paradigm"."enum_pages_blocks_card_grid_columns" AS ENUM('2', '3', '4');
  CREATE TYPE "paradigm"."enum_pages_blocks_cta_background" AS ENUM('gradient', 'surface', 'accent');
  CREATE TYPE "paradigm"."enum_pages_blocks_rich_text_max_width" AS ENUM('prose', 'wide', 'full');
  CREATE TYPE "paradigm"."enum_pages_blocks_stats_background" AS ENUM('default', 'surface', 'dark');
  CREATE TYPE "paradigm"."enum_pages_blocks_marquee_direction" AS ENUM('left', 'right');
  CREATE TYPE "paradigm"."enum_pages_blocks_marquee_speed" AS ENUM('slow', 'normal', 'fast');
  CREATE TYPE "paradigm"."enum_pages_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_pages_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_hero_variant" AS ENUM('centered', 'split-image', 'video-bg');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_section_alignment" AS ENUM('center', 'left');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_section_background" AS ENUM('default', 'surface', 'accent-soft');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_card_grid_variant" AS ENUM('bento', 'equal', 'list');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_card_grid_columns" AS ENUM('2', '3', '4');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_cta_background" AS ENUM('gradient', 'surface', 'accent');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_rich_text_max_width" AS ENUM('prose', 'wide', 'full');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_stats_background" AS ENUM('default', 'surface', 'dark');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_marquee_direction" AS ENUM('left', 'right');
  CREATE TYPE "paradigm"."enum__pages_v_blocks_marquee_speed" AS ENUM('slow', 'normal', 'fast');
  CREATE TYPE "paradigm"."enum__pages_v_version_available_locales" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum__pages_v_version_locale" AS ENUM('ja', 'en', 'both');
  CREATE TYPE "paradigm"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "paradigm"."enum__pages_v_published_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_settings_umami_by_locale_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TYPE "paradigm"."enum_settings_calendar_by_locale_locale" AS ENUM('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id');
  CREATE TABLE "paradigm"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "paradigm"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "paradigm"."enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "paradigm"."posts_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "paradigm"."posts_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_posts_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"cover_image_id" integer,
  	"status" "paradigm"."enum_posts_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"content" jsonb,
  	"category" varchar,
  	"read_time" varchar DEFAULT '5分',
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_posts_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_posts_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__posts_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_cover_image_id" integer,
  	"version_status" "paradigm"."enum__posts_v_version_status" DEFAULT 'draft',
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__posts_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_content" jsonb,
  	"version_category" varchar,
  	"version_read_time" varchar DEFAULT '5分',
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."services_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."services_features_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."services_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_services_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"icon" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"locale" "paradigm"."enum_services_locale",
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_services_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."services_locales" (
  	"name" varchar,
  	"tagline" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_services_v_version_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_services_v_version_features_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_services_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__services_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_icon" varchar,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_locale" "paradigm"."enum__services_v_version_locale",
  	"version_is_active" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__services_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__services_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_services_v_locales" (
  	"version_name" varchar,
  	"version_tagline" varchar,
  	"version_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."faqs_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_faqs_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"locale" "paradigm"."enum_faqs_locale",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_faqs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."faqs_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"category" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_faqs_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__faqs_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_faqs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_locale" "paradigm"."enum__faqs_v_version_locale",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__faqs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__faqs_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_faqs_v_locales" (
  	"version_question" varchar,
  	"version_answer" jsonb,
  	"version_category" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."works_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "paradigm"."works_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "paradigm"."works_gallery_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."works_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_works_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."works" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"color" "paradigm"."enum_works_color" DEFAULT 'indigo',
  	"cover_image_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"locale" "paradigm"."enum_works_locale",
  	"is_published" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_works_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."works_locales" (
  	"title" varchar,
  	"industry" varchar,
  	"description" varchar,
  	"challenge" varchar,
  	"solution" varchar,
  	"metrics" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_works_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_works_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_works_v_version_gallery_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_works_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__works_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_works_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_color" "paradigm"."enum__works_v_version_color" DEFAULT 'indigo',
  	"version_cover_image_id" integer,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_locale" "paradigm"."enum__works_v_version_locale",
  	"version_is_published" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__works_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__works_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_works_v_locales" (
  	"version_title" varchar,
  	"version_industry" varchar,
  	"version_description" varchar,
  	"version_challenge" varchar,
  	"version_solution" varchar,
  	"version_metrics" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."pricing_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"included" boolean DEFAULT true
  );
  
  CREATE TABLE "paradigm"."pricing_features_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pricing_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_pricing_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."pricing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"service_id" varchar,
  	"price" numeric,
  	"currency" "paradigm"."enum_pricing_currency" DEFAULT 'jpy',
  	"billing_cycle" "paradigm"."enum_pricing_billing_cycle" DEFAULT 'monthly',
  	"is_popular" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"locale" "paradigm"."enum_pricing_locale",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_pricing_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."pricing_locales" (
  	"plan_name" varchar,
  	"description" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pricing_v_version_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"included" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pricing_v_version_features_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pricing_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__pricing_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pricing_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_service_id" varchar,
  	"version_price" numeric,
  	"version_currency" "paradigm"."enum__pricing_v_version_currency" DEFAULT 'jpy',
  	"version_billing_cycle" "paradigm"."enum__pricing_v_version_billing_cycle" DEFAULT 'monthly',
  	"version_is_popular" boolean DEFAULT false,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_locale" "paradigm"."enum__pricing_v_version_locale",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__pricing_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__pricing_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_pricing_v_locales" (
  	"version_plan_name" varchar,
  	"version_description" varchar,
  	"version_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"company_name" varchar,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" varchar,
  	"message" varchar,
  	"service_interest" "paradigm"."enum_leads_service_interest",
  	"budget" varchar,
  	"pipeline_stage" "paradigm"."enum_leads_pipeline_stage" DEFAULT 'new',
  	"source" varchar DEFAULT 'paradigmjp.com',
  	"locale" "paradigm"."enum_leads_locale" DEFAULT 'ja',
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "paradigm"."media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection" varchar NOT NULL,
  	"action" "paradigm"."enum_audit_logs_action" NOT NULL,
  	"document_id" varchar,
  	"user_email" varchar,
  	"user_role" varchar,
  	"diff" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_hero_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "paradigm"."enum_pages_blocks_hero_variant" DEFAULT 'centered',
  	"primary_cta_href" varchar,
  	"secondary_cta_href" varchar,
  	"image_id" integer,
  	"video_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_hero_locales" (
  	"badge" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alignment" "paradigm"."enum_pages_blocks_section_alignment" DEFAULT 'center',
  	"background" "paradigm"."enum_pages_blocks_section_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_section_locales" (
  	"kicker" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"href" varchar,
  	"image_id" integer,
  	"highlighted" boolean
  );
  
  CREATE TABLE "paradigm"."pages_blocks_card_grid_cards_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "paradigm"."enum_pages_blocks_card_grid_variant" DEFAULT 'equal',
  	"columns" "paradigm"."enum_pages_blocks_card_grid_columns" DEFAULT '3',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_card_grid_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_cta_href" varchar,
  	"secondary_cta_href" varchar,
  	"background" "paradigm"."enum_pages_blocks_cta_background" DEFAULT 'gradient',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_cta_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_faq_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_width" "paradigm"."enum_pages_blocks_rich_text_max_width" DEFAULT 'prose',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_stats_stats_locales" (
  	"value" varchar,
  	"label" varchar,
  	"sublabel" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "paradigm"."enum_pages_blocks_stats_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_stats_locales" (
  	"kicker" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"avatar_id" integer,
  	"rating" numeric
  );
  
  CREATE TABLE "paradigm"."pages_blocks_testimonials_items_locales" (
  	"name" varchar,
  	"location" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kicker" varchar DEFAULT 'Testimonials',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_testimonials_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_process_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kicker" varchar DEFAULT 'Process',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_blocks_process_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_marquee_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_marquee_items_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages_blocks_marquee" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"direction" "paradigm"."enum_pages_blocks_marquee_direction" DEFAULT 'left',
  	"speed" "paradigm"."enum_pages_blocks_marquee_speed" DEFAULT 'normal',
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."pages_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum_pages_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"og_image_id" integer,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_canonical" varchar,
  	"is_homepage" boolean DEFAULT false,
  	"locale" "paradigm"."enum_pages_locale",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "paradigm"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paradigm"."pages_locales" (
  	"title" varchar,
  	"description" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_hero_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "paradigm"."enum__pages_v_blocks_hero_variant" DEFAULT 'centered',
  	"primary_cta_href" varchar,
  	"secondary_cta_href" varchar,
  	"image_id" integer,
  	"video_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_hero_locales" (
  	"badge" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"alignment" "paradigm"."enum__pages_v_blocks_section_alignment" DEFAULT 'center',
  	"background" "paradigm"."enum__pages_v_blocks_section_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_section_locales" (
  	"kicker" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"href" varchar,
  	"image_id" integer,
  	"highlighted" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_card_grid_cards_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "paradigm"."enum__pages_v_blocks_card_grid_variant" DEFAULT 'equal',
  	"columns" "paradigm"."enum__pages_v_blocks_card_grid_columns" DEFAULT '3',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_card_grid_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_cta_href" varchar,
  	"secondary_cta_href" varchar,
  	"background" "paradigm"."enum__pages_v_blocks_cta_background" DEFAULT 'gradient',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_cta_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_faq_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"max_width" "paradigm"."enum__pages_v_blocks_rich_text_max_width" DEFAULT 'prose',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_stats_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_stats_stats_locales" (
  	"value" varchar,
  	"label" varchar,
  	"sublabel" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "paradigm"."enum__pages_v_blocks_stats_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_stats_locales" (
  	"kicker" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"avatar_id" integer,
  	"rating" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_testimonials_items_locales" (
  	"name" varchar,
  	"location" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kicker" varchar DEFAULT 'Testimonials',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_testimonials_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_process_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kicker" varchar DEFAULT 'Process',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_process_locales" (
  	"title" varchar,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_marquee_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_marquee_items_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v_blocks_marquee" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"direction" "paradigm"."enum__pages_v_blocks_marquee_direction" DEFAULT 'left',
  	"speed" "paradigm"."enum__pages_v_blocks_marquee_speed" DEFAULT 'normal',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paradigm"."_pages_v_version_available_locales" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "paradigm"."enum__pages_v_version_available_locales",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "paradigm"."_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_og_image_id" integer,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_canonical" varchar,
  	"version_is_homepage" boolean DEFAULT false,
  	"version_locale" "paradigm"."enum__pages_v_version_locale",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "paradigm"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "paradigm"."enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "paradigm"."_pages_v_locales" (
  	"version_title" varchar,
  	"version_description" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "paradigm"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "paradigm"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"posts_id" integer,
  	"services_id" integer,
  	"faqs_id" integer,
  	"works_id" integer,
  	"pricing_id" integer,
  	"leads_id" integer,
  	"media_id" integer,
  	"audit_logs_id" integer,
  	"pages_id" integer
  );
  
  CREATE TABLE "paradigm"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "paradigm"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "paradigm"."settings_umami_by_locale" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "paradigm"."enum_settings_umami_by_locale_locale" NOT NULL,
  	"website_id" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."settings_calendar_by_locale" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "paradigm"."enum_settings_calendar_by_locale_locale" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "paradigm"."settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"social_twitter" varchar,
  	"social_instagram" varchar,
  	"social_facebook" varchar,
  	"social_linkedin" varchar,
  	"social_line" varchar,
  	"maintenance_maintenance_mode" boolean DEFAULT false,
  	"analytics_umami_website_id" varchar,
  	"analytics_umami_website_id_en" varchar,
  	"calendar_url_ja" varchar,
  	"calendar_url_en" varchar,
  	"theme_colors_paper" varchar,
  	"theme_colors_paper_deep" varchar,
  	"theme_colors_ink" varchar,
  	"theme_colors_ink_soft" varchar,
  	"theme_colors_ink_mute" varchar,
  	"theme_colors_line" varchar,
  	"theme_colors_accent" varchar,
  	"theme_colors_tech" varchar,
  	"theme_colors_glow" varchar,
  	"theme_fonts_display" varchar,
  	"theme_fonts_body" varchar,
  	"theme_radius_sm" varchar,
  	"theme_radius_md" varchar,
  	"theme_radius_lg" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "paradigm"."settings_locales" (
  	"site_name" varchar DEFAULT 'Paradigm合同会社',
  	"tagline" varchar DEFAULT 'デジタルで事業を加速する',
  	"description" varchar,
  	"contact_address" varchar,
  	"contact_business_hours" varchar,
  	"maintenance_maintenance_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "paradigm"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "paradigm"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."posts_tags" ADD CONSTRAINT "posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."posts_available_locales" ADD CONSTRAINT "posts_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."posts" ADD CONSTRAINT "posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v_version_tags" ADD CONSTRAINT "_posts_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v_version_available_locales" ADD CONSTRAINT "_posts_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v" ADD CONSTRAINT "_posts_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."services_features" ADD CONSTRAINT "services_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."services_features_locales" ADD CONSTRAINT "services_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."services_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."services_available_locales" ADD CONSTRAINT "services_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_services_v_version_features" ADD CONSTRAINT "_services_v_version_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_services_v_version_features_locales" ADD CONSTRAINT "_services_v_version_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_services_v_version_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_services_v_version_available_locales" ADD CONSTRAINT "_services_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."faqs_available_locales" ADD CONSTRAINT "faqs_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."faqs_locales" ADD CONSTRAINT "faqs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_faqs_v_version_available_locales" ADD CONSTRAINT "_faqs_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_faqs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_faqs_v" ADD CONSTRAINT "_faqs_v_parent_id_faqs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."faqs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_faqs_v_locales" ADD CONSTRAINT "_faqs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_faqs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."works_tags" ADD CONSTRAINT "works_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."works_gallery" ADD CONSTRAINT "works_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."works_gallery" ADD CONSTRAINT "works_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."works_gallery_locales" ADD CONSTRAINT "works_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."works_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."works_available_locales" ADD CONSTRAINT "works_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."works" ADD CONSTRAINT "works_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."works_locales" ADD CONSTRAINT "works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_version_tags" ADD CONSTRAINT "_works_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_version_gallery" ADD CONSTRAINT "_works_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_version_gallery" ADD CONSTRAINT "_works_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_version_gallery_locales" ADD CONSTRAINT "_works_v_version_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_works_v_version_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_version_available_locales" ADD CONSTRAINT "_works_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v" ADD CONSTRAINT "_works_v_parent_id_works_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."works"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v" ADD CONSTRAINT "_works_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_works_v_locales" ADD CONSTRAINT "_works_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_works_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pricing_features" ADD CONSTRAINT "pricing_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pricing_features_locales" ADD CONSTRAINT "pricing_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pricing_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pricing_available_locales" ADD CONSTRAINT "pricing_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pricing_locales" ADD CONSTRAINT "pricing_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pricing_v_version_features" ADD CONSTRAINT "_pricing_v_version_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pricing_v_version_features_locales" ADD CONSTRAINT "_pricing_v_version_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pricing_v_version_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pricing_v_version_available_locales" ADD CONSTRAINT "_pricing_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pricing_v" ADD CONSTRAINT "_pricing_v_parent_id_pricing_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."pricing"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pricing_v_locales" ADD CONSTRAINT "_pricing_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pricing_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_hero_stats" ADD CONSTRAINT "pages_blocks_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_hero_stats_locales" ADD CONSTRAINT "pages_blocks_hero_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_hero_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_section" ADD CONSTRAINT "pages_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_section_locales" ADD CONSTRAINT "pages_blocks_section_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_card_grid_cards" ADD CONSTRAINT "pages_blocks_card_grid_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_card_grid_cards" ADD CONSTRAINT "pages_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_card_grid_cards_locales" ADD CONSTRAINT "pages_blocks_card_grid_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_card_grid_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_card_grid" ADD CONSTRAINT "pages_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_card_grid_locales" ADD CONSTRAINT "pages_blocks_card_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_cta_locales" ADD CONSTRAINT "pages_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_stats_stats" ADD CONSTRAINT "pages_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_stats_stats_locales" ADD CONSTRAINT "pages_blocks_stats_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_stats_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_stats_locales" ADD CONSTRAINT "pages_blocks_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_testimonials_items" ADD CONSTRAINT "pages_blocks_testimonials_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_testimonials_items" ADD CONSTRAINT "pages_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_testimonials_items_locales" ADD CONSTRAINT "pages_blocks_testimonials_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_testimonials_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_testimonials_locales" ADD CONSTRAINT "pages_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_process_steps" ADD CONSTRAINT "pages_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_process_steps_locales" ADD CONSTRAINT "pages_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_process" ADD CONSTRAINT "pages_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_process_locales" ADD CONSTRAINT "pages_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_marquee_items" ADD CONSTRAINT "pages_blocks_marquee_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_marquee"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_marquee_items_locales" ADD CONSTRAINT "pages_blocks_marquee_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages_blocks_marquee_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_blocks_marquee" ADD CONSTRAINT "pages_blocks_marquee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_available_locales" ADD CONSTRAINT "pages_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."pages" ADD CONSTRAINT "pages_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_hero_stats" ADD CONSTRAINT "_pages_v_blocks_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_hero_stats_locales" ADD CONSTRAINT "_pages_v_blocks_hero_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_hero_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_section" ADD CONSTRAINT "_pages_v_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_section_locales" ADD CONSTRAINT "_pages_v_blocks_section_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_card_grid_cards" ADD CONSTRAINT "_pages_v_blocks_card_grid_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_card_grid_cards" ADD CONSTRAINT "_pages_v_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_card_grid_cards_locales" ADD CONSTRAINT "_pages_v_blocks_card_grid_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_card_grid_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_card_grid" ADD CONSTRAINT "_pages_v_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_card_grid_locales" ADD CONSTRAINT "_pages_v_blocks_card_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_cta_locales" ADD CONSTRAINT "_pages_v_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_stats_stats" ADD CONSTRAINT "_pages_v_blocks_stats_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_stats_stats_locales" ADD CONSTRAINT "_pages_v_blocks_stats_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_stats_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_stats" ADD CONSTRAINT "_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_stats_locales" ADD CONSTRAINT "_pages_v_blocks_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_testimonials_items" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_testimonials_items" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_testimonials_items_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_testimonials_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_testimonials" ADD CONSTRAINT "_pages_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_testimonials_locales" ADD CONSTRAINT "_pages_v_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_process_steps" ADD CONSTRAINT "_pages_v_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_process_steps_locales" ADD CONSTRAINT "_pages_v_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_process" ADD CONSTRAINT "_pages_v_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_process_locales" ADD CONSTRAINT "_pages_v_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_marquee_items" ADD CONSTRAINT "_pages_v_blocks_marquee_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_marquee"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_marquee_items_locales" ADD CONSTRAINT "_pages_v_blocks_marquee_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v_blocks_marquee_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_blocks_marquee" ADD CONSTRAINT "_pages_v_blocks_marquee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_version_available_locales" ADD CONSTRAINT "_pages_v_version_available_locales_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v" ADD CONSTRAINT "_pages_v_version_og_image_id_media_id_fk" FOREIGN KEY ("version_og_image_id") REFERENCES "paradigm"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paradigm"."_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "paradigm"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "paradigm"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "paradigm"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "paradigm"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_works_fk" FOREIGN KEY ("works_id") REFERENCES "paradigm"."works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pricing_fk" FOREIGN KEY ("pricing_id") REFERENCES "paradigm"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "paradigm"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "paradigm"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "paradigm"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "paradigm"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "paradigm"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "paradigm"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."settings_umami_by_locale" ADD CONSTRAINT "settings_umami_by_locale_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."settings_calendar_by_locale" ADD CONSTRAINT "settings_calendar_by_locale_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paradigm"."settings_locales" ADD CONSTRAINT "settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "paradigm"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "paradigm"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "paradigm"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "paradigm"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "paradigm"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "paradigm"."users" USING btree ("email");
  CREATE INDEX "posts_tags_order_idx" ON "paradigm"."posts_tags" USING btree ("_order");
  CREATE INDEX "posts_tags_parent_id_idx" ON "paradigm"."posts_tags" USING btree ("_parent_id");
  CREATE INDEX "posts_available_locales_order_idx" ON "paradigm"."posts_available_locales" USING btree ("order");
  CREATE INDEX "posts_available_locales_parent_idx" ON "paradigm"."posts_available_locales" USING btree ("parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "paradigm"."posts" USING btree ("slug");
  CREATE INDEX "posts_cover_image_idx" ON "paradigm"."posts" USING btree ("cover_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "paradigm"."posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "paradigm"."posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "paradigm"."posts" USING btree ("_status");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "paradigm"."posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_version_tags_order_idx" ON "paradigm"."_posts_v_version_tags" USING btree ("_order");
  CREATE INDEX "_posts_v_version_tags_parent_id_idx" ON "paradigm"."_posts_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_available_locales_order_idx" ON "paradigm"."_posts_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_posts_v_version_available_locales_parent_idx" ON "paradigm"."_posts_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "paradigm"."_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "paradigm"."_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_cover_image_idx" ON "paradigm"."_posts_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "paradigm"."_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "paradigm"."_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "paradigm"."_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "paradigm"."_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "paradigm"."_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "paradigm"."_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "paradigm"."_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "paradigm"."_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "paradigm"."_posts_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "paradigm"."_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_features_order_idx" ON "paradigm"."services_features" USING btree ("_order");
  CREATE INDEX "services_features_parent_id_idx" ON "paradigm"."services_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_features_locales_locale_parent_id_unique" ON "paradigm"."services_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_available_locales_order_idx" ON "paradigm"."services_available_locales" USING btree ("order");
  CREATE INDEX "services_available_locales_parent_idx" ON "paradigm"."services_available_locales" USING btree ("parent_id");
  CREATE UNIQUE INDEX "services_slug_idx" ON "paradigm"."services" USING btree ("slug");
  CREATE INDEX "services_updated_at_idx" ON "paradigm"."services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "paradigm"."services" USING btree ("created_at");
  CREATE INDEX "services__status_idx" ON "paradigm"."services" USING btree ("_status");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "paradigm"."services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_version_features_order_idx" ON "paradigm"."_services_v_version_features" USING btree ("_order");
  CREATE INDEX "_services_v_version_features_parent_id_idx" ON "paradigm"."_services_v_version_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_version_features_locales_locale_parent_id_unique" ON "paradigm"."_services_v_version_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_version_available_locales_order_idx" ON "paradigm"."_services_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_services_v_version_available_locales_parent_idx" ON "paradigm"."_services_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_services_v_parent_idx" ON "paradigm"."_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "paradigm"."_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "paradigm"."_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "paradigm"."_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "paradigm"."_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "paradigm"."_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "paradigm"."_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_snapshot_idx" ON "paradigm"."_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "paradigm"."_services_v" USING btree ("published_locale");
  CREATE INDEX "_services_v_latest_idx" ON "paradigm"."_services_v" USING btree ("latest");
  CREATE INDEX "_services_v_autosave_idx" ON "paradigm"."_services_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "paradigm"."_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faqs_available_locales_order_idx" ON "paradigm"."faqs_available_locales" USING btree ("order");
  CREATE INDEX "faqs_available_locales_parent_idx" ON "paradigm"."faqs_available_locales" USING btree ("parent_id");
  CREATE INDEX "faqs_updated_at_idx" ON "paradigm"."faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "paradigm"."faqs" USING btree ("created_at");
  CREATE INDEX "faqs__status_idx" ON "paradigm"."faqs" USING btree ("_status");
  CREATE UNIQUE INDEX "faqs_locales_locale_parent_id_unique" ON "paradigm"."faqs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_faqs_v_version_available_locales_order_idx" ON "paradigm"."_faqs_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_faqs_v_version_available_locales_parent_idx" ON "paradigm"."_faqs_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_faqs_v_parent_idx" ON "paradigm"."_faqs_v" USING btree ("parent_id");
  CREATE INDEX "_faqs_v_version_version_updated_at_idx" ON "paradigm"."_faqs_v" USING btree ("version_updated_at");
  CREATE INDEX "_faqs_v_version_version_created_at_idx" ON "paradigm"."_faqs_v" USING btree ("version_created_at");
  CREATE INDEX "_faqs_v_version_version__status_idx" ON "paradigm"."_faqs_v" USING btree ("version__status");
  CREATE INDEX "_faqs_v_created_at_idx" ON "paradigm"."_faqs_v" USING btree ("created_at");
  CREATE INDEX "_faqs_v_updated_at_idx" ON "paradigm"."_faqs_v" USING btree ("updated_at");
  CREATE INDEX "_faqs_v_snapshot_idx" ON "paradigm"."_faqs_v" USING btree ("snapshot");
  CREATE INDEX "_faqs_v_published_locale_idx" ON "paradigm"."_faqs_v" USING btree ("published_locale");
  CREATE INDEX "_faqs_v_latest_idx" ON "paradigm"."_faqs_v" USING btree ("latest");
  CREATE INDEX "_faqs_v_autosave_idx" ON "paradigm"."_faqs_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_faqs_v_locales_locale_parent_id_unique" ON "paradigm"."_faqs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_tags_order_idx" ON "paradigm"."works_tags" USING btree ("_order");
  CREATE INDEX "works_tags_parent_id_idx" ON "paradigm"."works_tags" USING btree ("_parent_id");
  CREATE INDEX "works_gallery_order_idx" ON "paradigm"."works_gallery" USING btree ("_order");
  CREATE INDEX "works_gallery_parent_id_idx" ON "paradigm"."works_gallery" USING btree ("_parent_id");
  CREATE INDEX "works_gallery_image_idx" ON "paradigm"."works_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "works_gallery_locales_locale_parent_id_unique" ON "paradigm"."works_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "works_available_locales_order_idx" ON "paradigm"."works_available_locales" USING btree ("order");
  CREATE INDEX "works_available_locales_parent_idx" ON "paradigm"."works_available_locales" USING btree ("parent_id");
  CREATE INDEX "works_cover_image_idx" ON "paradigm"."works" USING btree ("cover_image_id");
  CREATE INDEX "works_updated_at_idx" ON "paradigm"."works" USING btree ("updated_at");
  CREATE INDEX "works_created_at_idx" ON "paradigm"."works" USING btree ("created_at");
  CREATE INDEX "works__status_idx" ON "paradigm"."works" USING btree ("_status");
  CREATE UNIQUE INDEX "works_locales_locale_parent_id_unique" ON "paradigm"."works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_tags_order_idx" ON "paradigm"."_works_v_version_tags" USING btree ("_order");
  CREATE INDEX "_works_v_version_tags_parent_id_idx" ON "paradigm"."_works_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_gallery_order_idx" ON "paradigm"."_works_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_works_v_version_gallery_parent_id_idx" ON "paradigm"."_works_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_works_v_version_gallery_image_idx" ON "paradigm"."_works_v_version_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "_works_v_version_gallery_locales_locale_parent_id_unique" ON "paradigm"."_works_v_version_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_works_v_version_available_locales_order_idx" ON "paradigm"."_works_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_works_v_version_available_locales_parent_idx" ON "paradigm"."_works_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_works_v_parent_idx" ON "paradigm"."_works_v" USING btree ("parent_id");
  CREATE INDEX "_works_v_version_version_cover_image_idx" ON "paradigm"."_works_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_works_v_version_version_updated_at_idx" ON "paradigm"."_works_v" USING btree ("version_updated_at");
  CREATE INDEX "_works_v_version_version_created_at_idx" ON "paradigm"."_works_v" USING btree ("version_created_at");
  CREATE INDEX "_works_v_version_version__status_idx" ON "paradigm"."_works_v" USING btree ("version__status");
  CREATE INDEX "_works_v_created_at_idx" ON "paradigm"."_works_v" USING btree ("created_at");
  CREATE INDEX "_works_v_updated_at_idx" ON "paradigm"."_works_v" USING btree ("updated_at");
  CREATE INDEX "_works_v_snapshot_idx" ON "paradigm"."_works_v" USING btree ("snapshot");
  CREATE INDEX "_works_v_published_locale_idx" ON "paradigm"."_works_v" USING btree ("published_locale");
  CREATE INDEX "_works_v_latest_idx" ON "paradigm"."_works_v" USING btree ("latest");
  CREATE INDEX "_works_v_autosave_idx" ON "paradigm"."_works_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_works_v_locales_locale_parent_id_unique" ON "paradigm"."_works_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pricing_features_order_idx" ON "paradigm"."pricing_features" USING btree ("_order");
  CREATE INDEX "pricing_features_parent_id_idx" ON "paradigm"."pricing_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pricing_features_locales_locale_parent_id_unique" ON "paradigm"."pricing_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pricing_available_locales_order_idx" ON "paradigm"."pricing_available_locales" USING btree ("order");
  CREATE INDEX "pricing_available_locales_parent_idx" ON "paradigm"."pricing_available_locales" USING btree ("parent_id");
  CREATE INDEX "pricing_updated_at_idx" ON "paradigm"."pricing" USING btree ("updated_at");
  CREATE INDEX "pricing_created_at_idx" ON "paradigm"."pricing" USING btree ("created_at");
  CREATE INDEX "pricing__status_idx" ON "paradigm"."pricing" USING btree ("_status");
  CREATE UNIQUE INDEX "pricing_locales_locale_parent_id_unique" ON "paradigm"."pricing_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pricing_v_version_features_order_idx" ON "paradigm"."_pricing_v_version_features" USING btree ("_order");
  CREATE INDEX "_pricing_v_version_features_parent_id_idx" ON "paradigm"."_pricing_v_version_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pricing_v_version_features_locales_locale_parent_id_unique" ON "paradigm"."_pricing_v_version_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pricing_v_version_available_locales_order_idx" ON "paradigm"."_pricing_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_pricing_v_version_available_locales_parent_idx" ON "paradigm"."_pricing_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_pricing_v_parent_idx" ON "paradigm"."_pricing_v" USING btree ("parent_id");
  CREATE INDEX "_pricing_v_version_version_updated_at_idx" ON "paradigm"."_pricing_v" USING btree ("version_updated_at");
  CREATE INDEX "_pricing_v_version_version_created_at_idx" ON "paradigm"."_pricing_v" USING btree ("version_created_at");
  CREATE INDEX "_pricing_v_version_version__status_idx" ON "paradigm"."_pricing_v" USING btree ("version__status");
  CREATE INDEX "_pricing_v_created_at_idx" ON "paradigm"."_pricing_v" USING btree ("created_at");
  CREATE INDEX "_pricing_v_updated_at_idx" ON "paradigm"."_pricing_v" USING btree ("updated_at");
  CREATE INDEX "_pricing_v_snapshot_idx" ON "paradigm"."_pricing_v" USING btree ("snapshot");
  CREATE INDEX "_pricing_v_published_locale_idx" ON "paradigm"."_pricing_v" USING btree ("published_locale");
  CREATE INDEX "_pricing_v_latest_idx" ON "paradigm"."_pricing_v" USING btree ("latest");
  CREATE INDEX "_pricing_v_autosave_idx" ON "paradigm"."_pricing_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pricing_v_locales_locale_parent_id_unique" ON "paradigm"."_pricing_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "leads_updated_at_idx" ON "paradigm"."leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "paradigm"."leads" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "paradigm"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "paradigm"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "paradigm"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "paradigm"."media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "paradigm"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "paradigm"."media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "paradigm"."media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "paradigm"."media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "audit_logs_collection_idx" ON "paradigm"."audit_logs" USING btree ("collection");
  CREATE INDEX "audit_logs_document_id_idx" ON "paradigm"."audit_logs" USING btree ("document_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "paradigm"."audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "paradigm"."audit_logs" USING btree ("created_at");
  CREATE INDEX "pages_blocks_hero_stats_order_idx" ON "paradigm"."pages_blocks_hero_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_stats_parent_id_idx" ON "paradigm"."pages_blocks_hero_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_stats_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_hero_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "paradigm"."pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "paradigm"."pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "paradigm"."pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "paradigm"."pages_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_section_order_idx" ON "paradigm"."pages_blocks_section" USING btree ("_order");
  CREATE INDEX "pages_blocks_section_parent_id_idx" ON "paradigm"."pages_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_section_path_idx" ON "paradigm"."pages_blocks_section" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_section_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_section_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_card_grid_cards_order_idx" ON "paradigm"."pages_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_cards_parent_id_idx" ON "paradigm"."pages_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_cards_image_idx" ON "paradigm"."pages_blocks_card_grid_cards" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_card_grid_cards_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_card_grid_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_card_grid_order_idx" ON "paradigm"."pages_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_parent_id_idx" ON "paradigm"."pages_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_path_idx" ON "paradigm"."pages_blocks_card_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_card_grid_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_card_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "paradigm"."pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "paradigm"."pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "paradigm"."pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cta_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "paradigm"."pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "paradigm"."pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "paradigm"."pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "paradigm"."pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "paradigm"."pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "paradigm"."pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "paradigm"."pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "paradigm"."pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_stats_stats_order_idx" ON "paradigm"."pages_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_stats_parent_id_idx" ON "paradigm"."pages_blocks_stats_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_stats_stats_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_stats_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "paradigm"."pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "paradigm"."pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "paradigm"."pages_blocks_stats" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_stats_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_items_order_idx" ON "paradigm"."pages_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_items_parent_id_idx" ON "paradigm"."pages_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_items_avatar_idx" ON "paradigm"."pages_blocks_testimonials_items" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_items_locales_locale_parent_id_uni" ON "paradigm"."pages_blocks_testimonials_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "paradigm"."pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "paradigm"."pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "paradigm"."pages_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_testimonials_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_process_steps_order_idx" ON "paradigm"."pages_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_process_steps_parent_id_idx" ON "paradigm"."pages_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_process_steps_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_process_order_idx" ON "paradigm"."pages_blocks_process" USING btree ("_order");
  CREATE INDEX "pages_blocks_process_parent_id_idx" ON "paradigm"."pages_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_process_path_idx" ON "paradigm"."pages_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_process_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_marquee_items_order_idx" ON "paradigm"."pages_blocks_marquee_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_marquee_items_parent_id_idx" ON "paradigm"."pages_blocks_marquee_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_marquee_items_locales_locale_parent_id_unique" ON "paradigm"."pages_blocks_marquee_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_marquee_order_idx" ON "paradigm"."pages_blocks_marquee" USING btree ("_order");
  CREATE INDEX "pages_blocks_marquee_parent_id_idx" ON "paradigm"."pages_blocks_marquee" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_marquee_path_idx" ON "paradigm"."pages_blocks_marquee" USING btree ("_path");
  CREATE INDEX "pages_available_locales_order_idx" ON "paradigm"."pages_available_locales" USING btree ("order");
  CREATE INDEX "pages_available_locales_parent_idx" ON "paradigm"."pages_available_locales" USING btree ("parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "paradigm"."pages" USING btree ("slug");
  CREATE INDEX "pages_og_image_idx" ON "paradigm"."pages" USING btree ("og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "paradigm"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "paradigm"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "paradigm"."pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "paradigm"."pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_stats_order_idx" ON "paradigm"."_pages_v_blocks_hero_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_stats_parent_id_idx" ON "paradigm"."_pages_v_blocks_hero_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_stats_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_hero_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "paradigm"."_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "paradigm"."_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "paradigm"."_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "paradigm"."_pages_v_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_section_order_idx" ON "paradigm"."_pages_v_blocks_section" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_section_parent_id_idx" ON "paradigm"."_pages_v_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_section_path_idx" ON "paradigm"."_pages_v_blocks_section" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_section_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_section_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_cards_order_idx" ON "paradigm"."_pages_v_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_card_grid_cards_parent_id_idx" ON "paradigm"."_pages_v_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_cards_image_idx" ON "paradigm"."_pages_v_blocks_card_grid_cards" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_card_grid_cards_locales_locale_parent_id_uni" ON "paradigm"."_pages_v_blocks_card_grid_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_order_idx" ON "paradigm"."_pages_v_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_card_grid_parent_id_idx" ON "paradigm"."_pages_v_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_path_idx" ON "paradigm"."_pages_v_blocks_card_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_card_grid_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_card_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "paradigm"."_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "paradigm"."_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "paradigm"."_pages_v_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "paradigm"."_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "paradigm"."_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "paradigm"."_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "paradigm"."_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "paradigm"."_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "paradigm"."_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "paradigm"."_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "paradigm"."_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_stats_order_idx" ON "paradigm"."_pages_v_blocks_stats_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_stats_parent_id_idx" ON "paradigm"."_pages_v_blocks_stats_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_stats_stats_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_stats_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_order_idx" ON "paradigm"."_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_stats_parent_id_idx" ON "paradigm"."_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_stats_path_idx" ON "paradigm"."_pages_v_blocks_stats" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_stats_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_items_order_idx" ON "paradigm"."_pages_v_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_items_parent_id_idx" ON "paradigm"."_pages_v_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_items_avatar_idx" ON "paradigm"."_pages_v_blocks_testimonials_items" USING btree ("avatar_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_items_locales_locale_parent_id_" ON "paradigm"."_pages_v_blocks_testimonials_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_order_idx" ON "paradigm"."_pages_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_testimonials_parent_id_idx" ON "paradigm"."_pages_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_testimonials_path_idx" ON "paradigm"."_pages_v_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_testimonials_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_process_steps_order_idx" ON "paradigm"."_pages_v_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_process_steps_parent_id_idx" ON "paradigm"."_pages_v_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_process_steps_locales_locale_parent_id_uniqu" ON "paradigm"."_pages_v_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_process_order_idx" ON "paradigm"."_pages_v_blocks_process" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_process_parent_id_idx" ON "paradigm"."_pages_v_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_process_path_idx" ON "paradigm"."_pages_v_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_process_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_marquee_items_order_idx" ON "paradigm"."_pages_v_blocks_marquee_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_marquee_items_parent_id_idx" ON "paradigm"."_pages_v_blocks_marquee_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_marquee_items_locales_locale_parent_id_uniqu" ON "paradigm"."_pages_v_blocks_marquee_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_marquee_order_idx" ON "paradigm"."_pages_v_blocks_marquee" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_marquee_parent_id_idx" ON "paradigm"."_pages_v_blocks_marquee" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_marquee_path_idx" ON "paradigm"."_pages_v_blocks_marquee" USING btree ("_path");
  CREATE INDEX "_pages_v_version_available_locales_order_idx" ON "paradigm"."_pages_v_version_available_locales" USING btree ("order");
  CREATE INDEX "_pages_v_version_available_locales_parent_idx" ON "paradigm"."_pages_v_version_available_locales" USING btree ("parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "paradigm"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "paradigm"."_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_og_image_idx" ON "paradigm"."_pages_v" USING btree ("version_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "paradigm"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "paradigm"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "paradigm"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "paradigm"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "paradigm"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "paradigm"."_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "paradigm"."_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "paradigm"."_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "paradigm"."_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "paradigm"."_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "paradigm"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "paradigm"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "paradigm"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "paradigm"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_works_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("works_id");
  CREATE INDEX "payload_locked_documents_rels_pricing_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("pricing_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "paradigm"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_preferences_key_idx" ON "paradigm"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "paradigm"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "paradigm"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "paradigm"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "paradigm"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "paradigm"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "paradigm"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "paradigm"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "paradigm"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "settings_umami_by_locale_order_idx" ON "paradigm"."settings_umami_by_locale" USING btree ("_order");
  CREATE INDEX "settings_umami_by_locale_parent_id_idx" ON "paradigm"."settings_umami_by_locale" USING btree ("_parent_id");
  CREATE INDEX "settings_calendar_by_locale_order_idx" ON "paradigm"."settings_calendar_by_locale" USING btree ("_order");
  CREATE INDEX "settings_calendar_by_locale_parent_id_idx" ON "paradigm"."settings_calendar_by_locale" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "settings_locales_locale_parent_id_unique" ON "paradigm"."settings_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "paradigm"."users_sessions" CASCADE;
  DROP TABLE "paradigm"."users" CASCADE;
  DROP TABLE "paradigm"."posts_tags" CASCADE;
  DROP TABLE "paradigm"."posts_available_locales" CASCADE;
  DROP TABLE "paradigm"."posts" CASCADE;
  DROP TABLE "paradigm"."posts_locales" CASCADE;
  DROP TABLE "paradigm"."_posts_v_version_tags" CASCADE;
  DROP TABLE "paradigm"."_posts_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_posts_v" CASCADE;
  DROP TABLE "paradigm"."_posts_v_locales" CASCADE;
  DROP TABLE "paradigm"."services_features" CASCADE;
  DROP TABLE "paradigm"."services_features_locales" CASCADE;
  DROP TABLE "paradigm"."services_available_locales" CASCADE;
  DROP TABLE "paradigm"."services" CASCADE;
  DROP TABLE "paradigm"."services_locales" CASCADE;
  DROP TABLE "paradigm"."_services_v_version_features" CASCADE;
  DROP TABLE "paradigm"."_services_v_version_features_locales" CASCADE;
  DROP TABLE "paradigm"."_services_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_services_v" CASCADE;
  DROP TABLE "paradigm"."_services_v_locales" CASCADE;
  DROP TABLE "paradigm"."faqs_available_locales" CASCADE;
  DROP TABLE "paradigm"."faqs" CASCADE;
  DROP TABLE "paradigm"."faqs_locales" CASCADE;
  DROP TABLE "paradigm"."_faqs_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_faqs_v" CASCADE;
  DROP TABLE "paradigm"."_faqs_v_locales" CASCADE;
  DROP TABLE "paradigm"."works_tags" CASCADE;
  DROP TABLE "paradigm"."works_gallery" CASCADE;
  DROP TABLE "paradigm"."works_gallery_locales" CASCADE;
  DROP TABLE "paradigm"."works_available_locales" CASCADE;
  DROP TABLE "paradigm"."works" CASCADE;
  DROP TABLE "paradigm"."works_locales" CASCADE;
  DROP TABLE "paradigm"."_works_v_version_tags" CASCADE;
  DROP TABLE "paradigm"."_works_v_version_gallery" CASCADE;
  DROP TABLE "paradigm"."_works_v_version_gallery_locales" CASCADE;
  DROP TABLE "paradigm"."_works_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_works_v" CASCADE;
  DROP TABLE "paradigm"."_works_v_locales" CASCADE;
  DROP TABLE "paradigm"."pricing_features" CASCADE;
  DROP TABLE "paradigm"."pricing_features_locales" CASCADE;
  DROP TABLE "paradigm"."pricing_available_locales" CASCADE;
  DROP TABLE "paradigm"."pricing" CASCADE;
  DROP TABLE "paradigm"."pricing_locales" CASCADE;
  DROP TABLE "paradigm"."_pricing_v_version_features" CASCADE;
  DROP TABLE "paradigm"."_pricing_v_version_features_locales" CASCADE;
  DROP TABLE "paradigm"."_pricing_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_pricing_v" CASCADE;
  DROP TABLE "paradigm"."_pricing_v_locales" CASCADE;
  DROP TABLE "paradigm"."leads" CASCADE;
  DROP TABLE "paradigm"."media" CASCADE;
  DROP TABLE "paradigm"."media_locales" CASCADE;
  DROP TABLE "paradigm"."audit_logs" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_hero_stats" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_hero_stats_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_hero" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_hero_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_section" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_section_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_card_grid_cards" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_card_grid_cards_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_card_grid" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_card_grid_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_cta" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_cta_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_faq_items" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_faq" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_faq_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_rich_text" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_stats_stats" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_stats_stats_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_stats" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_stats_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_testimonials_items" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_testimonials_items_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_testimonials" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_testimonials_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_process_steps" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_process_steps_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_process" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_process_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_marquee_items" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_marquee_items_locales" CASCADE;
  DROP TABLE "paradigm"."pages_blocks_marquee" CASCADE;
  DROP TABLE "paradigm"."pages_available_locales" CASCADE;
  DROP TABLE "paradigm"."pages" CASCADE;
  DROP TABLE "paradigm"."pages_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_hero_stats" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_hero_stats_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_hero" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_section" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_section_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_card_grid_cards" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_card_grid_cards_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_card_grid" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_card_grid_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_cta" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_cta_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_faq" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_stats_stats" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_stats_stats_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_stats" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_stats_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_testimonials_items" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_testimonials_items_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_testimonials" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_testimonials_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_process_steps" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_process_steps_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_process" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_process_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_marquee_items" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_marquee_items_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v_blocks_marquee" CASCADE;
  DROP TABLE "paradigm"."_pages_v_version_available_locales" CASCADE;
  DROP TABLE "paradigm"."_pages_v" CASCADE;
  DROP TABLE "paradigm"."_pages_v_locales" CASCADE;
  DROP TABLE "paradigm"."payload_kv" CASCADE;
  DROP TABLE "paradigm"."payload_locked_documents" CASCADE;
  DROP TABLE "paradigm"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "paradigm"."payload_preferences" CASCADE;
  DROP TABLE "paradigm"."payload_preferences_rels" CASCADE;
  DROP TABLE "paradigm"."payload_migrations" CASCADE;
  DROP TABLE "paradigm"."settings_umami_by_locale" CASCADE;
  DROP TABLE "paradigm"."settings_calendar_by_locale" CASCADE;
  DROP TABLE "paradigm"."settings" CASCADE;
  DROP TABLE "paradigm"."settings_locales" CASCADE;
  DROP TYPE "paradigm"."_locales";
  DROP TYPE "paradigm"."enum_users_role";
  DROP TYPE "paradigm"."enum_posts_available_locales";
  DROP TYPE "paradigm"."enum_posts_status";
  DROP TYPE "paradigm"."enum__posts_v_version_available_locales";
  DROP TYPE "paradigm"."enum__posts_v_version_status";
  DROP TYPE "paradigm"."enum__posts_v_published_locale";
  DROP TYPE "paradigm"."enum_services_available_locales";
  DROP TYPE "paradigm"."enum_services_locale";
  DROP TYPE "paradigm"."enum_services_status";
  DROP TYPE "paradigm"."enum__services_v_version_available_locales";
  DROP TYPE "paradigm"."enum__services_v_version_locale";
  DROP TYPE "paradigm"."enum__services_v_version_status";
  DROP TYPE "paradigm"."enum__services_v_published_locale";
  DROP TYPE "paradigm"."enum_faqs_available_locales";
  DROP TYPE "paradigm"."enum_faqs_locale";
  DROP TYPE "paradigm"."enum_faqs_status";
  DROP TYPE "paradigm"."enum__faqs_v_version_available_locales";
  DROP TYPE "paradigm"."enum__faqs_v_version_locale";
  DROP TYPE "paradigm"."enum__faqs_v_version_status";
  DROP TYPE "paradigm"."enum__faqs_v_published_locale";
  DROP TYPE "paradigm"."enum_works_available_locales";
  DROP TYPE "paradigm"."enum_works_color";
  DROP TYPE "paradigm"."enum_works_locale";
  DROP TYPE "paradigm"."enum_works_status";
  DROP TYPE "paradigm"."enum__works_v_version_available_locales";
  DROP TYPE "paradigm"."enum__works_v_version_color";
  DROP TYPE "paradigm"."enum__works_v_version_locale";
  DROP TYPE "paradigm"."enum__works_v_version_status";
  DROP TYPE "paradigm"."enum__works_v_published_locale";
  DROP TYPE "paradigm"."enum_pricing_available_locales";
  DROP TYPE "paradigm"."enum_pricing_currency";
  DROP TYPE "paradigm"."enum_pricing_billing_cycle";
  DROP TYPE "paradigm"."enum_pricing_locale";
  DROP TYPE "paradigm"."enum_pricing_status";
  DROP TYPE "paradigm"."enum__pricing_v_version_available_locales";
  DROP TYPE "paradigm"."enum__pricing_v_version_currency";
  DROP TYPE "paradigm"."enum__pricing_v_version_billing_cycle";
  DROP TYPE "paradigm"."enum__pricing_v_version_locale";
  DROP TYPE "paradigm"."enum__pricing_v_version_status";
  DROP TYPE "paradigm"."enum__pricing_v_published_locale";
  DROP TYPE "paradigm"."enum_leads_service_interest";
  DROP TYPE "paradigm"."enum_leads_pipeline_stage";
  DROP TYPE "paradigm"."enum_leads_locale";
  DROP TYPE "paradigm"."enum_audit_logs_action";
  DROP TYPE "paradigm"."enum_pages_blocks_hero_variant";
  DROP TYPE "paradigm"."enum_pages_blocks_section_alignment";
  DROP TYPE "paradigm"."enum_pages_blocks_section_background";
  DROP TYPE "paradigm"."enum_pages_blocks_card_grid_variant";
  DROP TYPE "paradigm"."enum_pages_blocks_card_grid_columns";
  DROP TYPE "paradigm"."enum_pages_blocks_cta_background";
  DROP TYPE "paradigm"."enum_pages_blocks_rich_text_max_width";
  DROP TYPE "paradigm"."enum_pages_blocks_stats_background";
  DROP TYPE "paradigm"."enum_pages_blocks_marquee_direction";
  DROP TYPE "paradigm"."enum_pages_blocks_marquee_speed";
  DROP TYPE "paradigm"."enum_pages_available_locales";
  DROP TYPE "paradigm"."enum_pages_locale";
  DROP TYPE "paradigm"."enum_pages_status";
  DROP TYPE "paradigm"."enum__pages_v_blocks_hero_variant";
  DROP TYPE "paradigm"."enum__pages_v_blocks_section_alignment";
  DROP TYPE "paradigm"."enum__pages_v_blocks_section_background";
  DROP TYPE "paradigm"."enum__pages_v_blocks_card_grid_variant";
  DROP TYPE "paradigm"."enum__pages_v_blocks_card_grid_columns";
  DROP TYPE "paradigm"."enum__pages_v_blocks_cta_background";
  DROP TYPE "paradigm"."enum__pages_v_blocks_rich_text_max_width";
  DROP TYPE "paradigm"."enum__pages_v_blocks_stats_background";
  DROP TYPE "paradigm"."enum__pages_v_blocks_marquee_direction";
  DROP TYPE "paradigm"."enum__pages_v_blocks_marquee_speed";
  DROP TYPE "paradigm"."enum__pages_v_version_available_locales";
  DROP TYPE "paradigm"."enum__pages_v_version_locale";
  DROP TYPE "paradigm"."enum__pages_v_version_status";
  DROP TYPE "paradigm"."enum__pages_v_published_locale";
  DROP TYPE "paradigm"."enum_settings_umami_by_locale_locale";
  DROP TYPE "paradigm"."enum_settings_calendar_by_locale_locale";`)
}
