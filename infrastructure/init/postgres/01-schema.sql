-- NEXUS v4 Database Schema

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('VIEWER','OPERATOR','ENGINEER','TRAINER')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS switcher_events (
  id          BIGSERIAL PRIMARY KEY,
  me_bank     INT NOT NULL,
  old_pgm     INT NOT NULL,
  new_pgm     INT NOT NULL,
  new_pvw     INT NOT NULL,
  operator_id UUID REFERENCES users(id),
  latency_us  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nmos_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       TEXT NOT NULL,
  receiver_id     TEXT NOT NULL,
  multicast_group TEXT,
  port            INT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS recordings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  format      TEXT NOT NULL,
  duration_s  INT,
  size_bytes  BIGINT,
  s3_key      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predeploy_checklist (
  id          BIGSERIAL PRIMARY KEY,
  phase       INT NOT NULL,
  item        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending','pass','fail','skip')),
  operator_id UUID REFERENCES users(id),
  notes       TEXT,
  checked_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_switcher_events_created ON switcher_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nmos_connections_active ON nmos_connections(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recordings_created ON recordings(created_at DESC);

-- Seed demo user
INSERT INTO users (username, role) VALUES ('demo-engineer', 'ENGINEER') ON CONFLICT DO NOTHING;
