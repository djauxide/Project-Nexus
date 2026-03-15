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
