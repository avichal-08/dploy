DELETE FROM users;

ALTER TABLE users ADD COLUMN github_id VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

ALTER TABLE users DROP COLUMN IF EXISTS password;
