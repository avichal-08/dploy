ALTER TABLE projects ADD COLUMN custom_domain VARCHAR(255);

CREATE UNIQUE INDEX idx_custom_domain ON projects (custom_domain) WHERE custom_domain IS NOT NULL;
