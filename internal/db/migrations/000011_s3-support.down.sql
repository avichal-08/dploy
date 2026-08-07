ALTER TABLE deployments
DROP COLUMN IF EXISTS storage_prefix;

ALTER TABLE projects
DROP COLUMN IF EXISTS output_dir,
DROP COLUMN IF EXISTS project_type;
