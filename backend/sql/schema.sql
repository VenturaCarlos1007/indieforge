-- ============================================================
-- IndieForge — Full Database Schema
-- PostgreSQL · All PKs use UUID (gen_random_uuid)
-- ============================================================

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- 1. users
-- ──────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ──────────────────────────────────────────────
-- 2. projects
-- ──────────────────────────────────────────────
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150)  NOT NULL,
  description TEXT,
  owner_id    UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  engine      VARCHAR(20)   NOT NULL DEFAULT 'custom',
  is_public   BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects (owner_id);

-- ──────────────────────────────────────────────
-- 3. project_members
-- ──────────────────────────────────────────────
CREATE TABLE project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL DEFAULT 'member',   -- owner | admin | member | viewer
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members (project_id);
CREATE INDEX idx_pm_user    ON project_members (user_id);

-- ──────────────────────────────────────────────
-- 4. folders (self-referencing for nesting)
-- ──────────────────────────────────────────────
CREATE TABLE folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  parent_id  UUID                  REFERENCES folders  (id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL
);

CREATE INDEX idx_folders_project ON folders (project_id);
CREATE INDEX idx_folders_parent  ON folders (parent_id);

-- ──────────────────────────────────────────────
-- 5. assets
-- ──────────────────────────────────────────────
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  folder_id       UUID                  REFERENCES folders  (id) ON DELETE SET NULL,
  uploaded_by     UUID         NOT NULL REFERENCES users    (id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50)  NOT NULL,   -- image | audio | model | document | other
  current_version INT          NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_project ON assets (project_id);
CREATE INDEX idx_assets_folder  ON assets (folder_id);

-- ──────────────────────────────────────────────
-- 6. asset_versions
-- ──────────────────────────────────────────────
CREATE TABLE asset_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID         NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  uploaded_by    UUID         NOT NULL REFERENCES users  (id) ON DELETE SET NULL,
  version_number INT          NOT NULL,
  storage_url    TEXT         NOT NULL,
  size_bytes     BIGINT       DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (asset_id, version_number)
);

CREATE INDEX idx_av_asset ON asset_versions (asset_id);

-- ──────────────────────────────────────────────
-- 7. tasks
-- ──────────────────────────────────────────────
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(30)  NOT NULL DEFAULT 'pending',  -- pending | in_progress | review | done
  priority    VARCHAR(10)  DEFAULT 'medium',
  due_date    TIMESTAMPTZ,
  created_by  UUID         NOT NULL REFERENCES users    (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_status  ON tasks (status);

-- ──────────────────────────────────────────────
-- 8. task_assignments
-- ──────────────────────────────────────────────
CREATE TABLE task_assignments (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_ta_task ON task_assignments (task_id);
CREATE INDEX idx_ta_user ON task_assignments (user_id);

-- ──────────────────────────────────────────────
-- 9. comments (threaded via parent_id)
-- ──────────────────────────────────────────────
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id   UUID        NOT NULL REFERENCES assets   (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  parent_id  UUID                 REFERENCES comments (id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  resolved   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_asset  ON comments (asset_id);
CREATE INDEX idx_comments_parent ON comments (parent_id);

-- ──────────────────────────────────────────────
-- 10. activity_feed
-- ──────────────────────────────────────────────
CREATE TABLE activity_feed (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  action        VARCHAR(50) NOT NULL,   -- created | updated | deleted | uploaded | commented | assigned
  resource_type VARCHAR(50) NOT NULL,   -- project | asset | task | comment | folder
  resource_id   UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_af_project    ON activity_feed (project_id);
CREATE INDEX idx_af_created_at ON activity_feed (created_at DESC);

-- ──────────────────────────────────────────────
-- 11. notifications
-- ──────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID        REFERENCES projects(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  data       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications (user_id);
CREATE INDEX idx_notif_read ON notifications (read);

-- ──────────────────────────────────────────────
-- 12. join_requests
-- ──────────────────────────────────────────────
CREATE TABLE join_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id)    ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'pendiente'
               CHECK (status IN ('pendiente', 'aceptado', 'rechazado')),
  message    TEXT,
  created_at TIMESTAMP   DEFAULT NOW(),
  updated_at TIMESTAMP   DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_join_requests_project ON join_requests(project_id);
CREATE INDEX idx_join_requests_user    ON join_requests(user_id, status);

