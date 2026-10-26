CREATE TABLE users (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
 display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash BYTEA PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
ALTER TABLE problems
 ADD COLUMN topic TEXT NOT NULL DEFAULT '',
 ADD COLUMN examples JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(examples) = 'array'),
 ADD COLUMN constraints JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(constraints) = 'array'),
 ADD COLUMN starter TEXT NOT NULL DEFAULT '',
 ADD COLUMN function_name TEXT NOT NULL DEFAULT '',
 ADD COLUMN created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE TABLE user_problems (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
 bookmarked BOOLEAN NOT NULL DEFAULT false,
 status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, problem_id)
);
