DROP INDEX IF EXISTS idx_custom_domain;

ALTER TABLE projects DROP COLUMN IF EXISTS custom_domain;
