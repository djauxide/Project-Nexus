import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import type { RouterLevel, TallyState, DeviceProtocol, AlarmSeverity } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────

const ML_SRCS = ['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08',
                 'REPLAY-01','REPLAY-02','GFX-01','GFX-02','PGM-OUT','PVW-OUT','AUX-01','AUX-02'];
const ML_DSTS = ['MON-01','MON-02','MON-03','MON-04','TX-OUT','RECORD',
                 'STREAM','MULTIVIEW','AUX-OUT-1','AUX-OUT-2','CONF-1','CONF-2'];
const ROUTER_LEVELS: RouterLevel[] = ['V', 'A', 'D', 'AES', 'EMB'];
const LEVEL_LABELS: Record<RouterLevel, string> = { V:'VIDEO', A:'AUDIO', D:'DATA', AES:'AES67', EMB:'EMBEDDED' };
const TALLY_SRCS = ML_SRCS.slice(0, 12);
const DEV_PROTOCOLS: DeviceProtocol[] = ['ember','nmos','gvg','probel','sony9','bvs'];
const PROTO_LABELS: Record<DeviceProtocol, string> = {
  ember:'Ember+', nmos:'NMOS IS-04', gvg:'GVG 7600', probel:'Probel SW-P-08', sony9:'Sony 9-pin', bvs:'BVS',
};

// ── Seed data ─────────────────────────────────────────────────────────────

const SEED_DEVICES: Record<DeviceProtocol, Array<{ name: string; type: string; address: string; status: 'ok'|'warn'|'err'; info: string }>> = {
  ember: [
    { name:'LAWO MC2-56',       type:'Audio Console', address:'192.168.1.10', status:'ok',   info:'Online — 96ch' },
    { name:'LAWO A__UHD Core',  type:'Audio Engine',  address:'192.168.1.11', status:'ok',   info:'Online — 256ch' },
    { name:'Calrec Apollo',     type:'Audio Console', address:'192.168.1.12', status:'warn', info:'Latency 45ms' },
    { name:'Nevion VideoIPath', type:'Router',        address:'192.168.1.20', status:'ok',   info:'256x256 sync' },
  ],
  nmos: [
    { name:'Sony HDC-5500',        type:'Camera',      address:'192.168.2.10', status:'ok', info:'IS-04 v1.3' },
    { name:'Grass Valley LDX 150', type:'Camera',      address:'192.168.2.11', status:'ok', info:'IS-04 v1.3' },
    { name:'Evertz 7800',          type:'Multiviewer', address:'192.168.2.20', status:'ok', info:'IS-05 v1.1' },
  ],
  gvg: [
    { name:'GVG Kayenne', type:'Switcher', address:'192.168.3.10', status:'ok', info:'Connected' },
    { name:'GVG Korona',  type:'Switcher', address:'192.168.3.11', status:'ok', info:'Connected' },
  ],
  probel: [
    { name:'Miranda NV8576',  type:'Router', address:'192.168.4.10', status:'ok',   info:'576x576' },
    { name:'Snell Sirius 800',type:'Router', address:'192.168.4.11', status:'warn', info:'Partial sync' },
  ],
  sony9: [
    { name:'Sony BVW-75',   type:'VTR', address:'COM3', status:'ok', info:'STOP' },
    { name:'Sony SRW-5800', type:'VTR', address:'COM4', status:'ok', info:'PLAY' },
  ],
  bvs: [
    { name:'Sony BVS-3200',  type:'Switcher', address:'192.168.5.10', status:'ok', info:'Connected' },
    { name:'Sony MVS-8000X', type:'Switcher', address:'192.168.5.11', status:'ok', info:'Connected' },
  ],
};

