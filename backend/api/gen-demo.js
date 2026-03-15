// NEXUS v4 — Cerebrum patch script
// Reads nexus-demo.html, injects EVS Cerebrum BCS features, writes back
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, 'nexus-demo.html');
let html = fs.readFileSync(FILE, 'utf8');

// ── 1. SIDEBAR: add Cerebrum after sb-predeploy ──────────────────────────
if (!html.includes('id="sb-cerebrum"')) {
  html = html.replace(
    'id="sb-predeploy"',
    'id="sb-predeploy"'
  );
  html = html.replace(
    '<div class="sbi eng-only" id="sb-predeploy"',
    '<div class="sbi eng-only" id="sb-cerebrum" onclick="sv(\'cerebrum\',this)"><span class="sbic">&#127760;</span><span class="sblb">CEREBRUM</span></div>\n<div class="sbi eng-only" id="sb-predeploy"'
  );
}

// ── 2. ROLE PERMS: add cerebrum to ENGINEER ──────────────────────────────
html = html.replace(
  '"predeploy"]}',
  '"predeploy","cerebrum"]}'
);

// ── 3. TITLES: add cerebrum title ────────────────────────────────────────
html = html.replace(
  'predeploy:"PRE-DEPLOY',
  'cerebrum:"CEREBRUM \u2014 Broadcast Control System",predeploy:"PRE-DEPLOY'
);

// ── 4. ENG-ONLY unlock: add sb-cerebrum ──────────────────────────────────
html = html.replace(
  '["sb-devices","sb-api","sb-predeploy"]',
  '["sb-devices","sb-api","sb-predeploy","sb-cerebrum"]'
);

// ── 5. CSS injection before </style></head> ──────────────────────────────
const CEREBRUM_CSS = `
/* ── CEREBRUM BCS ── */
.cb-tabs{display:flex;gap:0;border-bottom:1px solid var(--bd);margin-bottom:12px;flex-wrap:wrap}
.cb-tab{padding:7px 14px;cursor:pointer;font-size:10px;color:var(--mu2);border-bottom:2px solid transparent;transition:all .15s;user-select:none;white-space:nowrap}
.cb-tab:hover{color:var(--tx)}.cb-tab.on{color:var(--ac);border-bottom-color:var(--ac)}
.cb-panel{display:none}.cb-panel.on{display:block}
.ucp-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:10px}
.ucp-btn{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg3);border:1px solid var(--bd2);border-radius:4px;cursor:pointer;font-size:8px;color:var(--mu2);text-align:center;padding:4px;transition:all .15s;user-select:none}
.ucp-btn:hover{border-color:var(--ac);color:var(--tx)}
.ucp-btn.active{background:rgba(0,180,216,.15);border-color:var(--ac);color:var(--ac)}
.ucp-btn.pgm{background:rgba(239,35,60,.2);border-color:var(--red);color:var(--red)}
.ucp-btn.pvw{background:rgba(6,214,160,.15);border-color:var(--grn);color:var(--grn)}
.ucp-btn.salvo{background:rgba(255,209,102,.1);border-color:var(--ylw);color:var(--ylw)}
.ucp-btn.macro{background:rgba(123,45,139,.2);border-color:#c084fc;color:#c084fc}
.ucp-lbl{font-size:7px;margin-top:2px;color:var(--mu2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.ml-level-tabs{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}
.ml-level-tab{padding:3px 12px;border-radius:3px;cursor:pointer;font-size:10px;background:var(--bg3);color:var(--mu2);border:1px solid var(--bd2);transition:all .15s}
.ml-level-tab.on{background:var(--ac);color:#000;border-color:var(--ac)}
.ml-xp-wrap{overflow:auto;max-height:calc(100vh - 280px)}
.ml-xp{display:grid;gap:1px;background:var(--bd)}
.ml-xp-cell{padding:3px 2px;background:var(--bg);text-align:center;font-size:9px;cursor:pointer;transition:background .1s;min-width:52px}
.ml-xp-cell:hover{background:var(--bg3)}
.ml-xp-cell.routed{background:rgba(0,180,216,.18);color:var(--ac);font-weight:bold}
.ml-xp-cell.locked{background:rgba(239,35,60,.12);color:var(--red)}
.ml-xp-cell.protected{background:rgba(255,209,102,.1);color:var(--ylw)}
.ml-xp-hdr{padding:3px 6px;background:var(--bg2);font-size:9px;color:var(--mu2);text-align:center;font-weight:bold;white-space:nowrap}
.umd-row{display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--bg3);border-radius:3px;border:1px solid var(--bd);margin-bottom:4px}
.umd-box{width:80px;height:22px;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;border:1px solid var(--bd2);cursor:pointer;transition:all .15s}
.umd-box.pgm{background:var(--red);color:#fff;border-color:var(--red)}
.umd-box.pvw{background:var(--grn);color:#000;border-color:var(--grn)}
.umd-box.off{background:var(--bg);color:var(--mu2)}
.dev-ctrl-row{display:flex;align-items:center;gap:10px;padding:7px 12px;background:var(--bg3);border-radius:4px;border:1px solid var(--bd);margin-bottom:5px}
.dev-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dev-status-dot.ok{background:var(--grn)}.dev-status-dot.warn{background:var(--ylw)}.dev-status-dot.err{background:var(--red)}.dev-status-dot.off{background:#333}
.macro-row{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg3);border-radius:3px;border:1px solid var(--bd);margin-bottom:4px}
.macro-row .macro-name{flex:1;color:var(--tx);font-size:11px}
.macro-row .macro-steps{color:var(--mu2);font-size:9px}
.alarm-row{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:3px;margin-bottom:3px;font-size:10px}
.alarm-row.crit{background:rgba(239,35,60,.1);border-left:3px solid var(--red)}
.alarm-row.warn{background:rgba(255,209,102,.08);border-left:3px solid var(--ylw)}
.alarm-row.info{background:rgba(0,180,216,.06);border-left:3px solid var(--ac)}
.alarm-row.ok{background:rgba(6,214,160,.06);border-left:3px solid var(--grn)}
.cb-badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:8px;font-weight:bold;margin-left:4px}
.cb-badge.live{background:rgba(239,35,60,.2);color:var(--red)}
.cb-badge.ok{background:rgba(6,214,160,.15);color:var(--grn)}
.cb-badge.warn{background:rgba(255,209,102,.1);color:var(--ylw)}
`;

