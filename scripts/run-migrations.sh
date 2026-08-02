docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_001_cms_tables.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_002_seed_data.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_003_sales_hub.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_004_sales_hub_reconcile.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_005_paradigm_dedicated_schema.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_006_company_dedup.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_007_rls_paradigm.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_008_sales_country_locale_templates.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_009_sales_stack_integrations.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_010_legacy_cleanup.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_011_legacy_settings_cleanup.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_012_emergency_io_throttle.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_013_restore_cron_after_io_recovery.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_014_infrastructure_migration.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_015_sales_enrichment_jobs.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_016_sales_report_assets_sources.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_017_sales_twenty_karte_sync.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_018_sales_products_opportunity_sync.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_019_sales_twenty_home_sync.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_020_sales_cal_docuseal_webhooks.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_021_sales_completion_pass.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_022_sales_content_templates.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_023_sales_agent_team.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_024_sales_integration_status.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_025_sales_runtime_hardening.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_026_sales_video_pipeline.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_027_sales_video_segments_loss_guard.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_028_sales_video_production_profiles_r2.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_029_sales_crm_field_master.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_030_sales_source_tech_metrics.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_031_sales_monthly_lead_batches.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_032_sales_searxng_search_runs.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_033_sales_japan_readiness_insights.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_034_sales_post_outreach_tools.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_035_sales_external_studio_sync.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_036_sales_os_pipeline.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_037_sales_pipeline_outreach_links.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_038_sales_ai_prompts.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_039_sales_ai_prompts_auth_and_defaults.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_040_sales_trigger_dev_tool_slug.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_041_sales_video_trigger_columns.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_042_sales_template_seed.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_043_sales_dx_ai_template_variant.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_044_abolish_pg_cron_event_driven.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260712221723_sales_japan_entry_projections.sql  # original: supabase/migrations/20260712221723_sales_japan_entry_projections.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260712233619_demo_quality_gate.sql  # original: supabase/migrations/20260712233619_demo_quality_gate.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_044b_sales_ssot_hub.sql  # original: supabase/migrations/migration_044_sales_ssot_hub.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_045b_sales_error_log.sql  # original: supabase/migrations/migration_045_sales_error_log.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_046b_sales_companies_meta_normalization.sql  # original: supabase/migrations/migration_046_sales_companies_meta_normalization.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_047b_sales_lead_candidate_acquisition.sql  # original: supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_048b_sales_lead_candidate_runs.sql  # original: supabase/migrations/migration_048_sales_lead_candidate_runs.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_049b_sales_passive_inventory.sql  # original: supabase/migrations/migration_049_sales_passive_inventory.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_050b_sales_passive_inventory_segments.sql  # original: supabase/migrations/migration_050_sales_passive_inventory_segments.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_070_demo_contact_hardening.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_071_public_surface_rls_and_constraints.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/migration_072_public_japan_entry_checks.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260713203000_japan_entry_report_factory.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260713220000_demo_clean_urls_and_factory.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260714143000_form_qualified_lead_factory.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260714231500_lead_factory_schema_reconcile.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260714234500_initial_form_draft_factory.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260715082148_high_quality_lead_sources.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260715093000_lead_factory_operator_approval.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260801213954_pet_life_movie_mvp.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802020742_pet_life_movie_market_ready.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802201649_pet_life_movie_global_growth.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802210000_pet_life_movie_commercial_quality.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260801224308_sales_japan_operator_cases.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260801235327_sales_japan_operator_case_hardening.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802015455_japan_operator_operations_os.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802015712_japan_operator_commercial_os.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802015715_japan_operator_delivery_os.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802132000_video_growth_direct_acquisition.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802190000_video_growth_commercial_schema.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802190100_video_growth_commercial_intake.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802190200_video_growth_commercial_quality.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802190300_video_growth_commercial_guards.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802203000_video_factory_studio_scale_readiness.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260801231006_content_commerce.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802043347_foreign_investor_pseo.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802123000_investor_metro_payload_builder.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802123100_tokyo_metro_investor_briefs.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802123200_greater_tokyo_ring_investor_briefs.sql
docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/20260802123300_investor_metro_payload_builder_cleanup.sql