const SEED_MACROS = [
  { id:'m1', name:'SHOW OPEN',      steps:8, type:'salvo' as const },
  { id:'m2', name:'BREAK IN',       steps:4, type:'salvo' as const },
  { id:'m3', name:'BREAK OUT',      steps:4, type:'salvo' as const },
  { id:'m4', name:'SHOW CLOSE',     steps:6, type:'salvo' as const },
  { id:'m5', name:'EMERGENCY CUT',  steps:2, type:'macro' as const },
  { id:'m6', name:'REPLAY TRIGGER', steps:3, type:'macro' as const },
];

const SEED_ALARMS: Array<{ id: string; severity: AlarmSeverity; message: string; time: string }> = [
  { id:'a1', severity:'ok',   message:'Cerebrum BCS connected',              time:'10:00:01' },
  { id:'a2', severity:'info', message:'Router matrix sync — 256×256',        time:'10:00:03' },
  { id:'a3', severity:'warn', message:'LAWO-MC2-01 Ember+ latency 45ms',     time:'10:02:11' },
  { id:'a4', severity:'crit', message:'SDI input LOSS on DST-07',            time:'10:04:33' },
  { id:'a5', severity:'ok',   message:'DST-07 signal restored',              time:'10:04:41' },
];

const HEALTH_ITEMS = [
  { name:'Cerebrum Server',    status:'ok'   as const, val:'v6.4.2 — Online' },
  { name:'Router Matrix',      status:'ok'   as const, val:'256×256 — Sync' },
  { name:'Tally Engine',       status:'ok'   as const, val:'48 outputs active' },
  { name:'Ember+ Gateway',     status:'warn' as const, val:'Latency 45ms' },
  { name:'NMOS Registry',      status:'ok'   as const, val:'IS-04 v1.3' },
  { name:'Automation Engine',  status:'ok'   as const, val:'Manual mode' },
  { name:'UCP Panels',         status:'ok'   as const, val:'4 panels online' },
  { name:'License',            status:'ok'   as const, val:'Enterprise — Valid' },
];

// ── Shared styles ─────────────────────────────────────────────────────────

const S = {
  root: { fontFamily: '"Courier New", monospace', background: '#080808', color: '#e0e0e0', minHeight: '100vh', padding: '12px' } as React.CSSProperties,
  card: { background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '12px', marginBottom: '10px' } as React.CSSProperties,
  cardTitle: { fontSize: '9px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' },
  tab: (on: boolean, color = '#00b4d8'): React.CSSProperties => ({
    padding: '6px 14px', cursor: 'pointer', fontSize: '10px', userSelect: 'none',
    color: on ? color : '#555', borderBottom: `2px solid ${on ? color : 'transparent'}`,
    transition: 'all .15s', whiteSpace: 'nowrap' as const,
  }),
  btn: (on = false, color = '#00b4d8'): React.CSSProperties => ({
    padding: '3px 10px', fontSize: '10px', cursor: 'pointer', borderRadius: '3px',
    background: on ? color : '#161616', color: on ? '#000' : '#888',
    border: `1px solid ${on ? color : '#2a2a2a'}`, fontFamily: 'inherit', transition: 'all .15s',
  }),
  dot: (status: 'ok'|'warn'|'err'|'off'): React.CSSProperties => ({
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
    background: status === 'ok' ? '#06d6a0' : status === 'warn' ? '#ffd166' : status === 'err' ? '#ef233c' : '#333',
  }),
  badge: (sev: AlarmSeverity | 'ok' | 'warn'): React.CSSProperties => ({
    display: 'inline-block', padding: '1px 7px', borderRadius: '8px', fontSize: '8px', fontWeight: 'bold',
    background: sev === 'ok' ? 'rgba(6,214,160,.15)' : sev === 'warn' ? 'rgba(255,209,102,.1)' : sev === 'crit' ? 'rgba(239,35,60,.15)' : 'rgba(0,180,216,.1)',
    color: sev === 'ok' ? '#06d6a0' : sev === 'warn' ? '#ffd166' : sev === 'crit' ? '#ef233c' : '#00b4d8',
  }),
};

