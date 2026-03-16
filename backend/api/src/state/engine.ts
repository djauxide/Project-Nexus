/**
 * NEXUS State Engine
 * Single source of truth for all live production state.
 * Bridges hardware services → WebSocket clients.
 * Replaces simulated data with real device state when services are available.
 */
import { EventEmitter } from 'events';
import type { WebSocketManager } from '../websocket/manager';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MEState {
  id: string;
  pgm: number;
  pvw: number;
  inTransition: boolean;
  transProgress: number;
  transType: 'CUT' | 'MIX' | 'WIPE' | 'DIP';
  transRate: number;
}

export interface RouterCrosspoint {
  level: string;
  dst: string;
  src: string;
  locked: boolean;
}

export interface TallyState {
  source: number | string;
  pgm: boolean;
  pvw: boolean;
  bus: string;
}

export interface SourceInfo {
  id: string;
  label: string;
  shortLabel: string;
  type: 'camera' | 'replay' | 'graphics' | 'remote' | 'network' | 'test' | 'clean' | 'aux';
  format: string;
  active: boolean;
}

export interface SystemAlarm {
  id: string;
  severity: 'crit' | 'warn' | 'info' | 'ok';
  message: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface NexusState {
  me: MEState[];
  router: RouterCrosspoint[];
  tallies: TallyState[];
  sources: SourceInfo[];
  alarms: SystemAlarm[];
  ptpOffset: number;
  ptpLocked: boolean;
  timecode: string;
  frameRate: number;
}

// ── State Engine ──────────────────────────────────────────────────────────────

export class StateEngine extends EventEmitter {
  private state: NexusState;
  private wsManager: WebSocketManager;
  private _tcFrame = 0;
  private _tcSec = 0;
  private _tcMin = 0;
  private _tcHour = 10;
  private _tcInterval?: NodeJS.Timeout;
  private _ptpInterval?: NodeJS.Timeout;
  private _alarmSeq = 0;

  constructor(wsManager: WebSocketManager) {
    super();
    this.wsManager = wsManager;
    this.state = this._defaultState();
  }

  private _defaultState(): NexusState {
    return {
      frameRate: 25,
      timecode: '10:00:00:00',
      ptpOffset: 0,
      ptpLocked: true,
      me: [
        { id: 'ME-1', pgm: 1, pvw: 2, inTransition: false, transProgress: 0, transType: 'MIX', transRate: 25 },
        { id: 'ME-2', pgm: 3, pvw: 11, inTransition: false, transProgress: 0, transType: 'MIX', transRate: 25 },
        { id: 'ME-3', pgm: 21, pvw: 5, inTransition: false, transProgress: 0, transType: 'CUT', transRate: 25 },
      ],
      router: [],
      tallies: [],
      sources: this._defaultSources(),
      alarms: [],
    };
  }

