export type Role = 'VIEWER' | 'OPERATOR' | 'ENGINEER' | 'TRAINER';
export type Mode = 'LIVE' | 'DEMO' | 'TRAINING';
export type TransitionType = 'CUT' | 'MIX' | 'WIPE' | 'DIP' | 'STING';

export interface JwtPayload {
  userId: string;
  role: Role;
  iss: string;
  exp: number;
}

export interface SwitcherState {
  pgm: number;
  pvw: number;
  transition: TransitionType;
  rate: number;
  inTransition: boolean;
  meBank: number;
}

export interface TallyUpdate {
  type: 'TALLY_UPDATE';
  pgm: number;
  pvw: number;
  source: string;
  timestamp: number;
}

export interface PTPStatus {
  offset: number;
  locked: boolean;
  grandmasterId: string;
  domain: number;
  clockClass: number;
}

export interface FlowStatus {
  flowId: string;
  sourceIp: string;
  destIp: string;
  format: string;
  bitrateMbps: number;
  droppedPackets: number;
  ptpOffset: number;
  active: boolean;
}

export interface WsMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// ── Cerebrum BCS types ────────────────────────────────────────────────────

export type TallyState = 'pgm' | 'pvw' | 'off';
export type AlarmSeverity = 'crit' | 'warn' | 'info' | 'ok';
export type DeviceProtocol = 'ember' | 'nmos' | 'gvg' | 'probel' | 'sony9' | 'bvs';
export type RouterLevel = 'V' | 'A' | 'D' | 'AES' | 'EMB';

export interface RouterRoute {
  level: RouterLevel;
  dst: string;
  src: string;
  locked: boolean;
  protected: boolean;
}

export interface TallyEntry {
  source: string;
  state: TallyState;
  bus: string;
  umdLabel: string;
}

export interface CerebrumDevice {
  name: string;
  type: string;
  protocol: DeviceProtocol;
  address: string;
  status: 'ok' | 'warn' | 'err' | 'off';
  info: string;
}

export interface Macro {
  id: string;
  name: string;
  steps: number;
  type: 'salvo' | 'macro';
}

export interface AlarmEntry {
  id: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface CerebrumState {
  routes: RouterRoute[];
  tallies: TallyEntry[];
  devices: CerebrumDevice[];
  macros: Macro[];
  alarms: AlarmEntry[];
  automationMode: 'manual' | 'semi' | 'full';
}
