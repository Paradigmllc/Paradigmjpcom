-- Cal.com / Docuseal webhook hardening.
-- Existing tables already have RLS and service_role policies from migration_004.

DROP INDEX IF EXISTS idx_sales_contracts_docuseal_submission;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_contracts_docuseal_submission
  ON sales_contracts (docusign_envelope_id);

COMMENT ON COLUMN sales_contracts.docusign_envelope_id IS
  'External e-signature submission/envelope id. Used by Docuseal OSS webhooks as docuseal_submission_id.';
