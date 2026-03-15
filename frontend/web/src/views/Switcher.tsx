import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../contexts/AuthContext';
import type { RouterLevel, TallyState, DeviceProtocol, AlarmSeverity } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────

type TransitionType = 'CUT' | 'MIX' | 'WIPE' | 'DIP' | 'STING';
type SwitcherTab = 'me' | 'router' | 'tally' | 'devices' | 'macros' | 'alarms';

interface MEState {
  pgm: number; pvw: number; transition: TransitionType;
  rate: number; inTransition: boolean; progress: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

const TRANSITIONS: TransitionType[] = ['CUT', 'MIX', 'WIPE', 'DIP', 'STING'];
const ROUTER_LEVELS: RouterLevel[] = ['V', 'A', 'D', 'AES', 'EMB'];
const LEVEL_LABELS: Record<RouterLevel, string> = { V:'VIDEO', A:'AUDIO', D:'DATA', AES:'AES67', EMB:'EMBEDDED' };
const DEV_PROTOCOLS: DeviceProtocol[] = ['ember','nmos','gvg','probel','sony9','bvs'];
const PROTO_LABELS: Record<DeviceProtocol, string> = {
  ember:'Ember+', nmos:'NMOS IS-04', gvg:'GVG 7600', probel:'Probel SW-P-08', sony9:'Sony 9-pin', bvs:'BVS',
};

const SOURCES = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  name: i < 24 ? `CAM-${String(i+1).padStart(2,'0')}`
      : i < 29 ? `REPLAY-0${i-23}`
      : (['PGM','PVW','GFX'] as string[])[i-29] ?? `SRC-${i+1}`,
}));

const ML_SRCS = ['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08',
                 'REPLAY-01','REPLAY-02','GFX-01','GFX-02','PGM-OUT','PVW-OUT','AUX-01','AUX-02'];
const ML_DSTS = ['MON-01','MON-02','MON-03','MON-04','TX-OUT','RECORD',
                 'STREAM','MULTIVIEW','AUX-OUT-1','AUX-OUT-2','CONF-1','CONF-2'];

const SEED_DEVICES: Record<DeviceProtocol, Array<{name:string;type:string;address:string;status:'ok'|'warn'|'err';info:string}>> = {
  ember:  [
    {name:'LAWO MC2-56',      type:'Audio Console',address:'192.168.1.10',status:'ok',  info:'Online — 96ch'},
    {name:'LAWO A__UHD Core', type:'Audio Engine', address:'192.168.1.11',status:'ok',  info:'Online — 256ch'},
    {name:'Calrec Apollo',    type:'Audio Console',address:'192.168.1.12',status:'warn',info:'Latency 45ms'},
    {name:'Nevion VideoIPath',type:'Router',        address:'192.168.1.20',status:'ok',  info:'256x256 sync'},
  ],
  nmos:   [
    {name:'Sony HDC-5500',       type:'Camera',     address:'192.168.2.10',status:'ok',info:'IS-04 v1.3'},
    {name:'GV LDX 150',          type:'Camera',     address:'192.168.2.11',status:'ok',info:'IS-04 v1.3'},
    {name:'Evertz 7800',         type:'Multiviewer',address:'192.168.2.20',status:'ok',info:'IS-05 v1.1'},
  ],
  gvg:    [
    {name:'GVG Kayenne',type:'Switcher',address:'192.168.3.10',status:'ok',info:'Connected'},
    {name:'GVG Korona', type:'Switcher',address:'192.168.3.11',status:'ok',info:'Connected'},
  ],
  probel: [
    {name:'Miranda NV8576',  type:'Router',address:'192.168.4.10',status:'ok',  info:'576x576'},
    {name:'Snell Sirius 800',type:'Router',address:'192.168.4.11',status:'warn',info:'Partial sync'},
  ],
  sony9:  [
    {name:'Sony BVW-75',  type:'VTR',address:'COM3',status:'ok',info:'STOP'},
    {name:'Sony SRW-5800',type:'VTR',address:'COM4',status:'ok',info:'PLAY'},
  ],
  bvs:    [
    {name:'Sony BVS-3200', type:'Switcher',address:'192.168.5.10',status:'ok',info:'Connected'},
    {name:'Sony MVS-8000X',type:'Switcher',address:'192.168.5.11',status:'ok',info:'Connected'},
  ],
};