type Tab = 'ucp' | 'router' | 'tally' | 'devices' | 'macros' | 'automation' | 'health';
const TABS: { id: Tab; label: string }[] = [
  { id: 'ucp',        label: 'UCP PANEL' },
  { id: 'router',     label: 'MULTILEVEL ROUTER' },
  { id: 'tally',      label: 'TALLY / UMD' },
  { id: 'devices',    label: 'DEVICE CONTROL' },
  { id: 'macros',     label: 'MACROS' },
  { id: 'automation', label: 'AUTOMATION' },
  { id: 'health',     label: 'SYSTEM HEALTH' },
];

// ── UCP Panel ─────────────────────────────────────────────────────────────

type UcpMode = 'source' | 'salvo' | 'macro' | 'tally';
const UCP_LABELS: Record<UcpMode, string[]> = {
  source: ML_SRCS.concat(['CAM-09','CAM-10','CAM-11','CAM-12','CLIP-1','CLIP-2','CLIP-3','CLIP-4',
    'NET-1','NET-2','SAT-1','SAT-2','TEST-1','TEST-2','BLACK','BARS']),
  salvo:  ['SHOW OPEN','BREAK IN','BREAK OUT','SHOW CLOSE','SPORTS PKG','NEWS OPEN','WEATHER','TRAFFIC',
    'INTERVIEW','PANEL','LIVE SHOT','REMOTE','REPLAY PKG','HIGHLIGHT','PROMO','STING',
    'EMERGENCY','STANDBY','RESET','CLEAR','PRESET-1','PRESET-2','PRESET-3','PRESET-4',
    'PRESET-5','PRESET-6','PRESET-7','PRESET-8','CUSTOM-1','CUSTOM-2','CUSTOM-3','CUSTOM-4'],
  macro:  Array.from({ length: 32 }, (_, i) => `MACRO-${String(i+1).padStart(2,'0')}`),
  tally:  ML_DSTS.concat(['AUX-3','AUX-4','REMOTE-1','REMOTE-2','REMOTE-3','REMOTE-4',
    'UMD-01','UMD-02','UMD-03','UMD-04','UMD-05','UMD-06','UMD-07','UMD-08',
    'UMD-09','UMD-10','UMD-11','UMD-12','UMD-13','UMD-14','UMD-15','UMD-16']),
};

function UCPPanel({ canOperate, onAction }: { canOperate: boolean; onAction: (msg: string) => void }) {
  const [mode, setMode] = useState<UcpMode>('source');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<number | null>(null);
  const [status, setStatus] = useState('');

  const labels = UCP_LABELS[mode];
  const modeColor: Record<UcpMode, string> = { source: '#00b4d8', salvo: '#ffd166', macro: '#c084fc', tally: '#06d6a0' };
  const color = modeColor[mode];

  function handleBtn(idx: number, label: string) {
    if (!canOperate) return;
    setActive(idx);
    if (mode === 'source') setStatus(`Routed ${label} to PGM via Cerebrum`);
    else if (mode === 'salvo') setStatus(`Executing salvo: ${label}`);
    else if (mode === 'macro') { setStatus(`Running macro: ${label}`); onAction(`MACRO: ${label}`); }
    else setStatus(`Monitoring tally: ${label}`);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['source','salvo','macro','tally'] as UcpMode[]).map(m => (
          <button key={m} style={S.btn(mode === m, modeColor[m])} onClick={() => { setMode(m); setActive(null); setStatus(''); }}>
            {m.toUpperCase()}
          </button>
        ))}
        <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
        <span style={{ color: '#555', fontSize: '9px' }}>PAGE:</span>
        {[1,2,3,4].map(p => (
          <button key={p} style={S.btn(page === p)} onClick={() => setPage(p)}>{p}</button>
        ))}
        <span style={{ color: '#555', fontSize: '9px', marginLeft: '8px' }}>32 buttons · Page {page} · {mode.toUpperCase()}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {Array.from({ length: 32 }, (_, i) => {
          const label = labels[i] ?? `BTN-${i+1}`;
          const isActive = active === i;
          return (
            <div
              key={i}
              onClick={() => handleBtn(i, label)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', background: isActive ? `rgba(${color === '#00b4d8' ? '0,180,216' : color === '#ffd166' ? '255,209,102' : color === '#c084fc' ? '192,132,252' : '6,214,160'},.15)` : '#161616',
                border: `1px solid ${isActive ? color : '#2a2a2a'}`, borderRadius: '4px',
                cursor: canOperate ? 'pointer' : 'default', fontSize: '8px',
                color: isActive ? color : '#555', padding: '4px', userSelect: 'none', transition: 'all .1s',
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '9px' }}>{i+1}</span>
              <span style={{ fontSize: '7px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label}</span>
            </div>
          );
        })}
      </div>

      {status && (
        <div style={{ ...S.card, fontSize: '11px', color: color }}>
          ✓ {status}
        </div>
      )}
    </div>
  );
}

