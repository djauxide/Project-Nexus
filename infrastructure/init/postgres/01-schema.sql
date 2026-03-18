-- NEXUS Production Database Schema v2
-- Full production schema for broadcast orchestration platform

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users & Auth ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('VIEWER','OPERATOR','ENGINEER','TRAINER')),
  display_name  TEXT,
  email         TEXT UNIQUE,
  active        BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ── Audit Log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  payload       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ── Switcher Events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS switcher_events (
  BIGSERIAL PRIMARY KEY,
  me_bank       INT NOT NULL,
  old_pgm       INT NOT NULL,
ll cameras to ME1 sources', 'salvo',
   '[{"action":"route","level":"V","dst":"ME1-PGM","src":"CAM01"}]', 'routing')
ON CONFLICT DO NOTHING;
kHxKuqSm', 'VIEWER',   'Read Only',    'viewer@nexus.local')
ON CONFLICT (username) DO NOTHING;

-- Default macros
INSERT INTO macros (name, description, type, steps, category) VALUES
  ('BREAK TO BARS', 'Cut to colour bars and mute audio', 'macro',
   '[{"action":"cut","me":0,"src":20},{"action":"audio_mute","bus":"pgm"}]', 'emergency'),
  ('SHOW OPEN', 'Standard show open sequence', 'sequence',
   '[{"action":"fade_up","duration":25},{"action":"gfx_take","id":"lower-third-01"}]', 'show'),
  ('SALVO A', 'Route ae, password_hash, role, display_name, email) VALUES
  ('engineer',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RkHxKuqSm', 'ENGINEER', 'Lead Engineer', 'engineer@nexus.local'),
  ('operator',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RkHxKuqSm', 'OPERATOR', 'Vision Mixer', 'operator@nexus.local'),
  ('trainer',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RkHxKuqSm', 'TRAINER',  'Training Lead', 'trainer@nexus.local'),
  ('viewer',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/R───────

CREATE TABLE IF NOT EXISTS predeploy_checklist (
  id            BIGSERIAL PRIMARY KEY,
  phase         INT NOT NULL,
  item          TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','pass','fail','skip')),
  operator_id   UUID REFERENCES users(id),
  notes         TEXT,
  checked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed Data ─────────────────────────────────────────────────────────────────

-- Default users (passwords are bcrypt hashes of 'nexus2024')
INSERT INTO users (usernam───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ptp_metrics (
  id              BIGSERIAL PRIMARY KEY,
  offset_ns       NUMERIC(12,3),
  path_delay_ns   NUMERIC(12,3),
  locked          BOOLEAN,
  grandmaster_id  TEXT,
  clock_class     INT,
  domain          INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptp_created ON ptp_metrics(created_at DESC);

-- ── Pre-deploy Checklist ───────────────────────────────────────────────ings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recordings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  format        TEXT NOT NULL,
  duration_s    INT,
  size_bytes    BIGINT,
  s3_key        TEXT,
  source        TEXT,
  operator_id   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_created ON recordings(created_at DESC);

-- ── PTP Metrics ────XT NOT NULL,
  status        TEXT DEFAULT 'offline' CHECK (status IN ('connected','degraded','offline','standby')),
  latency_ms    INT DEFAULT 0,
  bitrate_mbps  NUMERIC(10,2) DEFAULT 0,
  config        JSONB DEFAULT '{}',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_links_status ON cloud_links(status);
CREATE INDEX IF NOT EXISTS idx_cloud_links_region ON cloud_links(region);

-- ── Record
CREATE INDEX IF NOT EXISTS idx_rack_devices_location ON rack_devices(location);

-- ── Cloud Links ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cloud_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id       TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  src           TEXT NOT NULL,
  dst           TEXT NOT NULL,
  protocol      TEXT NOT NULL CHECK (protocol IN ('SRT','RIST','NDI','RTMP','ST2110-GW','MediaConnect')),
  region        TE    TEXT NOT NULL,
  label         TEXT NOT NULL,
  location      TEXT DEFAULT 'ground' CHECK (location IN ('ground','cloud')),
  region        TEXT,
  status        TEXT DEFAULT 'ok' CHECK (status IN ('ok','warn','err','off')),
  protocol      TEXT,
  ip_address    INET,
  port          INT,
  info          TEXT,
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rack_devices_type ON rack_devices(type);NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rundown_cues_rundown ON rundown_cues(rundown_id, position);
CREATE INDEX IF NOT EXISTS idx_rundowns_date ON rundowns(show_date DESC);

-- ── Rack Devices ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rack_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       TEXT UNIQUE NOT NULL,
  unit          INT NOT NULL,
  height        INT DEFAULT 1,
  type      RENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT  DEFAULT 'ready' CHECK (status IN ('ready','on-air','done','skip')),
  source        TEXT,
  notes         TEXT,
  auto_take     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rundowns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  show_date     DATE,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','locked','archived')),
  created_by    UUID REFEON macros(type);
CREATE INDEX IF NOT EXISTS idx_macros_active ON macros(active);

-- ── Rundown Cues ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rundown_cues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rundown_id    UUID NOT NULL,
  position      INT NOT NULL,
  title         TEXT NOT NULL,
  slug          TEXT,
  duration_s    INT,
  type          TEXT DEFAULT 'live' CHECK (type IN ('live','vtr','gfx','remote','break','note')),
  status        TEXTMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT DEFAULT 'macro' CHECK (type IN ('macro','salvo','sequence')),
  steps         JSONB NOT NULL DEFAULT '[]',
  category      TEXT,
  created_by    UUID REFERENCES users(id),
  active        BOOLEAN DEFAULT TRUE,
  run_count     INT DEFAULT 0,
  last_run      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_macros_type cknowledged_at TIMESTAMPTZ,
  resolved        BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarms_severity ON alarms(severity);
CREATE INDEX IF NOT EXISTS idx_alarms_active ON alarms(acknowledged, resolved);
CREATE INDEX IF NOT EXISTS idx_alarms_created ON alarms(created_at DESC);

-- ── Macros ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS macros (
  id            UUID PRIe);
CREATE INDEX IF NOT EXISTS idx_nmos_flows_format ON nmos_flows(format);

-- ── Alarms ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alarms (
  id              BIGSERIAL PRIMARY KEY,
  alarm_id        TEXT UNIQUE NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('crit','warn','info','ok')),
  message         TEXT NOT NULL,
  source          TEXT NOT NULL,
  acknowledged    BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  aFAULT gen_random_uuid(),
  flow_id       TEXT UNIQUE NOT NULL,
  label         TEXT,
  source_id     TEXT,
  node_id       TEXT,
  device_id     TEXT,
  format        TEXT,
  frame_rate    TEXT,
  colorspace    TEXT,
  interlace     BOOLEAN DEFAULT FALSE,
  bit_depth     INT,
  sample_rate   INT,
  channel_count INT,
  active        BOOLEAN DEFAULT TRUE,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nmos_flows_active ON nmos_flows(activ  UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nmos_active ON nmos_connections(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_nmos_sender ON nmos_connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_nmos_receiver ON nmos_connections(receiver_id);

-- ── NMOS Flows ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nmos_flows (
  id            UUID PRIMARY KEY DECREATE INDEX IF NOT EXISTS idx_router_created ON router_crosspoints(created_at DESC);

-- ── NMOS Connections ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nmos_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       TEXT NOT NULL,
  receiver_id     TEXT NOT NULL,
  sender_label    TEXT,
  receiver_label  TEXT,
  multicast_group TEXT,
  port            INT,
  sdp             TEXT,
  active          BOOLEAN DEFAULT TRUE,
  operator_id   _router_level ON router_crosspoints(level);
vel, destination)
);

CREATE INDEX IF NOT EXISTS idx_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(le TEXT,
  created users(id),
  timecode     UID REFERENCESe        TEXT NOT NULL,
  locked        BOOLEAN DEFAULT FALSE,
  protected     BOOLEAN DEFAULT FALSE,
  lock_owner    UUID REFERENCES users(id),
  operator_id   U TEXT NOT NULL,
  sourc level         TEXT NOT NULL,
  destination         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 (
  id     rosspoints CREATE TABLE IF NOT EXISTS router_c───────────────────────

witcher_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_switcher_events_me ON switcher_events(me_bank);

-- ── Router Crosspoints ─────────────────────────────────INDEX IF NOT EXISTS idx_switcher_events_created ON sed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE T,
  timecode      TEXT,
  creatEFAULT 25,
  operator_id   UUID REFERENCES users(id),
  latency_us    IN  trans_type    TEXT DEFAULT 'CUT',
  trans_rate    INT D  new_pgm       INT NOT NULL,
  new_pvw       INT NOT NULL,