const SEED_MACROS = [
  {id:'m1',name:'SHOW OPEN',    steps:8,type:'salvo' as const},
  {id:'m2',name:'BREAK IN',     steps:4,type:'salvo' as const},
  {id:'m3',name:'BREAK OUT',    steps:4,type:'salvo' as const},
  {id:'m4',name:'SHOW CLOSE',   steps:6,type:'salvo' as const},
  {id:'m5',name:'EMERGENCY CUT',steps:2,type:'macro' as const},
  {id:'m6',name:'REPLAY TRIG',  steps:3,type:'macro' as const},
];

// ─── Style helpers ────────────────────────────────────────────────────────

const C = {
  bg:  '#080808', bg2: '#0f0f0f', bg3: '#161616',
  bd:  '#1e1e1e', bd2: '#2a2a2a',
  ac:  '#00b4d8', grn: '#06d6a0', red: '#ef233c', ylw: '#ffd166',
  tx:  '#e0e0e0', mu:  '#555',    mu2: '#888',
};

function btn(on = false, color = C.ac): React.CSSProperties {
  return {
    padding: '3px 10px', fontSize: '10px', cursor: 'pointer', borderRadius: '3px',
    background: on ? color : C.bg3, color: on ? '#000' : C.mu2,
    border: `1px solid ${on ? color : C.bd2}`, fontFamily: 'inherit', transition: 'all .12s',
  };
}
function dot(s: 'ok'|'warn'|'err'|'off'): React.CSSProperties {
  return { width:8, height:8, borderRadius:'50%', flexShrink:0,
    background: s==='ok'?C.grn : s==='warn'?C.ylw : s==='err'?C.red : '#333' };
}
function badge(s: AlarmSeverity | 'ok' | 'warn'): React.CSSProperties {
  const map = { ok:'rgba(6,214,160,.15)', warn:'rgba(255,209,102,.1)', crit:'rgba(239,35,60,.15)', info:'rgba(0,180,216,.1)' };
  const col = { ok:C.grn, warn:C.ylw, crit:C.red, info:C.ac };
  const k = s as keyof typeof map;
  return { display:'inline-block', padding:'1px 7px', borderRadius:8, fontSize:8, fontWeight:'bold',
    background: map[k] ?? map.info, color: col[k] ?? C.ac };
}

// ─── ME Bank component ────────────────────────────────────────────────────

function makeDefaultME(pgm: number, pvw: number): MEState {
  return { pgm, pvw, transition: 'CUT', rate: 25, inTransition: false, progress: 0 };
}

function srcName(id: number) { return SOURCES.find(s => s.id === id)?.name ?? `SRC-${id}`; }

interface MEBankProps {
  meIndex: number; state: MEState; canOperate: boolean;
  onPvwSelect(me: number, id: number): void;
  onCut(me: number): void;
  onAuto(me: number): void;
  onTransition(me: number, t: TransitionType): void;
  onRate(me: number, r: number): void;
}

