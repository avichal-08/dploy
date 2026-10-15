ALTER TABLE projects ADD COLUMN webhook_secret VARCHAR(64) NOT NULL DEFAULT '';

UPDATE projects
SET webhook_secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE webhook_secret = '';
