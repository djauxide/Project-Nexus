import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────

type RackSlotType =
  | 'empty' | 'switcher' | 'router' | 'multiviewer' | 'audio_console'
  | 'encoder' | 'decoder' | 'recorder' | 'playout' | 'graphics'
  | 'comms' | 'monitoring' | 'gateway' | 'clock';

type CloudRegion = 'eu-west-1' | 'us-east-1' | 'ap-southeast-1' | 'on-prem';
type LinkStatus = 'connected' | 'degraded' | 'offline' | 'standby';
type RackMode = 'ground' | 'cloud' | 'hybrid';

interface RackSlot {
  id: string;
  unit: number;       // rack unit position (1U, 2U, etc.)
  height: number;     // rack units tall
  type: RackSlotType;
  label: string;
  location: 'ground' | 'cloud';
  region?: CloudRegion;
  status: 'ok' | 'warn' | 'err' | 'off';
  info: string;
  protocol?: string;
  bitrate?: string;
}

interface CloudLink {
  id: string;
  name: string;
  src: string;
  dst: string;
  protocol: 'SRT' | 'RIST' | 'NDI' | 'RTMP' | 'ST2110-GW';
  region: CloudRegion;
  status: LinkStatus;
  latencyMs: number;
  bitrateMbps: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

const REGION_LABELS: Record<CloudRegion, string> = {
  'eu-west-1': 'EU West (London)',
  'us-east-1': 'US East (Virginia)',
  'ap-southeast-1': 'APAC (Singapore)',
  'on-prem': 'On-Premises',
};

const SLOT_COLORS: Record<RackSlotType, string> = {
  empty: '#111', switcher: '#0a1a2a', router: '#0a2a1a', multiviewer: '#1a1a0a',
  audio_console: '#1a0a2a', encoder: '#0a2a2a', decoder: '#0a2a2a',
  recorder: '#2a1a0a', playout: '#2a0a1a', graphics: '#1a2a0a',
  comms: '#0a1a1a', monitoring: '#1a1a2a', gateway: '#2a2a0a', clock: '#0a0a2a',
};

const SLOT_ACCENT: Record<RackSlotType, string> = {
  empty: '#222', switcher: '#00b4d8', router: '#06d6a0', multiviewer: '#ffd166',
  audio_console: '#c084fc', encoder: '#00b4d8', decoder: '#06d6a0',
  recorder: '#ef233c', playout: '#ef233c', graphics: '#06d6a0',
  comms: '#00b4d8', monitoring: '#ffd166', gateway: '#ffd166', clock: '#00b4d8',
};

const CATALOG: Array<{ type: RackSlotType; label: string; height: number; protocol: string }> = [
  { type:'switcher',      label:'Virtual Switcher ME',    height:2, protocol:'ST2110' },
  { type:'router',        label:'Signal Router 256x256',  height:2, protocol:'ST2110/Ember+' },
  { type:'multiviewer',   label:'Multiviewer 4K',         height:2, protocol:'ST2110' },
  { type:'audio_console', label:'Virtual Audio Console',  height:2, protocol:'AES67/Ember+' },
  { type:'encoder',       label:'SRT/RIST Encoder',       height:1, protocol:'SRT/RIST' },
  { type:'decoder',       label:'SRT/RIST Decoder',       height:1, protocol:'SRT/RIST' },
  { type:'recorder',      label:'Ingest Recorder',        height:1, protocol:'ST2110' },
  { type:'playout',       label:'Playout Server',         height:2, protocol:'ST2110' },
  { type:'graphics',      label:'Graphics Engine',        height:1, protocol:'NDI/ST2110' },
  { type:'comms',         label:'Comms / IFB System',     height:1, protocol:'VoIP/AES67' },
  { type:'monitoring',    label:'Monitoring & Scopes',    height:1, protocol:'ST2110' },
  { type:'gateway',       label:'ST2110 ↔ SDI Gateway',  height:1, protocol:'SDI/ST2110' },
  { type:'clock',         label:'PTP Grandmaster',        height:1, protocol:'IEEE 1588' },
];

const SEED_SLOTS: RackSlot[] = [
  { id:'s1', unit:1,  height:2, type:'switcher',      label:'NEXUS SWITCH ME-1',    location:'cloud', region:'eu-west-1', status:'ok',   info:'3 M/E active',       protocol:'ST2110',       bitrate:'3×3G' },
  { id:'s2', unit:3,  height:2, type:'router',        label:'NEXUS ROUTER 256x256', location:'cloud', region:'eu-west-1', status:'ok',   info:'256×256 routed',     protocol:'ST2110/Ember+',bitrate:'10G' },
  { id:'s3', unit:5,  height:2, type:'multiviewer',   label:'NEXUS MOSAIC 4K',      location:'cloud', region:'eu-west-1', status:'ok',   info:'4×4 layout',         protocol:'ST2110',       bitrate:'12G' },
  { id:'s4', unit:7,  height:2, type:'audio_console', label:'VIRTUAL AUDIO 96ch',   location:'cloud', region:'eu-west-1', status:'warn', info:'Latency 45ms',       protocol:'AES67',        bitrate:'1G' },
  { id:'s5', unit:9,  height:1, type:'encoder',       label:'SRT ENCODER ×4',       location:'ground',                    status:'ok',   info:'4 streams active',   protocol:'SRT',          bitrate:'4×50Mbps' },
  { id:'s6', unit:10, height:1, type:'decoder',       label:'SRT DECODER ×4',       location:'cloud', region:'eu-west-1', status:'ok',   info:'4 streams active',   protocol:'SRT',          bitrate:'4×50Mbps' },
  { id:'s7', unit:11, height:1, type:'recorder',      label:'INGEST RECORDER',      location:'cloud', region:'eu-west-1', status:'ok',   info:'840GB / 2TB',        protocol:'ST2110',       bitrate:'3G' },
  { id:'s8', unit:12, height:1, type:'clock',         label:'PTP GRANDMASTER',      location:'ground',                    status:'ok',   info:'Domain 0 — Locked',  protocol:'IEEE 1588',    bitrate:'' },
  { id:'s9', unit:13, height:1, type:'gateway',       label:'SDI ↔ ST2110 GW',     location:'ground',                    status:'ok',   info:'8ch SDI active',     protocol:'SDI/ST2110',   bitrate:'8×3G' },
  { id:'s10',unit:14, height:2, type:'playout',       label:'PLAYOUT SERVER',       location:'cloud', region:'eu-west-1', status:'ok',   info:'2ch playout ready',  protocol:'ST2110',       bitrate:'2×3G' },
  { id:'s11',unit:16, height:1, type:'graphics',      label:'GRAPHICS ENGINE',      location:'cloud', region:'eu-west-1', status:'ok',   info:'CG + DSK active',    protocol:'NDI/ST2110',   bitrate:'3G' },
  { id:'s12',unit:17, height:1, type:'comms',         label:'COMMS / IFB',          location:'cloud', region:'eu-west-1', status:'ok',   info:'8 IFB channels',     protocol:'VoIP/AES67',   bitrate:'100M' },
];

const SEED_LINKS: CloudLink[] = [
  { id:'l1', name:'STUDIO-A → CLOUD',   src:'Studio A (Ground)', dst:'EU West MCR',    protocol:'SRT',        region:'eu-west-1',      status:'connected', latencyMs:18,  bitrateMbps:150 },
  { id:'l2', name:'CLOUD → TX-OUT',     src:'EU West MCR',       dst:'TX Playout',     protocol:'ST2110-GW',  region:'eu-west-1',      status:'connected', latencyMs:2,   bitrateMbps:270 },
  { id:'l3', name:'REMOTE CAM FEED',    src:'Remote Location',   dst:'EU West MCR',    protocol:'RIST',       region:'eu-west-1',      status:'connected', latencyMs:45,  bitrateMbps:50  },
  { id:'l4', name:'US CONTRIBUTION',    src:'US East Studio',    dst:'EU West MCR',    protocol:'SRT',        region:'us-east-1',      status:'degraded',  latencyMs:120, bitrateMbps:35  },
  { id:'l5', name:'APAC FEED',          src:'Singapore Bureau',  dst:'EU West MCR',    protocol:'RIST',       region:'ap-southeast-1', status:'standby',   latencyMs:0,   bitrateMbps:0   },
];

// ─── Style helpers ────────────────────────────────────────────────────────

const C = {
  bg:'#080808', bg2:'#0f0f0f', bg3:'#161616',
  bd:'#1e1e1e', bd2:'#2a2a2a',
  ac:'#00b4d8', grn:'#06d6a0', red:'#ef233c', ylw:'#ffd166', pur:'#c084fc',
  tx:'#e0e0e0', mu:'#555', mu2:'#888',
};

function statusColor(s: 'ok'|'warn'|'err'|'off') {
  return s==='ok'?C.grn:s==='warn'?C.ylw:s==='err'?C.red:'#333';
}
function linkColor(s: LinkStatus) {
  return s==='connected'?C.grn:s==='degraded'?C.ylw:s==='offline'?C.red:'#333';
}
function btn(on = false, color = C.ac): React.CSSProperties {
  return { padding:'3px 10px', fontSize:10, cursor:'pointer', borderRadius:3,
    background: on ? color : C.bg3, color: on ? '#000' : C.mu2,
    border:`1px solid ${on ? color : C.bd2}`, fontFamily:'inherit', transition:'all .12s' };
}

// ─── Rack Slot component ──────────────────────────────────────────────────

function RackSlotCard({ slot, onRemove, canEdit }: { slot: RackSlot; onRemove(id: string): void; canEdit: boolean }) {
  const accent = SLOT_ACCENT[slot.type];
  const bg     = SLOT_COLORS[slot.type];
  const unitPx = 28;

  if (slot.type === 'empty') {
    return (
      <div style={{ height: slot.height * unitPx, background:'#0a0a0a', border:`1px dashed ${C.bd}`,
        borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center',
        color: C.mu, fontSize:9, letterSpacing:1 }}>
        {slot.height}U — EMPTY
      </div>
    );
  }

  return (
    <div style={{ height: slot.height * unitPx - 2, background: bg, border:`1px solid ${C.bd}`,
      borderLeft:`3px solid ${accent}`, borderRadius:3, padding:'4px 8px',
      display:'flex', alignItems:'center', gap:8, position:'relative', overflow:'hidden' }}>
      {/* Status LED */}
      <div style={{ width:6, height:6, borderRadius:'50%', background: statusColor(slot.status), flexShrink:0 }} />

      {/* Label */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color: accent, fontSize:9, fontWeight:'bold', letterSpacing:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {slot.label}
        </div>
        <div style={{ color: C.mu2, fontSize:8, marginTop:1 }}>{slot.info}</div>
      </div>

      {/* Protocol / bitrate */}
      {slot.height > 1 && (
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ color: C.mu, fontSize:8 }}>{slot.protocol}</div>
          {slot.bitrate && <div style={{ color: C.mu, fontSize:8 }}>{slot.bitrate}</div>}
        </div>
      )}

      {/* Location badge */}
      <div style={{ padding:'1px 5px', borderRadius:8, fontSize:7, fontWeight:'bold', flexShrink:0,
        background: slot.location==='cloud' ? 'rgba(0,180,216,.15)' : 'rgba(6,214,160,.1)',
        color: slot.location==='cloud' ? C.ac : C.grn }}>
        {slot.location==='cloud' ? (slot.region ? REGION_LABELS[slot.region].split(' ')[0]+' ☁' : '☁ CLOUD') : '⬛ GROUND'}
      </div>

      {/* Remove */}
      {canEdit && (
        <button onClick={() => onRemove(slot.id)}
          style={{ background:'none', border:'none', color: C.mu, cursor:'pointer', fontSize:10, padding:'0 2px', flexShrink:0 }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Cloud Links panel ────────────────────────────────────────────────────

function CloudLinksPanel({ links, canEdit }: { links: CloudLink[]; canEdit: boolean }) {
  const [localLinks, setLocalLinks] = useState(links);

  return (
    <div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {localLinks.map(l => (
          <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
            background: C.bg2, borderRadius:4, border:`1px solid ${C.bd}`,
            borderLeft:`3px solid ${linkColor(l.status)}` }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: linkColor(l.status), flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color: C.tx, fontSize:11, fontWeight:'bold' }}>{l.name}</div>
              <div style={{ color: C.mu, fontSize:9, marginTop:2 }}>{l.src} → {l.dst}</div>
            </div>
            <div style={{ textAlign:'center', width:70 }}>
              <div style={{ color: C.mu, fontSize:8 }}>PROTOCOL</div>
              <div style={{ color: C.ac, fontSize:10, fontWeight:'bold' }}>{l.protocol}</div>
            </div>
            <div style={{ textAlign:'center', width:70 }}>
              <div style={{ color: C.mu, fontSize:8 }}>LATENCY</div>
              <div style={{ color: l.latencyMs > 80 ? C.ylw : C.grn, fontSize:10, fontWeight:'bold' }}>
                {l.status === 'standby' ? '—' : `${l.latencyMs}ms`}
              </div>
            </div>
            <div style={{ textAlign:'center', width:80 }}>
              <div style={{ color: C.mu, fontSize:8 }}>BITRATE</div>
              <div style={{ color: C.tx, fontSize:10, fontWeight:'bold' }}>
                {l.status === 'standby' ? 'STANDBY' : `${l.bitrateMbps} Mbps`}
              </div>
            </div>
            <div style={{ padding:'2px 8px', borderRadius:8, fontSize:8, fontWeight:'bold', flexShrink:0,
              background: l.status==='connected'?'rgba(6,214,160,.1)':l.status==='degraded'?'rgba(255,209,102,.1)':l.status==='offline'?'rgba(239,35,60,.1)':'rgba(85,85,85,.1)',
              color: linkColor(l.status) }}>
              {l.status.toUpperCase()}
            </div>
            {canEdit && (
              <button style={{ ...btn(), padding:'2px 8px', fontSize:9 }}
                onClick={() => setLocalLinks(p => p.map(x => x.id===l.id ? { ...x, status: x.status==='standby'?'connected':'standby' } : x))}>
                {l.status === 'standby' ? 'ACTIVATE' : 'STANDBY'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root VirtualRack view ────────────────────────────────────────────────

type RackTab = 'rack' | 'links' | 'regions' | 'health';

export function VirtualRack() {
  const { role } = useAuth();
  const canEdit = role === 'ENGINEER' || role === 'OPERATOR';

  const [tab, setTab] = useState<RackTab>('rack');
  const [slots, setSlots] = useState<RackSlot[]>(SEED_SLOTS);
  const [mode, setMode] = useState<RackMode>('hybrid');
  const [addType, setAddType] = useState<RackSlotType>('encoder');
  const [addLocation, setAddLocation] = useState<'ground'|'cloud'>('cloud');
  const [addRegion, setAddRegion] = useState<CloudRegion>('eu-west-1');

  const groundSlots = slots.filter(s => s.location === 'ground');
  const cloudSlots  = slots.filter(s => s.location === 'cloud');

  function removeSlot(id: string) {
    setSlots(p => p.filter(s => s.id !== id));
  }

  function addSlot() {
    const cat = CATALOG.find(c => c.type === addType);
    if (!cat) return;
    const nextUnit = Math.max(0, ...slots.map(s => s.unit + s.height)) + 1;
    const newSlot: RackSlot = {
      id: `s${Date.now()}`, unit: nextUnit, height: cat.height,
      type: addType, label: cat.label.toUpperCase(),
      location: addLocation, region: addLocation === 'cloud' ? addRegion : undefined,
      status: 'ok', info: 'Provisioning...', protocol: cat.protocol, bitrate: '',
    };
    setSlots(p => [...p, newSlot]);
  }

  const RACK_TABS: { id: RackTab; label: string }[] = [
    { id:'rack',    label:'VIRTUAL RACK' },
    { id:'links',   label:'CLOUD LINKS' },
    { id:'regions', label:'REGIONS' },
    { id:'health',  label:'HEALTH' },
  ];

  const cloudCount  = slots.filter(s => s.location === 'cloud').length;
  const groundCount = slots.filter(s => s.location === 'ground').length;
  const warnCount   = slots.filter(s => s.status === 'warn' || s.status === 'err').length;

  return (
    <div style={{ fontFamily:'"Courier New",monospace', background: C.bg, color: C.tx, minHeight:'100vh', padding:12 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <span style={{ color: C.ac, fontWeight:'bold', fontSize:13, letterSpacing:2 }}>NEXUS CLOUD MCR</span>
        <span style={{ color: C.mu, fontSize:10 }}>Virtual Rack — Hybrid Ground-to-Cloud Production</span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          {(['ground','cloud','hybrid'] as RackMode[]).map(m => (
            <button key={m} style={btn(mode===m, m==='ground'?C.grn:m==='cloud'?C.ac:C.pur)} onClick={() => setMode(m)}>
              {m === 'ground' ? '⬛ GROUND' : m === 'cloud' ? '☁ CLOUD' : '⚡ HYBRID'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:'flex', gap:16, marginBottom:12, padding:'8px 12px', background: C.bg2, borderRadius:4, border:`1px solid ${C.bd}`, flexWrap:'wrap', fontSize:10 }}>
        <span style={{ color: C.grn }}>⬛ {groundCount} ground units</span>
        <span style={{ color: C.bd2 }}>|</span>
        <span style={{ color: C.ac }}>☁ {cloudCount} cloud units</span>
        <span style={{ color: C.bd2 }}>|</span>
        <span style={{ color: C.mu2 }}>{slots.length} total slots</span>
        <span style={{ color: C.bd2 }}>|</span>
        <span style={{ color: SEED_LINKS.filter(l => l.status==='connected').length > 0 ? C.grn : C.mu }}>
          {SEED_LINKS.filter(l => l.status==='connected').length} active links
        </span>
        {warnCount > 0 && <><span style={{ color: C.bd2 }}>|</span><span style={{ color: C.ylw }}>⚠ {warnCount} warnings</span></>}
        <span style={{ marginLeft:'auto', color: mode==='hybrid'?C.pur:mode==='cloud'?C.ac:C.grn, fontWeight:'bold' }}>
          MODE: {mode.toUpperCase()}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.bd}`, marginBottom:14, overflowX:'auto' }}>
        {RACK_TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'7px 14px', cursor:'pointer', fontSize:10, userSelect:'none', whiteSpace:'nowrap',
            color: tab===t.id ? C.ac : C.mu,
            borderBottom:`2px solid ${tab===t.id ? C.ac : 'transparent'}`,
            transition:'all .15s',
          }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── RACK TAB ── */}
      {tab === 'rack' && (
        <div>
          {/* Add slot controls */}
          {canEdit && (
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center',
              padding:'10px 12px', background: C.bg2, borderRadius:4, border:`1px solid ${C.bd}` }}>
              <span style={{ color: C.mu, fontSize:9, textTransform:'uppercase', letterSpacing:1 }}>Add to rack:</span>
              <select value={addType} onChange={e => setAddType(e.target.value as RackSlotType)}
                style={{ background:'#0d0d0d', border:`1px solid ${C.bd2}`, color: C.tx, padding:'3px 8px', borderRadius:3, fontFamily:'inherit', fontSize:11 }}>
                {CATALOG.map(c => <option key={c.type} value={c.type}>{c.label}</option>)}
              </select>
              <select value={addLocation} onChange={e => setAddLocation(e.target.value as 'ground'|'cloud')}
                style={{ background:'#0d0d0d', border:`1px solid ${C.bd2}`, color: C.tx, padding:'3px 8px', borderRadius:3, fontFamily:'inherit', fontSize:11 }}>
                <option value="ground">Ground</option>
                <option value="cloud">Cloud</option>
              </select>
              {addLocation === 'cloud' && (
                <select value={addRegion} onChange={e => setAddRegion(e.target.value as CloudRegion)}
                  style={{ background:'#0d0d0d', border:`1px solid ${C.bd2}`, color: C.tx, padding:'3px 8px', borderRadius:3, fontFamily:'inherit', fontSize:11 }}>
                  {(Object.keys(REGION_LABELS) as CloudRegion[]).filter(r => r !== 'on-prem').map(r => (
                    <option key={r} value={r}>{REGION_LABELS[r]}</option>
                  ))}
                </select>
              )}
              <button style={{ ...btn(false, C.grn), padding:'4px 14px' }} onClick={addSlot}>+ PROVISION</button>
            </div>
          )}

          {/* Dual rack view */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Ground rack */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ color: C.grn, fontSize:10, fontWeight:'bold', letterSpacing:2 }}>⬛ GROUND RACK</span>
                <span style={{ color: C.mu, fontSize:9 }}>On-premises hardware</span>
              </div>
              <div style={{ background:'#050505', border:`1px solid ${C.bd}`, borderRadius:4, padding:6,
                display:'flex', flexDirection:'column', gap:2, minHeight:200 }}>
                {/* Rack unit ruler */}
                {groundSlots.length === 0 && (
                  <div style={{ color: C.mu, fontSize:10, padding:20, textAlign:'center' }}>No ground units</div>
                )}
                {groundSlots.sort((a,b) => a.unit - b.unit).map(s => (
                  <RackSlotCard key={s.id} slot={s} onRemove={removeSlot} canEdit={canEdit} />
                ))}
              </div>
            </div>

            {/* Cloud rack */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ color: C.ac, fontSize:10, fontWeight:'bold', letterSpacing:2 }}>☁ CLOUD RACK</span>
                <span style={{ color: C.mu, fontSize:9 }}>Virtualised MCR</span>
              </div>
              <div style={{ background:'#050505', border:`1px solid ${C.bd}`, borderRadius:4, padding:6,
                display:'flex', flexDirection:'column', gap:2, minHeight:200 }}>
                {cloudSlots.length === 0 && (
                  <div style={{ color: C.mu, fontSize:10, padding:20, textAlign:'center' }}>No cloud units</div>
                )}
                {cloudSlots.sort((a,b) => a.unit - b.unit).map(s => (
                  <RackSlotCard key={s.id} slot={s} onRemove={removeSlot} canEdit={canEdit} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LINKS TAB ── */}
      {tab === 'links' && (
        <div>
          <div style={{ marginBottom:10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ color: C.mu, fontSize:9, textTransform:'uppercase', letterSpacing:1 }}>Ground-to-Cloud transport links</span>
            <span style={{ marginLeft:'auto', color: C.mu, fontSize:9 }}>
              {SEED_LINKS.filter(l => l.status==='connected').length} / {SEED_LINKS.length} active
            </span>
          </div>
          <CloudLinksPanel links={SEED_LINKS} canEdit={canEdit} />
        </div>
      )}

      {/* ── REGIONS TAB ── */}
      {tab === 'regions' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
          {(Object.entries(REGION_LABELS) as [CloudRegion, string][]).map(([region, label]) => {
            const regionSlots = slots.filter(s => s.region === region || (region === 'on-prem' && s.location === 'ground'));
            const ok = regionSlots.filter(s => s.status === 'ok').length;
            const warn = regionSlots.filter(s => s.status === 'warn').length;
            return (
              <div key={region} style={{ background: C.bg2, border:`1px solid ${C.bd}`, borderRadius:6, padding:14,
                borderTop:`2px solid ${region==='on-prem'?C.grn:C.ac}` }}>
                <div style={{ color: region==='on-prem'?C.grn:C.ac, fontWeight:'bold', fontSize:11, marginBottom:4 }}>{label}</div>
                <div style={{ color: C.mu, fontSize:9, marginBottom:10 }}>{region}</div>
                <div style={{ display:'flex', gap:12, fontSize:10 }}>
                  <span style={{ color: C.grn }}>✓ {ok} ok</span>
                  {warn > 0 && <span style={{ color: C.ylw }}>⚠ {warn} warn</span>}
                  <span style={{ color: C.mu }}>{regionSlots.length} units</span>
                </div>
                {regionSlots.length === 0 && <div style={{ color: C.mu, fontSize:9, marginTop:8 }}>No units deployed</div>}
                {regionSlots.slice(0,3).map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:9 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background: statusColor(s.status) }} />
                    <span style={{ color: C.mu2 }}>{s.label}</span>
                  </div>
                ))}
                {regionSlots.length > 3 && <div style={{ color: C.mu, fontSize:8, marginTop:4 }}>+{regionSlots.length-3} more</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HEALTH TAB ── */}
      {tab === 'health' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ color: C.mu, fontSize:9, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Rack Unit Status</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {slots.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px',
                  background: C.bg2, borderRadius:3, border:`1px solid ${C.bd}` }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: statusColor(s.status) }} />
                  <span style={{ flex:1, color: C.tx, fontSize:10 }}>{s.label}</span>
                  <span style={{ color: C.mu, fontSize:8 }}>{s.location === 'cloud' ? `☁ ${s.region}` : '⬛ ground'}</span>
                  <span style={{ color: statusColor(s.status), fontSize:9, fontWeight:'bold' }}>{s.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: C.mu, fontSize:9, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Link Health</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {SEED_LINKS.map(l => (
                <div key={l.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px',
                  background: C.bg2, borderRadius:3, border:`1px solid ${C.bd}` }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: linkColor(l.status) }} />
                  <span style={{ flex:1, color: C.tx, fontSize:10 }}>{l.name}</span>
                  <span style={{ color: C.mu, fontSize:8 }}>{l.protocol}</span>
                  <span style={{ color: l.latencyMs > 80 ? C.ylw : C.grn, fontSize:9 }}>
                    {l.status === 'standby' ? 'STANDBY' : `${l.latencyMs}ms`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