function MEBank({ meIndex, state, canOperate, onPvwSelect, onCut, onAuto, onTransition, onRate }: MEBankProps) {
  const accent = ([C.ac, C.grn, C.ylw] as string[])[meIndex] ?? C.ac;
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderTop: `2px solid ${accent}`, borderRadius: 6, padding: 12, marginBottom: 10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <span style={{ color: accent, fontWeight:'bold', fontSize:13, letterSpacing:2 }}>ME-{meIndex+1}</span>
        <span style={{ color: C.mu, fontSize:10 }}>
          PGM: <b style={{ color: C.red }}>{srcName(state.pgm)}</b>
          &nbsp;&nbsp;PVW: <b style={{ color: C.grn }}>{srcName(state.pvw)}</b>
        </span>
        {state.inTransition && <span style={{ color: accent, fontSize:10, marginLeft:'auto' }}>{state.transition} {Math.round(state.progress)}%</span>}
      </div>

      {/* PVW bus */}
      <div style={{ marginBottom:6 }}>
        <div style={{ color: C.grn, fontSize:9, letterSpacing:1, marginBottom:4, textTransform:'uppercase' }}>Preview</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {SOURCES.map(src => (
            <button key={src.id} onClick={() => onPvwSelect(meIndex, src.id)} disabled={!canOperate}
              style={{ padding:'3px 7px', fontSize:9, background: state.pvw===src.id ? C.grn : C.bg3,
                color: state.pvw===src.id ? '#000' : '#555', border:`1px solid ${state.pvw===src.id ? C.grn : C.bd2}`,
                borderRadius:2, cursor: canOperate ? 'pointer' : 'default', transition:'all .1s' }}>
              {src.name}
            </button>
          ))}
        </div>
      </div>

      {/* PGM bus */}
      <div style={{ marginBottom:10 }}>
        <div style={{ color: C.red, fontSize:9, letterSpacing:1, marginBottom:4, textTransform:'uppercase' }}>Program</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {SOURCES.map(src => (
            <div key={src.id} style={{ padding:'3px 7px', fontSize:9,
              background: state.pgm===src.id ? C.red : '#0d0d0d',
              color: state.pgm===src.id ? '#fff' : '#2a2a2a',
              border:`1px solid ${state.pgm===src.id ? C.red : C.bd}`, borderRadius:2 }}>
              {src.name}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {state.inTransition && (
        <div style={{ height:4, background: C.bd, borderRadius:2, marginBottom:8, overflow:'hidden' }}>
          <div style={{ height:'100%', background: accent, width:`${state.progress}%`, transition:'width .04s linear' }} />
        </div>
      )}

      {/* Controls */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:9, color: C.mu, marginBottom:3, textTransform:'uppercase', letterSpacing:1 }}>Transition</div>
          <div style={{ display:'flex', gap:3 }}>
            {TRANSITIONS.map(t => (
              <button key={t} onClick={() => onTransition(meIndex, t)} disabled={!canOperate}
                style={{ padding:'3px 8px', fontSize:10, background: state.transition===t ? accent : C.bg3,
                  color: state.transition===t ? '#000' : C.mu2, border:`1px solid ${state.transition===t ? accent : C.bd2}`,
                  borderRadius:2, cursor:'pointer', fontFamily:'inherit' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color: C.mu, marginBottom:3, textTransform:'uppercase', letterSpacing:1 }}>Rate (f)</div>
          <input type="number" min={1} max={250} value={state.rate}
            onChange={e => onRate(meIndex, parseInt(e.target.value) || 25)} disabled={!canOperate}
            style={{ width:55, background:'#0d0d0d', color: C.tx, border:`1px solid ${C.bd2}`,
              padding:'3px 6px', borderRadius:2, fontFamily:'inherit', fontSize:11 }} />
        </div>
        <button onClick={() => onCut(meIndex)} disabled={!canOperate}
          style={{ padding:'7px 22px', fontSize:13, fontWeight:'bold', background: C.red, color:'#fff',
            border:'none', borderRadius:3, cursor: canOperate ? 'pointer' : 'not-allowed', letterSpacing:1, fontFamily:'inherit' }}>
          CUT
        </button>
        <button onClick={() => onAuto(meIndex)} disabled={!canOperate}
          style={{ padding:'7px 22px', fontSize:13, fontWeight:'bold', background: accent, color:'#000',
            border:'none', borderRadius:3, cursor: canOperate ? 'pointer' : 'not-allowed', letterSpacing:1, fontFamily:'inherit' }}>
          AUTO
        </button>
      </div>
    </div>
  );
}

// ─── Multilevel Router tab ────────────────────────────────────────────────

function RouterTab({ canOperate }: { canOperate: boolean }) {
  const [level, setLevel] = useState<RouterLevel>('V');
  const [routes, setRoutes] = useState<Record<string, string>>({});

  const active = Object.keys(routes).filter(k => k.startsWith(level + ':')).length;

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {ROUTER_LEVELS.map(l => <button key={l} style={btn(level===l)} onClick={() => setLevel(l)}>{LEVEL_LABELS[l]}</button>)}
        <span style={{ color: C.bd2, margin:'0 4px' }}>|</span>
        <button style={btn()} onClick={() => setRoutes({})}>CLEAR ALL</button>
        <span style={{ color: C.mu, fontSize:9, marginLeft:8 }}>{active} routes on {LEVEL_LABELS[level]}</span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', fontSize:9, minWidth:600 }}>
          <thead>
            <tr>
              <th style={{ padding:'4px 8px', background: C.bg2, color: C.mu, textAlign:'left', border:`1px solid ${C.bd}`, whiteSpace:'nowrap' }}>DST \ SRC</th>
              {ML_SRCS.map(s => <th key={s} style={{ padding:'3px 4px', background: C.bg2, color: C.mu, textAlign:'center', border:`1px solid ${C.bd}`, whiteSpace:'nowrap' }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {ML_DSTS.map(dst => {
              const routed = routes[`${level}:${dst}`];
              return (
                <tr key={dst}>
                  <td style={{ padding:'3px 8px', background: C.bg2, color: C.mu2, border:`1px solid ${C.bd}`, whiteSpace:'nowrap', fontWeight:'bold' }}>{dst}</td>
                  {ML_SRCS.map(src => {
                    const isRouted = routed === src;
                    return (
                      <td key={src} onClick={() => canOperate && setRoutes(p => ({ ...p, [`${level}:${dst}`]: src }))}
                        style={{ padding:'3px 2px', textAlign:'center', border:`1px solid ${C.bd}`, minWidth:52,
                          background: isRouted ? 'rgba(0,180,216,.18)' : C.bg,
                          color: isRouted ? C.ac : 'transparent',
                          cursor: canOperate ? 'pointer' : 'default', fontWeight:'bold', transition:'background .1s' }}>
                        {isRouted ? (src.split('-')[1] ?? src) : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tally / UMD tab ─────────────────────────────────────────────────────

const TALLY_SRCS = ML_SRCS.slice(0, 12);

function TallyTab({ canOperate }: { canOperate: boolean }) {
  const [bus, setBus] = useState('PGM');
  const [states, setStates] = useState<Record<string, TallyState>>({});

  function cycle(src: string) {
    if (!canOperate) return;
    setStates(p => { const c = p[src] ?? 'off'; return { ...p, [src]: c==='off'?'pvw':c==='pvw'?'pgm':'off' }; });
  }
  const tallyBg  = (s: TallyState) => s==='pgm' ? C.red : s==='pvw' ? C.grn : C.bg3;
  const tallyCol = (s: TallyState) => s==='pgm' ? '#fff' : s==='pvw' ? '#000' : C.mu;

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {['PGM','PVW','AUX 1','AUX 2'].map(b => <button key={b} style={btn(bus===b)} onClick={() => setBus(b)}>{b}</button>)}
        <span style={{ color: C.bd2, margin:'0 4px' }}>|</span>
        <button style={btn()} onClick={() => setStates(Object.fromEntries(TALLY_SRCS.map(s => [s,'pvw' as TallyState])))}>TALLY ALL</button>
        <button style={btn()} onClick={() => setStates({})}>CLEAR</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {TALLY_SRCS.map((src, i) => {
          const s = states[src] ?? 'off';
          return (
            <div key={src} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px', background: C.bg2, borderRadius:3, border:`1px solid ${C.bd}` }}>
              <span style={{ flex:1, color: C.tx, fontSize:11 }}>{src}</span>
              <div onClick={() => cycle(src)} style={{ width:80, height:22, borderRadius:2, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:9, fontWeight:'bold', background: tallyBg(s), color: tallyCol(s),
                border:`1px solid ${tallyBg(s)}`, cursor: canOperate ? 'pointer' : 'default', transition:'all .15s' }}>
                {s.toUpperCase()}
              </div>
              <span style={{ color: C.mu, fontSize:9, width:60 }}>{bus}</span>
              <span style={{ color: C.mu, fontSize:9, width:70 }}>UMD-{String(i+1).padStart(2,'0')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Device Control tab ───────────────────────────────────────────────────

function DevicesTab({ canOperate, onLog }: { canOperate: boolean; onLog(m: string): void }) {
  const [proto, setProto] = useState<DeviceProtocol>('ember');
  const devs = SEED_DEVICES[proto];
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {DEV_PROTOCOLS.map(p => <button key={p} style={btn(proto===p)} onClick={() => setProto(p)}>{PROTO_LABELS[p]}</button>)}
        <span style={{ color: C.bd2, margin:'0 4px' }}>|</span>
        <button style={btn()} onClick={() => onLog(`Scan: ${PROTO_LABELS[proto]}`)}>SCAN NETWORK</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {devs.map(d => (
          <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', background: C.bg2, borderRadius:4, border:`1px solid ${C.bd}` }}>
            <div style={dot(d.status)} />
            <span style={{ flex:1, color: C.tx, fontSize:11 }}>{d.name}</span>
            <span style={{ color: C.mu, fontSize:9, width:120 }}>{d.type}</span>
            <span style={{ color: C.mu, fontSize:9, width:110 }}>{d.address}</span>
            <span style={badge(d.status)}>{d.info}</span>
            <button style={{ ...btn(), padding:'2px 8px', fontSize:9 }} onClick={() => canOperate && onLog(`CTRL: ${d.name}`)}>CTRL</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Macros / Salvos tab ──────────────────────────────────────────────────

function MacrosTab({ canOperate, onLog }: { canOperate: boolean; onLog(m: string): void }) {
  const [macros, setMacros] = useState(SEED_MACROS);
  const [search, setSearch] = useState('');
  const filtered = macros.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        <button style={btn(false, C.red)} onClick={() => onLog('Macro recording started')}>● RECORD</button>
        <button style={btn()} onClick={() => onLog('Macro recording stopped')}>■ STOP</button>
        <button style={btn()} onClick={() => setMacros(p => [...p, { id:`m${Date.now()}`, name:`MACRO-${p.length+1}`, steps:0, type:'macro' as const }])}>+ NEW</button>
        <span style={{ color: C.bd2, margin:'0 4px' }}>|</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search macros..."
          style={{ background:'#0d0d0d', border:`1px solid ${C.bd2}`, color: C.tx, padding:'3px 8px',
            borderRadius:3, fontFamily:'inherit', fontSize:11, width:180 }} />
        <span style={{ color: C.mu, fontSize:9 }}>{filtered.length} macros</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {filtered.map((m, i) => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background: C.bg2, borderRadius:3, border:`1px solid ${C.bd}` }}>
            <span style={{ flex:1, color: C.tx, fontSize:11 }}>{m.name}</span>
            <span style={{ color: C.mu, fontSize:9 }}>{m.steps} steps</span>
            <span style={badge(m.type==='salvo' ? 'warn' : 'ok')}>{m.type.toUpperCase()}</span>
            <button style={{ ...btn(false, C.grn), padding:'2px 8px', fontSize:9 }} onClick={() => canOperate && onLog(`RUN: ${m.name}`)}>▶ RUN</button>
            <button style={{ ...btn(), padding:'2px 8px', fontSize:9 }}>EDIT</button>
            <button style={{ ...btn(false, C.red), padding:'2px 8px', fontSize:9 }} onClick={() => setMacros(p => p.filter((_,j) => j!==i))}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alarms tab ───────────────────────────────────────────────────────────

type AlarmEntry = { id: string; severity: AlarmSeverity; message: string; time: string };

const SEED_ALARMS: AlarmEntry[] = [
  { id:'a1', severity:'ok',   message:'Switcher BCS connected',           time:'10:00:01' },
  { id:'a2', severity:'info', message:'Router matrix sync — 256×256',     time:'10:00:03' },
  { id:'a3', severity:'warn', message:'LAWO Ember+ latency 45ms',         time:'10:02:11' },
  { id:'a4', severity:'crit', message:'SDI input LOSS on DST-07',         time:'10:04:33' },
  { id:'a5', severity:'ok',   message:'DST-07 signal restored',           time:'10:04:41' },
];

function AlarmsTab({ alarms, onClear }: { alarms: AlarmEntry[]; onClear(): void }) {
  const alarmBg  = (s: AlarmSeverity) => s==='crit'?'rgba(239,35,60,.08)':s==='warn'?'rgba(255,209,102,.06)':s==='ok'?'rgba(6,214,160,.06)':'rgba(0,180,216,.05)';
  const alarmBdr = (s: AlarmSeverity) => s==='crit'?C.red:s==='warn'?C.ylw:s==='ok'?C.grn:C.ac;
  const icon     = (s: AlarmSeverity) => s==='crit'?'⚠':s==='warn'?'⚠':s==='ok'?'✓':'ℹ';

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ color: C.mu, fontSize:9, textTransform:'uppercase', letterSpacing:1 }}>{alarms.length} events</span>
        <button style={{ ...btn(), padding:'2px 8px', fontSize:9 }} onClick={onClear}>CLEAR ALL</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3, maxHeight:400, overflowY:'auto' }}>
        {alarms.map(a => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px',
            borderRadius:3, fontSize:10, background: alarmBg(a.severity), borderLeft:`3px solid ${alarmBdr(a.severity)}` }}>
            <span style={{ color: C.mu, fontSize:9, whiteSpace:'nowrap' }}>{a.time}</span>
            <span>{icon(a.severity)}</span>
            <span style={{ flex:1 }}>{a.message}</span>
          </div>
        ))}
        {alarms.length === 0 && <div style={{ color: C.mu, fontSize:11, padding:10 }}>No alarms</div>}
      </div>
    </div>
  );
}

// ─── Root Switcher view ───────────────────────────────────────────────────

const TABS: { id: SwitcherTab; label: string }[] = [
  { id:'me',      label:'M/E BANKS' },
  { id:'router',  label:'MULTILEVEL ROUTER' },
  { id:'tally',   label:'TALLY / UMD' },
  { id:'devices', label:'DEVICE CONTROL' },
  { id:'macros',  label:'MACROS & SALVOS' },
  { id:'alarms',  label:'ALARMS' },
];

export function Switcher() {
  const { role, token } = useAuth();
  const { sendMessage, lastMessage } = useWebSocket(token ?? undefined);
  const canOperate = role !== 'VIEWER';

  const [tab, setTab] = useState<SwitcherTab>('me');
  const [mes, setMes] = useState<MEState[]>([makeDefaultME(1,2), makeDefaultME(3,4), makeDefaultME(5,6)]);
  const [alarms, setAlarms] = useState<AlarmEntry[]>(SEED_ALARMS);
  const timerRefs = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null, null]);

  function addAlarm(severity: AlarmSeverity, message: string) {
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setAlarms(p => [{ id: String(Date.now()), severity, message, time: now }, ...p].slice(0, 50));
  }

  useEffect(() => {
    if (lastMessage?.type === 'TALLY_UPDATE') {
      const meIdx = ((lastMessage.me as number) ?? 1) - 1;
      setMes(prev => prev.map((m, i) =>
        i === meIdx ? { ...m, pgm: lastMessage.pgm as number, pvw: lastMessage.pvw as number } : m
      ));
    }
  }, [lastMessage]);

  const handlePvwSelect = useCallback((meIdx: number, id: number) => {
    if (!canOperate) return;
    setMes(p => p.map((m, i) => i===meIdx ? { ...m, pvw: id } : m));
    sendMessage({ type:'SWITCHER_PVW', payload:{ me: meIdx+1, source: id } });
  }, [canOperate, sendMessage]);

  const handleCut = useCallback((meIdx: number) => {
    if (!canOperate) return;
    setMes(p => p.map((m, i) => i===meIdx ? { ...m, pgm: m.pvw, pvw: m.pgm } : m));
    const me = mes[meIdx];
    addAlarm('info', `ME-${meIdx+1} CUT: ${srcName(me.pvw)} → PGM`);
    sendMessage({ type:'SWITCHER_CUT', payload:{ me: meIdx+1, pvw: me.pvw, pgm: me.pgm } });
  }, [canOperate, sendMessage, mes]);

  const handleAuto = useCallback((meIdx: number) => {
    if (!canOperate) return;
    const me = mes[meIdx];
    if (me.inTransition) return;
    setMes(p => p.map((m, i) => i===meIdx ? { ...m, inTransition:true, progress:0 } : m));
    const totalMs = (me.rate / 25) * 1000;
    const step = 100 / (totalMs / 40);
    let prog = 0;
    const timer = setInterval(() => {
      prog += step;
      if (prog >= 100) {
        clearInterval(timer);
        timerRefs.current[meIdx] = null;
        setMes(p => p.map((m, i) => i===meIdx ? { ...m, pgm: m.pvw, pvw: m.pgm, inTransition:false, progress:0 } : m));
        addAlarm('info', `ME-${meIdx+1} AUTO ${me.transition} complete`);
      } else {
        setMes(p => p.map((m, i) => i===meIdx ? { ...m, progress: prog } : m));
      }
    }, 40);
    if (timerRefs.current[meIdx]) clearInterval(timerRefs.current[meIdx]!);
    timerRefs.current[meIdx] = timer;
    sendMessage({ type:'SWITCHER_AUTO', payload:{ me: meIdx+1, transition: me.transition, rate: me.rate } });
  }, [canOperate, sendMessage, mes]);

  const handleTransition = useCallback((meIdx: number, t: TransitionType) => {
    setMes(p => p.map((m, i) => i===meIdx ? { ...m, transition: t } : m));
  }, []);

  const handleRate = useCallback((meIdx: number, r: number) => {
    setMes(p => p.map((m, i) => i===meIdx ? { ...m, rate: r } : m));
  }, []);

  const alarmCount = alarms.filter(a => a.severity === 'crit' || a.severity === 'warn').length;

  return (
    <div style={{ fontFamily:'"Courier New",monospace', background: C.bg, color: C.tx, minHeight:'100vh', padding:12 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <span style={{ color: C.ac, fontWeight:'bold', fontSize:13, letterSpacing:2 }}>NEXUS SWITCH</span>
        <span style={{ color: C.mu, fontSize:10 }}>Virtual Production Switcher — 3 M/E Banks</span>
        {alarmCount > 0 && (
          <span style={{ ...badge('crit'), cursor:'pointer' }} onClick={() => setTab('alarms')}>
            ⚠ {alarmCount} ALARM{alarmCount > 1 ? 'S' : ''}
          </span>
        )}
        <span style={{ marginLeft:'auto', ...badge(role === 'ENGINEER' ? 'info' : role === 'OPERATOR' ? 'ok' : 'warn') }}>
          {role}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.bd}`, marginBottom:14, overflowX:'auto' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'7px 14px', cursor:'pointer', fontSize:10, userSelect:'none', whiteSpace:'nowrap',
            color: tab===t.id ? C.ac : C.mu,
            borderBottom: `2px solid ${tab===t.id ? C.ac : 'transparent'}`,
            transition:'all .15s',
          }}>
            {t.label}
            {t.id === 'alarms' && alarmCount > 0 && (
              <span style={{ marginLeft:5, ...badge('crit'), fontSize:8 }}>{alarmCount}</span>
            )}
          </div>
        ))}
      </div>

      {/* Panel content */}
      {tab === 'me' && mes.map((me, i) => (
        <MEBank key={i} meIndex={i} state={me} canOperate={canOperate}
          onPvwSelect={handlePvwSelect} onCut={handleCut} onAuto={handleAuto}
          onTransition={handleTransition} onRate={handleRate} />
      ))}
      {tab === 'router'  && <RouterTab  canOperate={canOperate} />}
      {tab === 'tally'   && <TallyTab   canOperate={canOperate} />}
      {tab === 'devices' && <DevicesTab canOperate={canOperate} onLog={msg => addAlarm('info', msg)} />}
      {tab === 'macros'  && <MacrosTab  canOperate={canOperate} onLog={msg => addAlarm('info', msg)} />}
      {tab === 'alarms'  && <AlarmsTab  alarms={alarms} onClear={() => setAlarms([])} />}
    </div>
  );
}
