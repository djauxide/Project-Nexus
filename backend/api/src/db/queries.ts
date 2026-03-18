import { query, queryOne } from './pool';
import bcrypt from 'bcrypt';

// ── User queries ──────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  display_name: string | null;
  email: string | null;
  active: boolean;
  last_login: Date | null;
}

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  return queryOne<DbUser>(
    'SELECT * FROM users WHERE username = $1 AND active = TRUE',
    [username]
  );
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Support plain 'nexus2024' for demo mode when hash is empty
  if (!hash) return plain === 'nexus2024';
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return plain === hash; // fallback for plain-text stored passwords
  }
}

// ── Session queries ───────────────────────────────────────────────────────────

export async function createSession(
  userId: string, tokenHash: string, ipAddress: string, userAgent: string
): Promise<void> {
  await query(
    `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '8 hours')`,
    [userId, tokenHash, ipAddress, userAgent]
  );
}

export async function invalidateSession(tokenHash: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function cleanExpiredSessions(): Promise<void> {
  await query('DELETE FROM sessions WHERE expires_at < NOW()');
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function logAudit(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string,
  payload?: unknown,
  ipAddress?: string
): Promise<void> {
  await query(
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, payload, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, resourceType, resourceId ?? null, payload ? JSON.stringify(payload) : null, ipAddress ?? null]
  );
}

// ── Switcher events ───────────────────────────────────────────────────────────

export async function logSwitcherEvent(
  meBank: number, oldPgm: number, newPgm: number, newPvw: number,
  transType: string, operatorId: string | null, latencyUs: number, timecode: string
): Promise<void> {
  await query(
    `INSERT INTO switcher_events (me_bank, old_pgm, new_pgm, new_pvw, trans_type, operator_id, latency_us, timecode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [meBank, oldPgm, newPgm, newPvw, transType, operatorId, latencyUs, timecode]
  );
}

export async function getSwitcherHistory(limit = 100): Promise<unknown[]> {
  return query(
    `SELECT se.*, u.username FROM switcher_events se
     LEFT JOIN users u ON se.operator_id = u.id
     ORDER BY se.created_at DESC LIMIT $1`,
    [limit]
  );
}

// ── Router crosspoints ────────────────────────────────────────────────────────

export async function upsertCrosspoint(
  level: string, destination: string, source: string, operatorId: string | null, timecode: string
): Promise<void> {
  await query(
    `INSERT INTO router_crosspoints (level, destination, source, operator_id, timecode)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (level, destination) DO UPDATE
     SET source = $3, operator_id = $4, timecode = $5, created_at = NOW()`,
    [level, destination, source, operatorId, timecode]
  );
}

export async function getCrosspoints(level?: string): Promise<unknown[]> {
  if (level) {
    return query('SELECT * FROM router_crosspoints WHERE level = $1 ORDER BY destination', [level]);
  }
  return query('SELECT * FROM router_crosspoints ORDER BY level, destination');
}

export async function lockCrosspoint(level: string, destination: string, locked: boolean, userId: string | null): Promise<void> {
  await query(
    'UPDATE router_crosspoints SET locked = $1, lock_owner = $2 WHERE level = $3 AND destination = $4',
    [locked, locked ? userId : null, level, destination]
  );
}

// ── Alarms ────────────────────────────────────────────────────────────────────

export async function upsertAlarm(
  alarmId: string, severity: string, message: string, source: string
): Promise<void> {
  await query(
    `INSERT INTO alarms (alarm_id, severity, message, source)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (alarm_id) DO UPDATE SET severity = $2, message = $3, resolved = FALSE, resolved_at = NULL`,
    [alarmId, severity, message, source]
  );
}

export async function acknowledgeAlarm(alarmId: string, userId: string | null): Promise<void> {
  await query(
    'UPDATE alarms SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW() WHERE alarm_id = $2',
    [userId, alarmId]
  );
}

export async function getActiveAlarms(): Promise<unknown[]> {
  return query(
    'SELECT * FROM alarms WHERE resolved = FALSE ORDER BY created_at DESC LIMIT 200'
  );
}

// ── Macros ────────────────────────────────────────────────────────────────────

export async function getMacros(): Promise<unknown[]> {
  return query('SELECT * FROM macros WHERE active = TRUE ORDER BY category, name');
}

export async function recordMacroRun(macroId: string): Promise<void> {
  await query(
    'UPDATE macros SET run_count = run_count + 1, last_run = NOW() WHERE id = $1',
    [macroId]
  );
}

// ── Rack devices ──────────────────────────────────────────────────────────────

export async function getRackDevices(): Promise<unknown[]> {
  return query('SELECT * FROM rack_devices ORDER BY unit');
}

export async function upsertRackDevice(device: {
  slot_id: string; unit: number; height: number; type: string; label: string;
  location: string; region?: string; status: string; protocol?: string;
  ip_address?: string; port?: number; info?: string; config?: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO rack_devices (slot_id, unit, height, type, label, location, region, status, protocol, ip_address, port, info, config)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (slot_id) DO UPDATE
     SET unit=$2, height=$3, type=$4, label=$5, location=$6, region=$7, status=$8,
         protocol=$9, ip_address=$10, port=$11, info=$12, config=$13, updated_at=NOW()`,
    [device.slot_id, device.unit, device.height, device.type, device.label,
     device.location, device.region ?? null, device.status, device.protocol ?? null,
     device.ip_address ?? null, device.port ?? null, device.info ?? null,
     device.config ? JSON.stringify(device.config) : '{}']
  );
}

export async function deleteRackDevice(slotId: string): Promise<void> {
  await query('DELETE FROM rack_devices WHERE slot_id = $1', [slotId]);
}

// ── Cloud links ───────────────────────────────────────────────────────────────

export async function getCloudLinks(): Promise<unknown[]> {
  return query('SELECT * FROM cloud_links ORDER BY created_at DESC');
}

export async function updateCloudLinkStatus(linkId: string, status: string, latencyMs: number, bitrateMbps: number): Promise<void> {
  await query(
    'UPDATE cloud_links SET status=$1, latency_ms=$2, bitrate_mbps=$3, updated_at=NOW() WHERE link_id=$4',
    [status, latencyMs, bitrateMbps, linkId]
  );
}

// ── Rundowns ──────────────────────────────────────────────────────────────────

export async function getRundowns(): Promise<unknown[]> {
  return query('SELECT * FROM rundowns ORDER BY show_date DESC LIMIT 50');
}

export async function getRundownCues(rundownId: string): Promise<unknown[]> {
  return query('SELECT * FROM rundown_cues WHERE rundown_id = $1 ORDER BY position', [rundownId]);
}

// ── PTP metrics ───────────────────────────────────────────────────────────────

export async function logPTPMetric(offsetNs: number, locked: boolean, grandmasterId: string): Promise<void> {
  await query(
    'INSERT INTO ptp_metrics (offset_ns, locked, grandmaster_id) VALUES ($1, $2, $3)',
    [offsetNs, locked, grandmasterId]
  );
}

export async function getPTPHistory(minutes = 5): Promise<unknown[]> {
  return query(
    `SELECT * FROM ptp_metrics WHERE created_at > NOW() - INTERVAL '${minutes} minutes' ORDER BY created_at DESC LIMIT 300`
  );
}
