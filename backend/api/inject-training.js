'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', '..', 'nexus-v5.html');
let c = fs.readFileSync(FILE, 'utf8');

if (c.includes('function _initTraining()')) {
  console.log('Training view already injected.');
  process.exit(0);
}

const trainingScript = `
<script>
// ─── TRAINING VIEW ────────────────────────────────────────────────────────────
var _TR_MODULES = [
  {id:'intro',roles:['ENGINEER','OPERATOR','TRAINER','VIEWER'],title:'Platform Overview',icon:'&#9654;',color:'var(--acc)',
   steps:[
    {t:'Welcome to NEXUS v5',b:'NEXUS is a software-defined broadcast orchestration platform. It replaces traditional hardware routers, switchers, and multiviewers with containerised microservices running on IP infrastructure over SMPTE ST 2110.'},
    {t:'System Architecture',b:'The API gateway (Node.js/Fastify) coordinates all services via WebSocket and REST. Services include: Virtual Switcher (Go), NMOS Registry (Python), ST 2110 Router (Rust), SDI Bridge (FPGA), Recorder (Go), ATEM Bridge (Go), Ember+ Gateway (Python).'},
    {t:'Role System',b:'ENGINEER: Full system access — infrastructure, API, orchestration, all views.\nOPERATOR: Production control — switcher, router, rundown, playout, SRT.\nTRAINER: Read access to all views for training and observation.\nVIEWER: Monitor only — live output, scopes, sync status.'},
    {t:'Navigation',b:'The top navigation bar shows only the views your role permits. The status bar always shows timecode, PGM/PVW sources, PTP offset, and WebSocket connection status. Use SWITCH USER in the top-right to change roles without reloading.'}
  ]},
  {id:'switcher',roles:['ENGINEER','OPERATOR','TRAINER'],title:'Switcher Operations',icon:'&#9670;',color:'var(--pgm)',
   steps:[
    {t:'ME Banks',b:'NEXUS has 3 Mix/Effects banks (ME 1–3). Each ME has a Program output (on-air) and a Preview bus. ME 1 is the primary output feeding the master PGM.'},
    {t:'Cutting',b:'Press CUT to instantly switch PVW to PGM. The previous PGM becomes the new PVW. This is a hard cut — zero transition frames. Sub-frame latency via the Go switcher service.'},
    {t:'Auto Transition',b:'AUTO executes a timed transition (MIX, WIPE, or DIP) at the rate set in the rate selector. Default is 25 frames at 25fps = 1 second. Progress is shown on the T-bar.'},
    {t:'Source Selection',b:'Click any source button to assign it to PVW. Sources highlighted in RED are on PGM. Sources in GREEN are on PVW. Quick-take buttons on the LIVE view take directly to PGM.'},
    {t:'Tally System',b:'Tally state is derived automatically from ME state after every cut or route. PGM sources show RED, PVW sources show GREEN. The tally grid in the SWITCH view updates in real-time.'}
  ]},
  {id:'router',roles:['ENGINEER','OPERATOR','TRAINER'],title:'Router & Signal Flow',icon:'&#9632;',color:'var(--pur)',
   steps:[
    {t:'Crosspoint Matrix',b:'The ROUTER view shows the full crosspoint matrix. Each row is a destination, each column is a source. Click any cell to route that source to that destination.'},
    {t:'Levels',b:'Routes are organised by signal level: VIDEO (ST 2110-20), AUDIO (ST 2110-30), and ANC (ST 2110-40). Select the level from the dropdown before making a route.'},
    {t:'Salvos',b:'A salvo is a group of routes executed simultaneously. Build a salvo by selecting multiple crosspoints, then press TAKE SALVO. Useful for scene changes requiring multiple simultaneous routes.'},
    {t:'Locking',b:'Any destination can be locked to prevent accidental re-routing. Locked destinations show a padlock icon. Only ENGINEER role can unlock a locked destination.'}
  ]},
  {id:'rundown',roles:['ENGINEER','OPERATOR','TRAINER'],title:'Production Rundown',icon:'&#9654;&#9654;',color:'var(--gold)',
   steps:[
    {t:'Cue List',b:'The RUNDOWN view shows the production cue list. Each cue has a type (LIVE/PKG/GFX/BREAK), source assignment, and duration. The current cue is highlighted in red, the next cue in green.'},
    {t:'GO / HOLD / SKIP',b:'GO starts the rundown clock and advances through cues automatically based on duration. HOLD pauses the clock. SKIP jumps to the next cue immediately.'},
    {t:'TAKE',b:'TAKE executes the current cue — it calls a CUT on ME 1 to the cue\'s assigned source. This is the primary production action during a live show.'},
    {t:'Adding Cues',b:'Use the ADD CUE form at the bottom to insert new cues. Set type, label, source, and duration. Cues can be reordered by clicking to jump to any position in the list.'}
  ]},
  {id:'playout',roles:['ENGINEER','OPERATOR','TRAINER'],title:'Playout Channel Management',icon:'&#9654;',color:'var(--ok)',
   steps:[
    {t:'Channels',b:'The PLAYOUT view manages output channels. Each channel has a name, source assignment, format, bitrate, and region. Channels can be spun up or down on demand.'},
    {t:'Spin Up / Down',b:'Click SPIN UP to activate a channel and begin output. Click SPIN DOWN to deactivate. Spinning up a cloud channel provisions compute in the selected region automatically.'},
    {t:'Multi-Region',b:'Channels can be assigned to EU-WEST, US-EAST, or CLOUD regions. Multi-region resilience ensures automatic failover if a region becomes unavailable. RTO is under 30 seconds.'},
    {t:'Bandwidth',b:'Total bandwidth across all active channels is shown in the summary panel. Monitor this against your allocated capacity to avoid oversubscription.'}
  ]},
  {id:'orchestrator',roles:['ENGINEER','TRAINER'],title:'Service Orchestration',icon:'&#9881;',color:'var(--warn)',
   steps:[
    {t:'Service Mesh',b:'The ORCHESTRATE view shows all NEXUS microservices with real-time CPU and memory usage. Each service shows its type (COMPUTE/STORAGE/NETWORK/HARDWARE/CONTROL/TIMING), region, and instance count.'},
    {t:'Scaling',b:'Use the + and - buttons to scale any service up or down. Scaling adds or removes container instances. The orchestrator (Kubernetes) handles scheduling automatically.'},
    {t:'Deploying Services',b:'Use the DEPLOY NEW SERVICE form to provision a new microservice. Select type, name, region, and instance count. The service will appear in the mesh within seconds.'},
    {t:'Rebalancing',b:'REBALANCE redistributes service instances across available nodes for optimal performance. Run this after scaling events or when CPU/memory imbalances are detected.'}
  ]},
  {id:'ptp',roles:['ENGINEER','OPERATOR','TRAINER'],title:'PTP Timing & Sync',icon:'&#9711;',color:'var(--acc)',
   steps:[
    {t:'PTP Overview',b:'NEXUS uses IEEE 1588v2 PTP (Precision Time Protocol) with SMPTE ST 2059-2 profile for broadcast timing. All services synchronise to a single grandmaster clock.'},
    {t:'Lock Status',b:'The SYNC view shows PTP lock status, offset from grandmaster, path delay, and frequency adjustment. A locked system shows offset under 50ns. Critical alert fires at 100ns.'},
    {t:'Grandmaster',b:'The grandmaster clock is GPS/GNSS-locked (Stratum 1). All NEXUS nodes are boundary clocks that distribute timing to endpoints. The clock hierarchy is shown in the SYNC view.'},
    {t:'Troubleshooting',b:'If PTP unlocks: check network switch PTP support (IEEE 1588 transparent clock mode required), verify VLAN configuration, and check for asymmetric network paths causing delay measurement errors.'}
  ]},
  {id:'nmos',roles:['ENGINEER','TRAINER'],title:'NMOS IS-04 / IS-05',icon:'&#9670;',color:'var(--pvw)',
   steps:[
    {t:'IS-04 Discovery',b:'NMOS IS-04 provides automatic discovery and registration of devices on the network. All NEXUS nodes register their senders and receivers with the IS-04 registry automatically on startup.'},
    {t:'IS-05 Connection',b:'IS-05 provides connection management — it controls which sender connects to which receiver. Click IS-05 CONNECT in the CONNECT view to establish a flow between any two endpoints.'},
    {t:'IS-07 Events',b:'IS-07 provides event-based tally and metadata transport. NEXUS uses IS-07 to distribute tally state to all registered receivers in real-time over WebSocket.'},
    {t:'IS-08 Audio',b:'IS-08 provides audio channel mapping. Use the CONNECT view to assign audio channels from any sender to any receiver input, with per-channel gain and routing control.'}
  ]}
];

var _trActive = null, _trStep = 0;

function _initTraining() {
  var v = document.getElementById('view-training');
  v.innerHTML =
    '<div style="display:flex;gap:8px;padding:8px;height:100%;overflow:hidden">' +
      '<div style="width:260px;flex-shrink:0;display:flex;flex-direction:column;gap:6px;overflow-y:auto">' +
        '<div class="pnl" style="flex-shrink:0"><div class="pnl-h"><span class="pnl-t">TRAINING MODULES</span>' +
          '<span class="bx bx-ok" id="tr-role-badge">' + (window.ROLE||'') + '</span></div>' +
          '<div style="padding:6px" id="tr-module-list"></div>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0">' +
        '<div class="pnl" style="flex:1;display:flex;flex-direction:column">' +
          '<div class="pnl-h" id="tr-header"><span class="pnl-t">SELECT A MODULE</span></div>' +
          '<div style="flex:1;padding:20px;overflow-y:auto" id="tr-content">' +
            '<div style="text-align:center;padding:40px;color:var(--t3)">' +
              '<div style="font-size:48px;margin-bottom:16px">&#9654;</div>' +
              '<div style="font-size:14px;letter-spacing:2px">SELECT A TRAINING MODULE</div>' +
              '<div style="font-size:10px;margin-top:8px">Choose a module from the left panel to begin</div>' +
            '</div>' +
          '</div>' +
          '<div style="padding:12px;border-top:1px solid var(--b1);display:flex;align-items:center;gap:10px" id="tr-controls" style="display:none">' +
            '<button class="btn" onclick="trPrev()">&#9664; PREV</button>' +
            '<div style="flex:1;height:4px;background:var(--b1);border-radius:2px"><div id="tr-progress" style="height:100%;background:var(--acc);border-radius:2px;transition:width .3s;width:0%"></div></div>' +
            '<span style="font-size:9px;color:var(--t3)" id="tr-step-lbl">0 / 0</span>' +
            '<button class="btn btn-pgm" onclick="trNext()">NEXT &#9654;</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  _trRenderModules();
}

function _trRenderModules() {
  var el = document.getElementById('tr-module-list'); if (!el) return;
  var allowed = _TR_MODULES.filter(function(m) {
    return m.roles.indexOf(ROLE) !== -1 || m.roles.indexOf('ALL') !== -1;
  });
  el.innerHTML = allowed.map(function(m) {
    var active = _trActive && _trActive.id === m.id;
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:4px;border:1px solid ' +
      (active ? m.color : 'var(--b1)') + ';margin-bottom:4px;background:' +
      (active ? 'rgba(0,212,255,.06)' : 'var(--bg2)') + ';cursor:pointer" onclick="trLoad(\'' + m.id + '\')">' +
      '<span style="font-size:14px;color:' + m.color + '">' + m.icon + '</span>' +
      '<div style="flex:1"><div style="font-size:10px;font-weight:700">' + m.title + '</div>' +
      '<div style="font-size:8px;color:var(--t3)">' + m.steps.length + ' steps</div></div>' +
      (active ? '<span class="dot dot-ok dot-pulse"></span>' : '') +
    '</div>';
  }).join('');
  if (allowed.length === 0) {
    el.innerHTML = '<div style="padding:12px;font-size:10px;color:var(--t3);text-align:center">No modules available for your role.</div>';
  }
}

function trLoad(id) {
  _trActive = _TR_MODULES.find(function(m) { return m.id === id; });
  _trStep = 0;
  _trRenderModules();
  _trRenderStep();
  var ctrl = document.getElementById('tr-controls');
  if (ctrl) ctrl.style.display = 'flex';
}

function _trRenderStep() {
  if (!_trActive) return;
  var step = _trActive.steps[_trStep];
  var hdr = document.getElementById('tr-header');
  var content = document.getElementById('tr-content');
  var prog = document.getElementById('tr-progress');
  var lbl = document.getElementById('tr-step-lbl');
  if (hdr) hdr.innerHTML = '<span class="pnl-t" style="color:' + _trActive.color + '">' + _trActive.title + '</span>' +
    '<span class="bx" style="background:rgba(0,0,0,.3);color:' + _trActive.color + ';border-color:' + _trActive.color + '">STEP ' + (_trStep+1) + ' OF ' + _trActive.steps.length + '</span>';
  if (content) content.innerHTML =
    '<div style="max-width:600px">' +
      '<div style="font-size:20px;font-weight:700;color:var(--t1);margin-bottom:16px;line-height:1.3">' + step.t + '</div>' +
      '<div style="font-size:13px;color:var(--t2);line-height:1.8;white-space:pre-line">' + step.b + '</div>' +
      (_trStep === _trActive.steps.length - 1 ?
        '<div style="margin-top:24px;padding:16px;background:rgba(0,255,136,.06);border:1px solid var(--pvw);border-radius:6px">' +
          '<div style="font-size:10px;font-weight:700;color:var(--pvw);margin-bottom:6px">&#10003; MODULE COMPLETE</div>' +
          '<div style="font-size:11px;color:var(--t2)">You have completed the ' + _trActive.title + ' module. Select another module to continue training.</div>' +
        '</div>' : '') +
    '</div>';
  var pct = ((_trStep + 1) / _trActive.steps.length * 100).toFixed(0);
  if (prog) prog.style.width = pct + '%';
  if (lbl) lbl.textContent = (_trStep+1) + ' / ' + _trActive.steps.length;
}

function trNext() {
  if (!_trActive) return;
  if (_trStep < _trActive.steps.length - 1) { _trStep++; _trRenderStep(); }
}
function trPrev() {
  if (!_trActive) return;
  if (_trStep > 0) { _trStep--; _trRenderStep(); }
}
</script>
`;

// Inject before closing </body>
c = c.replace('</body>\n</html>', trainingScript + '\n</body>\n</html>');
fs.writeFileSync(FILE, c, 'utf8');
console.log('Training view injected. Lines:', c.split('\n').length);