  private _defaultSources(): SourceInfo[] {
    const cams = Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1), label: `CAM ${String(i + 1).padStart(2, '0')}`,
      shortLabel: `C${i + 1}`, type: 'camera' as const, format: '1080i50', active: true,
    }));
    const gfx = [
      { id: '9', label: 'GFX 01', shortLabel: 'G1', type: 'graphics' as const, format: 'RGBA', active: true },
      { id: '10', label: 'GFX 02', shortLabel: 'G2', type: 'graphics' as const, format: 'RGBA', active: true },
    ];
    const vtr = Array.from({ length: 3 }, (_, i) => ({
      id: String(11 + i), label: `VTR ${String(i + 1).padStart(2, '0')}`,
      shortLabel: `V${i + 1}`, type: 'replay' as const, format: '1080i50', active: true,
    }));
    const rem = Array.from({ length: 3 }, (_, i) => ({
      id: String(14 + i), label: `REM ${String(i + 1).padStart(2, '0')}`,
      shortLabel: `R${i + 1}`, type: 'remote' as const, format: 'H.264', active: i === 0,
    }));
    const test = [
      { id: '20', label: 'BARS', shortLabel: 'BAR', type: 'test' as const, format: 'SMPTE', active: true },
      { id: '21', label: 'BLACK', shortLabel: 'BLK', type: 'test' as const, format: 'BLK', active: true },
    ];
    return [...cams, ...gfx, ...vtr, ...rem, ...test];
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start(): void {
    this._startTimecode();
    this._startPTPSimulation();
    this._broadcastFullState();
    this.addAlarm('ok', 'NEXUS State Engine started', 'system');
  }

  stop(): void {
    if (this._tcInterval) clearInterval(this._tcInterval);
    if (this._ptpInterval) clearInterval(this._ptpInterval);
  }

  // ── Timecode ────────────────────────────────────────────────────────────────

  private _startTimecode(): void {
    this._tcInterval = setInterval(() => {
      this._tcFrame++;
      if (this._tcFrame >= this.state.frameRate) { this._tcFrame = 0; this._tcSec++; }
      if (this._tcSec >= 60) { this._tcSec = 0; this._tcMin++; }
      if (this._tcMin >= 60) { this._tcMin = 0; this._tcHour++; }
      const tc = `${p2(this._tcHour)}:${p2(this._tcMin)}:${p2(this._tcSec)}:${p2(this._tcFrame)}`;
      this.state.timecode = tc;
      this.wsManager.broadcast({ type: 'TC_UPDATE', timecode: tc });
    }, 1000 / this.state.frameRate);
  }

  private _startPTPSimulation(): void {
    this._ptpInterval = setInterval(() => {
      // Simulate realistic PTP jitter ±3ns
      this.state.ptpOffset = parseFloat((Math.random() * 6 - 3).toFixed(2));
      this.state.ptpLocked = Math.abs(this.state.ptpOffset) < 10;
      this.wsManager.broadcast({
        type: 'PTP_UPDATE',
        offset: this.state.ptpOffset,
        locked: this.state.ptpLocked,
      });
    }, 1000);
  }

  // ── Switcher operations ─────────────────────────────────────────────────────

  cut(meIndex: number, newPvw?: number): void {
    const me = this.state.me[meIndex];
    if (!me) throw new Error(`ME ${meIndex} not found`);
    const oldPgm = me.pgm;
    me.pgm = me.pvw;
    if (newPvw !== undefined) me.pvw = newPvw;
    this._updateTallies();
    this.wsManager.broadcast({
      type: 'SWITCHER_CUT',
      me: meIndex,
      pgm: me.pgm,
      pvw: me.pvw,
      oldPgm,
      timecode: this.state.timecode,
      timestamp: Date.now(),
    });
    this.addAlarm('info', `ME${meIndex + 1} CUT → ${me.pgm}`, 'switcher');
  }

  setPvw(meIndex: number, source: number): void {
    const me = this.state.me[meIndex];
    if (!me) throw new Error(`ME ${meIndex} not found`);
    me.pvw = source;
    this.wsManager.broadcast({
      type: 'SWITCHER_PVW',
      me: meIndex,
      pvw: source,
      timestamp: Date.now(),
    });
  }

  async autoTransition(meIndex: number): Promise<void> {
    const me = this.state.me[meIndex];
    if (!me || me.inTransition) return;
    me.inTransition = true;
    me.transProgress = 0;
    const steps = me.transRate;
    const stepMs = 1000 / this.state.frameRate;
    for (let i = 0; i <= steps; i++) {
      me.transProgress = i / steps;
      this.wsManager.broadcast({
        type: 'SWITCHER_TRANS_PROGRESS',
        me: meIndex,
        progress: me.transProgress,
      });
      await sleep(stepMs);
    }
    me.inTransition = false;
    me.transProgress = 0;
    this.cut(meIndex);
  }

  // ── Router operations ───────────────────────────────────────────────────────

  route(level: string, dst: string, src: string): void {
    const existing = this.state.router.find(r => r.level === level && r.dst === dst);
    if (existing) {
      existing.src = src;
    } else {
      this.state.router.push({ level, dst, src, locked: false });
    }
    this._updateTallies();
    this.wsManager.broadcast({
      type: 'ROUTER_ROUTE',
      level, dst, src,
      timecode: this.state.timecode,
      timestamp: Date.now(),
    });
    this.addAlarm('info', `ROUTE [${level}] ${src} → ${dst}`, 'router');
  }

  lockRoute(level: string, dst: string, locked: boolean): void {
    const r = this.state.router.find(r => r.level === level && r.dst === dst);
    if (r) r.locked = locked;
    this.wsManager.broadcast({ type: 'ROUTER_LOCK', level, dst, locked });
  }

  // ── Tally ───────────────────────────────────────────────────────────────────

  private _updateTallies(): void {
    const tallies: TallyState[] = [];
    for (const me of this.state.me) {
      tallies.push({ source: me.pgm, pgm: true, pvw: false, bus: me.id });
      tallies.push({ source: me.pvw, pgm: false, pvw: true, bus: me.id });
    }
    this.state.tallies = tallies;
    this.wsManager.broadcast({ type: 'TALLY_UPDATE', tallies, timestamp: Date.now() });
  }

  // ── Alarms ──────────────────────────────────────────────────────────────────

  addAlarm(severity: SystemAlarm['severity'], message: string, source: string): void {
    const alarm: SystemAlarm = {
      id: `alm-${++this._alarmSeq}`,
      severity, message, source,
      timestamp: Date.now(),
      acknowledged: false,
    };
    this.state.alarms.unshift(alarm);
    if (this.state.alarms.length > 500) this.state.alarms.pop();
    this.wsManager.broadcast({ type: 'ALARM', alarm });
  }

  acknowledgeAlarm(id: string): void {
    const alarm = this.state.alarms.find(a => a.id === id);
    if (alarm) alarm.acknowledged = true;
    this.wsManager.broadcast({ type: 'ALARM_ACK', id });
  }

  // ── State access ────────────────────────────────────────────────────────────

  getState(): NexusState { return this.state; }
  getME(index: number): MEState | undefined { return this.state.me[index]; }
  getSources(): SourceInfo[] { return this.state.sources; }
  getAlarms(): SystemAlarm[] { return this.state.alarms; }

  private _broadcastFullState(): void {
    this.wsManager.broadcast({ type: 'FULL_STATE', state: this.state, timestamp: Date.now() });
  }

  broadcastFullState(): void { this._broadcastFullState(); }

  // ── Hardware sync ────────────────────────────────────────────────────────────
  // Called by hardware adapters (ATEM, Ember+) when real device state changes

  syncFromATEM(meIndex: number, pgm: number, pvw: number): void {
    const me = this.state.me[meIndex];
    if (!me) return;
    const changed = me.pgm !== pgm || me.pvw !== pvw;
    me.pgm = pgm;
    me.pvw = pvw;
    if (changed) {
      this._updateTallies();
      this.wsManager.broadcast({
        type: 'SWITCHER_SYNC',
        source: 'atem',
        me: meIndex,
        pgm, pvw,
        timestamp: Date.now(),
      });
    }
  }

  syncFromEmber(path: string, value: unknown): void {
    this.wsManager.broadcast({
      type: 'EMBER_SYNC',
      path, value,
      timestamp: Date.now(),
    });
  }

  syncFromNMOS(event: string, data: unknown): void {
    this.wsManager.broadcast({
      type: 'NMOS_EVENT',
      event, data,
      timestamp: Date.now(),
    });
  }
}

function p2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