// ── Multilevel Router ─────────────────────────────────────────────────────

function RouterPanel({ canOperate }: { canOperate: boolean }) {
  const [level, setLevel] = useState<RouterLevel>('V');
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [locks, setLocks] = useState<Set<string>>(new Set());

  const activeCount = Object.keys(routes).filter(k => k.startsWith(level + ':')).length;

  function route(dst: string, src: string) {
    if (!canOperate) return;
    setRoutes(prev => ({ ...prev, [`${level}:${dst}`]: src }));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {ROUTER_LEVELS.map(l => (
          <button key={l} style={S.btn(level === l)} onClick={() => setLevel(l)}>{LEVEL_LABELS[l]}</button>
        ))}
        <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
        <button style={S.btn()} onClick={() => setRoutes({})}>CLEAR ALL</button>
        <span style={{ color: '#555', fontSize: '9px', marginLeft: '8px' }}>{activeCount} routes on {LEVEL_LABELS[level]}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '9px', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 8px', background: '#0f0f0f', color: '#555', textAlign: 'left', whiteSpace: 'nowrap', border: '1px solid #1e1e1e' }}>
                DST \ SRC
              </th>
              {ML_SRCS.map(src => (
                <th key={src} style={{ padding: '3px 4px', background: '#0f0f0f', color: '#555', textAlign: 'center', border: '1px solid #1e1e1e', whiteSpace: 'nowrap' }}>
                  {src}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ML_DSTS.map(dst => {
              const routed = routes[`${level}:${dst}`];
              return (
                <tr key={dst}>
                  <td style={{ padding: '3px 8px', background: '#0f0f0f', color: '#888', border: '1px solid #1e1e1e', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                    {dst}
                  </td>
                  {ML_SRCS.map(src => {
                    const isRouted = routed === src;
                    const isLocked = locks.has(`${level}:${dst}:${src}`);
                    return (
                      <td
                        key={src}
                        onClick={() => route(dst, src)}
                        style={{
                          padding: '3px 2px', textAlign: 'center', border: '1px solid #1e1e1e',
                          background: isRouted ? 'rgba(0,180,216,.18)' : isLocked ? 'rgba(239,35,60,.12)' : '#080808',
                          color: isRouted ? '#00b4d8' : isLocked ? '#ef233c' : 'transparent',
                          cursor: canOperate ? 'pointer' : 'default', fontWeight: 'bold',
                          minWidth: '52px', transition: 'background .1s',
                        }}
                      >
                        {isRouted ? src.split('-')[1] ?? src : ''}
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

// ── Tally / UMD ───────────────────────────────────────────────────────────

function TallyPanel({ canOperate }: { canOperate: boolean }) {
  const [bus, setBus] = useState('PGM');
  const [states, setStates] = useState<Record<string, TallyState>>({});

  function cycle(src: string) {
    if (!canOperate) return;
    setStates(prev => {
      const cur = prev[src] ?? 'off';
      return { ...prev, [src]: cur === 'off' ? 'pvw' : cur === 'pvw' ? 'pgm' : 'off' };
    });
  }

  const tallyColor = (s: TallyState) => s === 'pgm' ? '#ef233c' : s === 'pvw' ? '#06d6a0' : '#1e1e1e';
  const tallyText  = (s: TallyState) => s === 'pgm' ? '#fff' : s === 'pvw' ? '#000' : '#555';

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {['PGM','PVW','AUX 1','AUX 2'].map(b => (
          <button key={b} style={S.btn(bus === b)} onClick={() => setBus(b)}>{b}</button>
        ))}
        <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
        <button style={S.btn()} onClick={() => setStates(Object.fromEntries(TALLY_SRCS.map(s => [s, 'pvw' as TallyState])))}>TALLY ALL</button>
        <button style={S.btn()} onClick={() => setStates({})}>CLEAR</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {TALLY_SRCS.map((src, i) => {
          const state = states[src] ?? 'off';
          return (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#0f0f0f', borderRadius: '3px', border: '1px solid #1e1e1e' }}>
              <span style={{ flex: 1, color: '#e0e0e0', fontSize: '11px' }}>{src}</span>
              <div
                onClick={() => cycle(src)}
                style={{
                  width: '80px', height: '22px', borderRadius: '2px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold',
                  background: tallyColor(state), color: tallyText(state),
                  border: `1px solid ${tallyColor(state)}`, cursor: canOperate ? 'pointer' : 'default',
                  transition: 'all .15s',
                }}
              >
                {state.toUpperCase()}
              </div>
              <span style={{ color: '#555', fontSize: '9px', width: '60px' }}>{bus}</span>
              <span style={{ color: '#555', fontSize: '9px', width: '70px' }}>UMD-{String(i+1).padStart(2,'0')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Device Control ────────────────────────────────────────────────────────

function DevicePanel({ canOperate, onAction }: { canOperate: boolean; onAction: (msg: string) => void }) {
  const [proto, setProto] = useState<DeviceProtocol>('ember');
  const devices = SEED_DEVICES[proto];

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {DEV_PROTOCOLS.map(p => (
          <button key={p} style={S.btn(proto === p)} onClick={() => setProto(p)}>{PROTO_LABELS[p]}</button>
        ))}
        <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
        <button style={S.btn()} onClick={() => onAction(`Scan: ${PROTO_LABELS[proto]}`)}>SCAN NETWORK</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {devices.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: '#0f0f0f', borderRadius: '4px', border: '1px solid #1e1e1e' }}>
            <div style={S.dot(d.status)} />
            <span style={{ flex: 1, color: '#e0e0e0', fontSize: '11px' }}>{d.name}</span>
            <span style={{ color: '#555', fontSize: '9px', width: '120px' }}>{d.type}</span>
            <span style={{ color: '#555', fontSize: '9px', width: '110px' }}>{d.address}</span>
            <span style={S.badge(d.status)}>{d.info}</span>
            <button style={{ ...S.btn(), padding: '2px 8px', fontSize: '9px' }} onClick={() => canOperate && onAction(`CTRL: ${d.name}`)}>
              CTRL
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Macros ────────────────────────────────────────────────────────────────

function MacrosPanel({ canOperate, onAction }: { canOperate: boolean; onAction: (msg: string) => void }) {
  const [macros, setMacros] = useState(SEED_MACROS);
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(false);

  const filtered = macros.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          style={{ ...S.btn(recording, '#ef233c'), padding: '3px 10px' }}
          onClick={() => { setRecording(true); onAction('Macro recording started'); }}
        >
          ● RECORD
        </button>
        <button style={S.btn()} onClick={() => { setRecording(false); onAction('Macro recording stopped'); }}>■ STOP</button>
        <button style={S.btn()} onClick={() => setMacros(prev => [...prev, { id: `m${Date.now()}`, name: `MACRO-${prev.length+1}`, steps: 0, type: 'macro' }])}>
          + NEW
        </button>
        <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search macros..."
          style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#e0e0e0', padding: '3px 8px', borderRadius: '3px', fontFamily: 'inherit', fontSize: '11px', width: '180px' }}
        />
        <span style={{ color: '#555', fontSize: '9px' }}>{filtered.length} macros</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filtered.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#0f0f0f', borderRadius: '3px', border: '1px solid #1e1e1e' }}>
            <span style={{ flex: 1, color: '#e0e0e0', fontSize: '11px' }}>{m.name}</span>
            <span style={{ color: '#555', fontSize: '9px' }}>{m.steps} steps</span>
            <span style={S.badge(m.type === 'salvo' ? 'warn' : 'ok')}>{m.type.toUpperCase()}</span>
            <button style={{ ...S.btn(false, '#06d6a0'), padding: '2px 8px', fontSize: '9px' }} onClick={() => canOperate && onAction(`RUN: ${m.name}`)}>▶ RUN</button>
            <button style={{ ...S.btn(), padding: '2px 8px', fontSize: '9px' }}>EDIT</button>
            <button style={{ ...S.btn(false, '#ef233c'), padding: '2px 8px', fontSize: '9px' }} onClick={() => setMacros(prev => prev.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Automation ────────────────────────────────────────────────────────────

function AutomationPanel({ onAction }: { onAction: (msg: string) => void }) {
  const [autoMode, setAutoMode] = useState<'manual'|'semi'|'full'>('manual');
  const [triggers, setTriggers] = useState([
    { cond: 'TIMECODE >= 10:00:00', action: 'RUN MACRO: SHOW OPEN', active: true },
    { cond: 'TALLY PGM = CAM-01',   action: 'LOG: Camera 1 on air',  active: true },
  ]);

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>AUTOMATION ENGINE</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '9px' }}>MODE:</span>
          {(['manual','semi','full'] as const).map(m => (
            <button key={m} style={S.btn(autoMode === m)} onClick={() => { setAutoMode(m); onAction(`Automation: ${m.toUpperCase()}`); }}>
              {m === 'manual' ? 'MANUAL' : m === 'semi' ? 'SEMI-AUTO' : 'FULL AUTO'}
            </button>
          ))}
          <span style={{ color: '#2a2a2a', margin: '0 4px' }}>|</span>
          <span style={{ color: '#555', fontSize: '9px' }}>RUNDOWN:</span>
          <select style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', color: '#e0e0e0', padding: '3px 8px', borderRadius: '3px', fontFamily: 'inherit', fontSize: '11px' }}>
            <option>NEXUS LIVE EP.01</option>
            <option>MORNING SHOW</option>
            <option>SPORTS COVERAGE</option>
          </select>
          <button style={S.btn()} onClick={() => onAction('Rundown loaded')}>LOAD</button>
        </div>
        <div style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: '3px', padding: '10px', fontSize: '10px', color: '#555' }}>
          {autoMode === 'manual' ? 'Manual mode — no automation active' : `${autoMode.toUpperCase()} automation armed`}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>TRIGGER CONDITIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {triggers.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#161616', borderRadius: '3px', border: '1px solid #1e1e1e', fontSize: '10px' }}>
              <input type="checkbox" checked={t.active} onChange={e => setTriggers(prev => prev.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} />
              <span style={{ flex: 1, color: '#888' }}>IF <b style={{ color: '#e0e0e0' }}>{t.cond}</b></span>
              <span style={{ color: '#00b4d8' }}>→ {t.action}</span>
              <button style={{ ...S.btn(false, '#ef233c'), padding: '1px 6px', fontSize: '9px' }} onClick={() => setTriggers(prev => prev.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button style={{ ...S.btn(), marginTop: '8px' }} onClick={() => setTriggers(prev => [...prev, { cond: 'TIMECODE >= 00:00:00', action: 'RUN MACRO: CUSTOM', active: false }])}>
          + ADD TRIGGER
        </button>
      </div>
    </div>
  );
}

// ── System Health ─────────────────────────────────────────────────────────

function HealthPanel() {
  const [alarms, setAlarms] = useState(SEED_ALARMS);

  const alarmIcon = (s: AlarmSeverity) => s === 'crit' ? '⚠' : s === 'warn' ? '⚠' : s === 'ok' ? '✓' : 'ℹ';
  const alarmBg   = (s: AlarmSeverity) => s === 'crit' ? 'rgba(239,35,60,.08)' : s === 'warn' ? 'rgba(255,209,102,.06)' : s === 'ok' ? 'rgba(6,214,160,.06)' : 'rgba(0,180,216,.05)';
  const alarmBdr  = (s: AlarmSeverity) => s === 'crit' ? '#ef233c' : s === 'warn' ? '#ffd166' : s === 'ok' ? '#06d6a0' : '#00b4d8';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <div style={S.cardTitle}>SYSTEM STATUS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {HEALTH_ITEMS.map(h => (
            <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: '#0f0f0f', borderRadius: '4px', border: '1px solid #1e1e1e' }}>
              <div style={S.dot(h.status)} />
              <span style={{ flex: 1, color: '#e0e0e0', fontSize: '11px' }}>{h.name}</span>
              <span style={S.badge(h.status)}>{h.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={S.cardTitle}>ALARM LOG</div>
          <button style={{ ...S.btn(), padding: '2px 8px', fontSize: '9px' }} onClick={() => setAlarms([])}>CLEAR</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '320px', overflowY: 'auto' }}>
          {alarms.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px',
              borderRadius: '3px', fontSize: '10px',
              background: alarmBg(a.severity), borderLeft: `3px solid ${alarmBdr(a.severity)}`,
            }}>
              <span style={{ color: '#555', fontSize: '9px', whiteSpace: 'nowrap' }}>{a.time}</span>
              <span>{alarmIcon(a.severity)}</span>
              <span style={{ flex: 1 }}>{a.message}</span>
            </div>
          ))}
          {alarms.length === 0 && <div style={{ color: '#555', fontSize: '11px', padding: '10px' }}>No alarms</div>}
        </div>
      </div>
    </div>
  );
}

// ── Root Cerebrum view ────────────────────────────────────────────────────

export function Cerebrum() {
  const { role, token } = useAuth();
  const { sendMessage } = useWebSocket(token ?? undefined);
  const canOperate = role === 'OPERATOR' || role === 'ENGINEER' || role === 'TRAINER';
  const [tab, setTab] = useState<Tab>('ucp');

  const handleAction = useCallback((msg: string) => {
    sendMessage({ type: 'CEREBRUM_ACTION', payload: { action: msg, role, timestamp: Date.now() } });
  }, [sendMessage, role]);

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ color: '#00b4d8', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>CEREBRUM BCS</span>
        <span style={{ color: '#555', fontSize: '10px' }}>Broadcast Control System — EVS-style orchestration</span>
        <span style={{
          marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px',
          background: role === 'ENGINEER' ? 'rgba(0,180,216,.1)' : 'rgba(6,214,160,.1)',
          color: role === 'ENGINEER' ? '#00b4d8' : '#06d6a0',
        }}>
          {role}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e1e', marginBottom: '14px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {/* Panels */}
      {tab === 'ucp'        && <UCPPanel        canOperate={canOperate} onAction={handleAction} />}
      {tab === 'router'     && <RouterPanel     canOperate={canOperate} />}
      {tab === 'tally'      && <TallyPanel      canOperate={canOperate} />}
      {tab === 'devices'    && <DevicePanel     canOperate={canOperate} onAction={handleAction} />}
      {tab === 'macros'     && <MacrosPanel     canOperate={canOperate} onAction={handleAction} />}
      {tab === 'automation' && <AutomationPanel onAction={handleAction} />}
      {tab === 'health'     && <HealthPanel />}
    </div>
  );
}