if (!html.includes('CEREBRUM BCS')) {
  html = html.replace('</style></head>', CEREBRUM_CSS + '</style></head>');
}

// ── 6. VIEW HTML: inject before <div id="sbar" ───────────────────────────
const CEREBRUM_VIEW = `
<div id="v-cerebrum" class="view">
<div class="cb-tabs">
<div class="cb-tab on" onclick="cbTab('ucp',this)">UCP PANEL</div>
<div class="cb-tab" onclick="cbTab('mlrouter',this)">MULTILEVEL ROUTER</div>
<div class="cb-tab" onclick="cbTab('tally',this)">TALLY / UMD</div>
<div class="cb-tab" onclick="cbTab('devctrl',this)">DEVICE CONTROL</div>
<div class="cb-tab" onclick="cbTab('macros',this)">MACROS</div>
<div class="cb-tab" onclick="cbTab('automation',this)">AUTOMATION</div>
<div class="cb-tab" onclick="cbTab('syshealth',this)">SYSTEM HEALTH</div>
</div>

<div id="cbp-ucp" class="cb-panel on">
<div class="row" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">
<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">UCP TYPE:</span>
<button class="btn on" onclick="setUcpType('source',this)">SOURCE SELECT</button>
<button class="btn" onclick="setUcpType('salvo',this)">SALVO</button>
<button class="btn" onclick="setUcpType('macro',this)">MACRO</button>
<button class="btn" onclick="setUcpType('tally',this)">TALLY MON</button>
<span style="color:var(--bd2)">|</span>
<span style="color:var(--mu2);font-size:9px">PAGE:</span>
<button class="btn on" onclick="setUcpPage(1,this)">1</button>
<button class="btn" onclick="setUcpPage(2,this)">2</button>
<button class="btn" onclick="setUcpPage(3,this)">3</button>
<button class="btn" onclick="setUcpPage(4,this)">4</button>
<span style="color:var(--bd2)">|</span>
<span style="color:var(--mu2);font-size:9px" id="ucp-status">32 buttons &bull; Page 1</span>
</div>
<div class="ucp-grid" id="ucp-grid"></div>
<div class="card" style="margin-top:8px">
<div class="card-title">SELECTED BUTTON CONFIG</div>
<div id="ucp-config" style="color:var(--mu2);font-size:11px">Click a button to configure</div>
</div>
</div>

<div id="cbp-mlrouter" class="cb-panel">
<div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:wrap">
<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">LEVEL:</span>
<div class="ml-level-tabs" id="ml-level-tabs">
<div class="ml-level-tab on" onclick="setMlLevel('V',this)">VIDEO</div>
<div class="ml-level-tab" onclick="setMlLevel('A',this)">AUDIO</div>
<div class="ml-level-tab" onclick="setMlLevel('D',this)">DATA</div>
<div class="ml-level-tab" onclick="setMlLevel('AES',this)">AES67</div>
<div class="ml-level-tab" onclick="setMlLevel('EMB',this)">EMBEDDED</div>
</div>
<span style="color:var(--bd2)">|</span>
<button class="btn" onclick="mlProtect()">PROTECT</button>
<button class="btn" onclick="mlLock()">LOCK</button>
<button class="btn" onclick="mlForce()">FORCE ROUTE</button>
<button class="btn" onclick="mlClearSel()">CLEAR SEL</button>
<span style="color:var(--mu2);font-size:9px" id="ml-status">0 routes active</span>
</div>
<div class="ml-xp-wrap"><table id="ml-xp-table" style="border-collapse:collapse;font-size:9px"></table></div>
</div>

<div id="cbp-tally" class="cb-panel">
<div class="row" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">
<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">TALLY BUS:</span>
<button class="btn on" onclick="setTallyBus('PGM',this)">PGM</button>
<button class="btn" onclick="setTallyBus('PVW',this)">PVW</button>
<button class="btn" onclick="setTallyBus('AUX1',this)">AUX 1</button>
<button class="btn" onclick="setTallyBus('AUX2',this)">AUX 2</button>
<span style="color:var(--bd2)">|</span>
<button class="btn grn" onclick="tallyAll()">TALLY ALL</button>
<button class="btn" onclick="tallyClear()">CLEAR</button>
</div>
<div id="umd-list" style="display:flex;flex-direction:column;gap:4px"></div>
</div>

<div id="cbp-devctrl" class="cb-panel">
<div class="row" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">
<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">PROTOCOL:</span>
<button class="btn on" onclick="setDevProto('ember',this)">EMBER+</button>
<button class="btn" onclick="setDevProto('nmos',this)">NMOS</button>
<button class="btn" onclick="setDevProto('gvg',this)">GVG 7600</button>
<button class="btn" onclick="setDevProto('probel',this)">PROBEL SW-P-08</button>
<button class="btn" onclick="setDevProto('sony9',this)">SONY 9-PIN</button>
<button class="btn" onclick="setDevProto('bvs',this)">BVS</button>
<span style="color:var(--bd2)">|</span>
<button class="btn grn" onclick="devCtrlScan()">SCAN NETWORK</button>
</div>
<div id="dev-ctrl-list" style="display:flex;flex-direction:column;gap:5px"></div>
</div>

<div id="cbp-macros" class="cb-panel">
<div class="row" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">
<button class="btn grn" onclick="macroRecord()">&#9679; RECORD</button>
<button class="btn red" onclick="macroStop()">&#9632; STOP</button>
<button class="btn" onclick="macroNew()">+ NEW</button>
<span style="color:var(--bd2)">|</span>
<input id="macro-search" type="text" placeholder="Search macros..." style="width:180px" oninput="renderMacros()">
<span style="color:var(--mu2);font-size:9px" id="macro-status">0 macros</span>
</div>
<div id="macro-list" style="display:flex;flex-direction:column;gap:4px"></div>
</div>

<div id="cbp-automation" class="cb-panel">
<div class="card">
<div class="card-title">AUTOMATION ENGINE</div>
<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap">
<span style="color:var(--mu2);font-size:9px">MODE:</span>
<button class="btn on" onclick="setAutoMode('manual',this)">MANUAL</button>
<button class="btn" onclick="setAutoMode('semi',this)">SEMI-AUTO</button>
<button class="btn" onclick="setAutoMode('full',this)">FULL AUTO</button>
<span style="color:var(--bd2)">|</span>
<span style="color:var(--mu2);font-size:9px">RUNDOWN:</span>
<select id="auto-rundown" style="width:180px">
<option>NEXUS LIVE EP.01</option>
<option>MORNING SHOW</option>
<option>SPORTS COVERAGE</option>
</select>
<button class="btn grn" onclick="autoLoad()">LOAD</button>
</div>
<div id="auto-timeline" style="background:var(--bg);border:1px solid var(--bd);border-radius:3px;padding:10px;min-height:80px;font-size:10px;color:var(--mu2)">
No automation loaded. Select a rundown and click LOAD.
</div>
</div>
<div class="card" style="margin-top:0">
<div class="card-title">TRIGGER CONDITIONS</div>
<div id="auto-triggers" style="display:flex;flex-direction:column;gap:4px"></div>
<button class="btn" style="margin-top:8px" onclick="addAutoTrigger()">+ ADD TRIGGER</button>
</div>
</div>

<div id="cbp-syshealth" class="cb-panel">
<div class="col2">
<div>
<div class="card-title" style="margin-bottom:8px">SYSTEM STATUS</div>
<div id="health-list" style="display:flex;flex-direction:column;gap:5px"></div>
</div>
<div>
<div class="card-title" style="margin-bottom:8px">ALARM LOG</div>
<div id="alarm-log" style="display:flex;flex-direction:column;gap:3px;max-height:300px;overflow-y:auto"></div>
<button class="btn" style="margin-top:8px;width:100%" onclick="clearAlarms()">CLEAR ALARMS</button>
</div>
</div>
</div>
</div>`;

if (!html.includes('id="v-cerebrum"')) {
  html = html.replace('<div id="sbar"', CEREBRUM_VIEW + '\n<div id="sbar"');
}

// ── 7. JAVASCRIPT: inject Cerebrum JS before </script> ───────────────────
const CEREBRUM_JS = `
// ═══════════════════════════════════════════════════════════════
// CEREBRUM BCS — EVS-style Broadcast Control System
// ═══════════════════════════════════════════════════════════════
var cbActiveTab='ucp',ucpType='source',ucpPage=1,mlLevel='V',tallyBus='PGM',devProto='ember';
var mlRoutes={},mlLocks={},mlProtects={};
var macroList=[
  {name:'SHOW OPEN',steps:8,type:'salvo',running:false},
  {name:'BREAK IN',steps:4,type:'salvo',running:false},
  {name:'BREAK OUT',steps:4,type:'salvo',running:false},
  {name:'SHOW CLOSE',steps:6,type:'salvo',running:false},
  {name:'EMERGENCY CUT',steps:2,type:'macro',running:false},
  {name:'REPLAY TRIGGER',steps:3,type:'macro',running:false}
];
var autoTriggers=[
  {cond:'TIMECODE >= 10:00:00',action:'RUN MACRO: SHOW OPEN',active:true},
  {cond:'TALLY PGM = CAM-01',action:'LOG: Camera 1 on air',active:true}
];
var alarmLog=[
  {sev:'ok',msg:'Cerebrum BCS connected',time:'10:00:01'},
  {sev:'info',msg:'Router matrix sync complete — 256x256',time:'10:00:03'},
  {sev:'warn',msg:'Device LAWO-MC2-01 Ember+ latency 45ms',time:'10:02:11'},
  {sev:'crit',msg:'SDI input LOSS on DST-07',time:'10:04:33'},
  {sev:'ok',msg:'DST-07 signal restored',time:'10:04:41'},
  {sev:'info',msg:'Macro SHOW OPEN executed',time:'10:05:00'}
];
var healthItems=[
  {name:'Cerebrum Server',status:'ok',val:'v6.4.2 — Online'},
  {name:'Router Matrix',status:'ok',val:'256x256 — Sync'},
  {name:'Tally Engine',status:'ok',val:'48 outputs active'},
  {name:'Ember+ Gateway',status:'warn',val:'Latency 45ms'},
  {name:'NMOS Registry',status:'ok',val:'IS-04 v1.3'},
  {name:'Automation Engine',status:'ok',val:'Manual mode'},
  {name:'UCP Panels',status:'ok',val:'4 panels online'},
  {name:'License',status:'ok',val:'Enterprise — Valid'}
];

var ML_SRCS=['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08',
             'REPLAY-01','REPLAY-02','GFX-01','GFX-02','PGM-OUT','PVW-OUT','AUX-01','AUX-02'];
var ML_DSTS=['MON-01','MON-02','MON-03','MON-04','TX-OUT','RECORD','STREAM','MULTIVIEW',
             'AUX-OUT-1','AUX-OUT-2','CONF-1','CONF-2'];

var UCP_LABELS={source:['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08',
  'REPLAY-01','REPLAY-02','GFX-01','GFX-02','PGM','PVW','AUX-1','AUX-2',
  'CAM-09','CAM-10','CAM-11','CAM-12','CLIP-1','CLIP-2','CLIP-3','CLIP-4',
  'NET-1','NET-2','SAT-1','SAT-2','TEST-1','TEST-2','BLACK','BARS'],
salvo:['SHOW OPEN','BREAK IN','BREAK OUT','SHOW CLOSE','SPORTS PKG','NEWS OPEN',
  'WEATHER','TRAFFIC','INTERVIEW','PANEL','LIVE SHOT','REMOTE','REPLAY PKG',
  'HIGHLIGHT','PROMO','STING','EMERGENCY','STANDBY','RESET','CLEAR',
  'PRESET-1','PRESET-2','PRESET-3','PRESET-4','PRESET-5','PRESET-6',
  'PRESET-7','PRESET-8','CUSTOM-1','CUSTOM-2','CUSTOM-3','CUSTOM-4'],
macro:['MACRO-01','MACRO-02','MACRO-03','MACRO-04','MACRO-05','MACRO-06',
  'MACRO-07','MACRO-08','MACRO-09','MACRO-10','MACRO-11','MACRO-12',
  'MACRO-13','MACRO-14','MACRO-15','MACRO-16','MACRO-17','MACRO-18',
  'MACRO-19','MACRO-20','MACRO-21','MACRO-22','MACRO-23','MACRO-24',
  'MACRO-25','MACRO-26','MACRO-27','MACRO-28','MACRO-29','MACRO-30','MACRO-31','MACRO-32'],
tally:['MON-01','MON-02','MON-03','MON-04','MON-05','MON-06','MON-07','MON-08',
  'TX-OUT','RECORD','STREAM','MULTIVIEW','AUX-1','AUX-2','AUX-3','AUX-4',
  'CONF-1','CONF-2','CONF-3','CONF-4','REMOTE-1','REMOTE-2','REMOTE-3','REMOTE-4',
  'UMD-01','UMD-02','UMD-03','UMD-04','UMD-05','UMD-06','UMD-07','UMD-08']};

var ucpSelected=null;

function cbTab(id,el){
  cbActiveTab=id;
  document.querySelectorAll('.cb-tab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.cb-panel').forEach(function(p){p.classList.remove('on');});
  if(el)el.classList.add('on');
  var panel=document.getElementById('cbp-'+id);
  if(panel)panel.classList.add('on');
  if(id==='ucp')renderUcp();
  if(id==='mlrouter')renderMlRouter();
  if(id==='tally')renderTally2();
  if(id==='devctrl')renderDevCtrl();
  if(id==='macros')renderMacros();
  if(id==='syshealth')renderSysHealth();
  if(id==='automation')renderAutomation();
}

function setUcpType(t,el){
  ucpType=t;
  document.querySelectorAll('#cbp-ucp .btn').forEach(function(b){if(['SOURCE SELECT','SALVO','MACRO','TALLY MON'].indexOf(b.textContent)>=0)b.classList.remove('on');});
  if(el)el.classList.add('on');
  renderUcp();
}
function setUcpPage(p,el){
  ucpPage=p;
  document.querySelectorAll('#cbp-ucp .btn').forEach(function(b){if(['1','2','3','4'].indexOf(b.textContent)>=0)b.classList.remove('on');});
  if(el)el.classList.add('on');
  renderUcp();
}

function renderUcp(){
  var grid=document.getElementById('ucp-grid');
  if(!grid)return;
  grid.innerHTML='';
  var labels=UCP_LABELS[ucpType]||UCP_LABELS.source;
  var offset=(ucpPage-1)*32;
  for(var i=0;i<32;i++){
    var lbl=labels[i]||('BTN-'+(offset+i+1));
    var btn=document.createElement('div');
    btn.className='ucp-btn'+(ucpType==='salvo'?' salvo':ucpType==='macro'?' macro':'');
    btn.setAttribute('data-idx',i);
    btn.innerHTML='<span style="font-size:9px;font-weight:bold">'+(i+1)+'</span><span class="ucp-lbl">'+lbl+'</span>';
    (function(idx,label){
      btn.onclick=function(){ucpBtnClick(idx,label,this);};
    })(i,lbl);
    grid.appendChild(btn);
  }
  document.getElementById('ucp-status').textContent='32 buttons \u2022 Page '+ucpPage+' \u2022 '+ucpType.toUpperCase();
}

function ucpBtnClick(idx,label,el){
  document.querySelectorAll('.ucp-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  ucpSelected={idx:idx,label:label};
  var cfg=document.getElementById('ucp-config');
  if(ucpType==='source'){
    el.classList.remove('active');
    el.classList.add('pgm');
    cfg.innerHTML='<span style="color:var(--grn)">&#10003;</span> Routed <b style="color:var(--tx)">'+label+'</b> to PGM bus via Cerebrum';
  } else if(ucpType==='salvo'){
    cfg.innerHTML='<span style="color:var(--ylw)">&#9654;</span> Executing salvo: <b style="color:var(--tx)">'+label+'</b> &mdash; <span style="color:var(--mu2)">'+Math.floor(Math.random()*6+2)+' routes applied</span>';
  } else if(ucpType==='macro'){
    cfg.innerHTML='<span style="color:#c084fc">&#9654;</span> Running macro: <b style="color:var(--tx)">'+label+'</b>';
  } else {
    cfg.innerHTML='Monitoring tally for: <b style="color:var(--tx)">'+label+'</b>';
  }
}

function setMlLevel(l,el){
  mlLevel=l;
  document.querySelectorAll('.ml-level-tab').forEach(function(t){t.classList.remove('on');});
  if(el)el.classList.add('on');
  renderMlRouter();
}

function renderMlRouter(){
  var tbl=document.getElementById('ml-xp-table');
  if(!tbl)return;
  var cols=ML_SRCS.length;
  var rows=ML_DSTS.length;
  var html2='<tr><th class="ml-xp-hdr" style="background:var(--bg2)">DST \\ SRC</th>';
  ML_SRCS.forEach(function(s){html2+='<th class="ml-xp-hdr">'+s+'</th>';});
  html2+='</tr>';
  ML_DSTS.forEach(function(dst,di){
    html2+='<tr><td class="ml-xp-hdr" style="text-align:left;padding-left:8px">'+dst+'</td>';
    ML_SRCS.forEach(function(src,si){
      var key=mlLevel+':'+dst+':'+src;
      var routed=mlRoutes[mlLevel+':'+dst]===src;
      var locked=mlLocks[key];
      var prot=mlProtects[key];
      var cls=routed?'routed':locked?'locked':prot?'protected':'';
      var lbl=routed?src.split('-')[1]||src:'';
      html2+='<td class="ml-xp-cell '+cls+'" onclick="mlRoute(\''+dst+'\',\''+src+'\')" title="'+src+' \u2192 '+dst+'">'+lbl+'</td>';
    });
    html2+='</tr>';
  });
  tbl.innerHTML=html2;
  var active=Object.keys(mlRoutes).filter(function(k){return k.indexOf(mlLevel+':')===0;}).length;
  var st=document.getElementById('ml-status');
  if(st)st.textContent=active+' routes active on '+mlLevel+' level';
}

function mlRoute(dst,src){
  mlRoutes[mlLevel+':'+dst]=src;
  renderMlRouter();
  addAlarm('info','Route: '+src+' \u2192 '+dst+' ['+mlLevel+']');
}
function mlProtect(){if(ucpSelected)mlProtects[mlLevel+':'+ucpSelected.label+':'+ucpSelected.label]=true;}
function mlLock(){if(ucpSelected)mlLocks[mlLevel+':'+ucpSelected.label+':'+ucpSelected.label]=true;}
function mlForce(){renderMlRouter();}
function mlClearSel(){ucpSelected=null;}

var UMD_SOURCES=['CAM-01','CAM-02','CAM-03','CAM-04','CAM-05','CAM-06','CAM-07','CAM-08',
  'REPLAY-01','REPLAY-02','GFX-01','GFX-02'];
var umdStates={};

function setTallyBus(b,el){
  tallyBus=b;
  document.querySelectorAll('#cbp-tally .btn').forEach(function(btn){if(['PGM','PVW','AUX 1','AUX 2'].indexOf(btn.textContent)>=0)btn.classList.remove('on');});
  if(el)el.classList.add('on');
  renderTally2();
}

function renderTally2(){
  var list=document.getElementById('umd-list');
  if(!list)return;
  list.innerHTML='';
  UMD_SOURCES.forEach(function(src,i){
    var state=umdStates[src]||'off';
    var row=document.createElement('div');
    row.className='umd-row';
    row.innerHTML='<span style="flex:1;color:var(--tx);font-size:11px">'+src+'</span>'+
      '<div class="umd-box '+(state==='pgm'?'pgm':state==='pvw'?'pvw':'off')+'" onclick="cycleUmd(\''+src+'\')" title="Click to cycle tally">'+
      (state==='pgm'?'PGM':state==='pvw'?'PVW':'OFF')+'</div>'+
      '<span style="color:var(--mu2);font-size:9px;width:60px">'+tallyBus+'</span>'+
      '<span style="color:var(--mu2);font-size:9px;width:80px">UMD-'+(i<9?'0'+(i+1):(i+1))+'</span>';
    list.appendChild(row);
  });
}

function cycleUmd(src){
  var cur=umdStates[src]||'off';
  umdStates[src]=cur==='off'?'pvw':cur==='pvw'?'pgm':'off';
  renderTally2();
}
function tallyAll(){UMD_SOURCES.forEach(function(s){umdStates[s]='pvw';});renderTally2();}
function tallyClear(){umdStates={};renderTally2();}

var DEV_CTRL_DATA={
  ember:[
    {name:'LAWO MC2-56',type:'Audio Console',proto:'Ember+',ip:'192.168.1.10',status:'ok',val:'Online — 96ch'},
    {name:'LAWO A__UHD Core',type:'Audio Engine',proto:'Ember+',ip:'192.168.1.11',status:'ok',val:'Online — 256ch'},
    {name:'Calrec Apollo',type:'Audio Console',proto:'Ember+',ip:'192.168.1.12',status:'warn',val:'Latency 45ms'},
    {name:'Nevion VideoIPath',type:'Router',proto:'Ember+',ip:'192.168.1.20',status:'ok',val:'256x256 sync'}
  ],
  nmos:[
    {name:'Sony HDC-5500',type:'Camera',proto:'NMOS IS-04',ip:'192.168.2.10',status:'ok',val:'IS-04 v1.3'},
    {name:'Grass Valley LDX 150',type:'Camera',proto:'NMOS IS-04',ip:'192.168.2.11',status:'ok',val:'IS-04 v1.3'},
    {name:'Evertz 7800',type:'Multiviewer',proto:'NMOS IS-05',ip:'192.168.2.20',status:'ok',val:'IS-05 v1.1'}
  ],
  gvg:[
    {name:'GVG Kayenne',type:'Switcher',proto:'GVG 7600',ip:'192.168.3.10',status:'ok',val:'Connected'},
    {name:'GVG Korona',type:'Switcher',proto:'GVG 7600',ip:'192.168.3.11',status:'ok',val:'Connected'}
  ],
  probel:[
    {name:'Miranda NV8576',type:'Router',proto:'SW-P-08',ip:'192.168.4.10',status:'ok',val:'576x576'},
    {name:'Snell Sirius 800',type:'Router',proto:'SW-P-08',ip:'192.168.4.11',status:'warn',val:'Partial sync'}
  ],
  sony9:[
    {name:'Sony BVW-75',type:'VTR',proto:'Sony 9-pin',ip:'COM3',status:'ok',val:'STOP'},
    {name:'Sony SRW-5800',type:'VTR',proto:'Sony 9-pin',ip:'COM4',status:'ok',val:'PLAY'}
  ],
  bvs:[
    {name:'Sony BVS-3200',type:'Switcher',proto:'BVS',ip:'192.168.5.10',status:'ok',val:'Connected'},
    {name:'Sony MVS-8000X',type:'Switcher',proto:'BVS',ip:'192.168.5.11',status:'ok',val:'Connected'}
  ]
};

function setDevProto(p,el){
  devProto=p;
  document.querySelectorAll('#cbp-devctrl .btn').forEach(function(b){
    if(['EMBER+','NMOS','GVG 7600','PROBEL SW-P-08','SONY 9-PIN','BVS'].indexOf(b.textContent)>=0)b.classList.remove('on');
  });
  if(el)el.classList.add('on');
  renderDevCtrl();
}

function renderDevCtrl(){
  var list=document.getElementById('dev-ctrl-list');
  if(!list)return;
  list.innerHTML='';
  var devs=DEV_CTRL_DATA[devProto]||[];
  devs.forEach(function(d){
    var row=document.createElement('div');
    row.className='dev-ctrl-row';
    row.innerHTML='<div class="dev-status-dot '+d.status+'"></div>'+
      '<span style="flex:1;color:var(--tx);font-size:11px">'+d.name+'</span>'+
      '<span style="color:var(--mu2);font-size:9px;width:120px">'+d.type+'</span>'+
      '<span style="color:var(--mu2);font-size:9px;width:100px">'+d.ip+'</span>'+
      '<span class="cb-badge '+(d.status==='ok'?'ok':d.status==='warn'?'warn':'live')+'">'+d.val+'</span>'+
      '<button class="btn" style="padding:2px 8px;font-size:9px" onclick="devCtrlAction(\''+d.name+'\')">CTRL</button>';
    list.appendChild(row);
  });
  if(!devs.length){list.innerHTML='<div style="color:var(--mu2);font-size:11px;padding:10px">No devices found for '+devProto+' protocol</div>';}
}

function devCtrlAction(name){addAlarm('info','Control request sent to: '+name);}
function devCtrlScan(){addAlarm('info','Network scan initiated for '+devProto+' devices...');setTimeout(function(){addAlarm('ok','Scan complete');},1500);}

function renderMacros(){
  var list=document.getElementById('macro-list');
  if(!list)return;
  var q=(document.getElementById('macro-search')||{}).value||'';
  list.innerHTML='';
  var filtered=macroList.filter(function(m){return !q||m.name.toLowerCase().indexOf(q.toLowerCase())>=0;});
  filtered.forEach(function(m,i){
    var row=document.createElement('div');
    row.className='macro-row';
    row.innerHTML='<span class="macro-name">'+m.name+'</span>'+
      '<span class="macro-steps">'+m.steps+' steps</span>'+
      '<span class="cb-badge '+(m.type==='salvo'?'warn':'ok')+'">'+m.type.toUpperCase()+'</span>'+
      '<button class="btn grn" style="padding:2px 8px;font-size:9px" onclick="runMacro(\''+m.name+'\')">&#9654; RUN</button>'+
      '<button class="btn" style="padding:2px 8px;font-size:9px" onclick="editMacro(\''+m.name+'\')">EDIT</button>'+
      '<button class="btn red" style="padding:2px 8px;font-size:9px" onclick="deleteMacro('+i+')">&#10005;</button>';
    list.appendChild(row);
  });
  var st=document.getElementById('macro-status');
  if(st)st.textContent=filtered.length+' macros';
}

function runMacro(name){addAlarm('info','Macro executing: '+name);}
function editMacro(name){addAlarm('info','Edit macro: '+name);}
function deleteMacro(i){macroList.splice(i,1);renderMacros();}
function macroRecord(){addAlarm('warn','Macro recording started...');}
function macroStop(){addAlarm('ok','Macro recording stopped');}
function macroNew(){var n='MACRO-'+(macroList.length+1);macroList.push({name:n,steps:0,type:'macro',running:false});renderMacros();}

function renderAutomation(){
  var trig=document.getElementById('auto-triggers');
  if(!trig)return;
  trig.innerHTML='';
  autoTriggers.forEach(function(t,i){
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--bg3);border-radius:3px;border:1px solid var(--bd);margin-bottom:4px;font-size:10px';
    row.innerHTML='<input type="checkbox" '+(t.active?'checked':'')+'  onchange="autoTriggers['+i+'].active=this.checked">'+
      '<span style="flex:1;color:var(--mu2)">IF <b style="color:var(--tx)">'+t.cond+'</b></span>'+
      '<span style="color:var(--ac)">&#8594; '+t.action+'</span>'+
      '<button class="btn red" style="padding:1px 6px;font-size:9px" onclick="autoTriggers.splice('+i+',1);renderAutomation()">&#10005;</button>';
    trig.appendChild(row);
  });
}

function addAutoTrigger(){
  autoTriggers.push({cond:'TIMECODE >= 00:00:00',action:'RUN MACRO: CUSTOM',active:false});
  renderAutomation();
}

function setAutoMode(m,el){
  document.querySelectorAll('#cbp-automation .btn').forEach(function(b){if(['MANUAL','SEMI-AUTO','FULL AUTO'].indexOf(b.textContent)>=0)b.classList.remove('on');});
  if(el)el.classList.add('on');
  addAlarm('info','Automation mode: '+m.toUpperCase());
}
function autoLoad(){addAlarm('ok','Rundown loaded into automation engine');}

function renderSysHealth(){
  var list=document.getElementById('health-list');
  if(!list)return;
  list.innerHTML='';
  healthItems.forEach(function(h){
    var row=document.createElement('div');
    row.className='dev-ctrl-row';
    row.innerHTML='<div class="dev-status-dot '+h.status+'"></div>'+
      '<span style="flex:1;color:var(--tx);font-size:11px">'+h.name+'</span>'+
      '<span class="cb-badge '+(h.status==='ok'?'ok':h.status==='warn'?'warn':'live')+'">'+h.val+'</span>';
    list.appendChild(row);
  });
  renderAlarmLog();
}

function addAlarm(sev,msg){
  var now=new Date();
  var t=now.toLocaleTimeString('en-GB',{hour12:false});
  alarmLog.unshift({sev:sev,msg:msg,time:t});
  if(alarmLog.length>50)alarmLog.pop();
  renderAlarmLog();
}

function renderAlarmLog(){
  var log=document.getElementById('alarm-log');
  if(!log)return;
  log.innerHTML='';
  alarmLog.slice(0,20).forEach(function(a){
    var row=document.createElement('div');
    row.className='alarm-row '+a.sev;
    var icon=a.sev==='crit'?'\u26a0':a.sev==='warn'?'\u26a0':a.sev==='ok'?'\u2713':'\u2139';
    row.innerHTML='<span style="color:var(--mu2);font-size:9px;white-space:nowrap">'+a.time+'</span>'+
      '<span style="font-size:10px">'+icon+'</span>'+
      '<span style="flex:1">'+a.msg+'</span>';
    log.appendChild(row);
  });
}

function clearAlarms(){alarmLog=[];renderAlarmLog();}

// Init Cerebrum when view is opened
var _origSv=sv;
sv=function(id,el){
  _origSv(id,el);
  if(id==='cerebrum'){
    renderUcp();
    renderSysHealth();
  }
};
`;

// inject before closing </script>
if (!html.includes('CEREBRUM BCS')) {
  html = html.replace('</script>', CEREBRUM_JS + '\n</script>');
}

// ── 8. Write output ───────────────────────────────────────────────────────
fs.writeFileSync(FILE, html, 'utf8');
console.log('Cerebrum patch applied. File size: ' + html.length + ' bytes');

// ── 9. Validate JS ────────────────────────────────────────────────────────
var m = html.match(/<script>([\s\S]*?)<\/script>/);
if (m) {
  try { new Function(m[1]); console.log('JS VALID'); }
  catch(e) { console.log('JS ERROR:', e.message); }
} else {
  console.log('No script tag found');
}
