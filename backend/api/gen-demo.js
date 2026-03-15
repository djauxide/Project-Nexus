// NEXUS v4 Demo Generator
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'nexus-demo.html');
const H = []; const a = s => H.push(s);
// Safe unicode helpers — no raw HTML tags inside JS string literals
const U = s => s; // passthrough, used for clarity

// ── HEAD + CSS ────────────────────────────────────────────────────────────
a('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">');
a('<meta name="viewport" content="width=device-width,initial-scale=1">');
a('<title>NEXUS v4 \u2014 Broadcast Orchestration Platform</title>');
a('<style>');
a('*{box-sizing:border-box;margin:0;padding:0}');
a(':root{--bg:#080808;--bg2:#0f0f0f;--bg3:#161616;--bg4:#1c1c1c;--bd:#1e1e1e;--bd2:#2a2a2a;--ac:#00b4d8;--ac2:#0077b6;--red:#ef233c;--grn:#06d6a0;--ylw:#ffd166;--pur:#7b2d8b;--tx:#e0e0e0;--mu:#555;--mu2:#888}');
a('body{background:var(--bg);color:var(--tx);font-family:"Courier New",monospace;font-size:12px;display:flex;flex-direction:column;height:100vh;overflow:hidden}');

// Auth
a('#auth{position:fixed;inset:0;background:rgba(8,8,8,.97);display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column}');
a('.abox{background:var(--bg2);border:1px solid var(--bd2);border-radius:10px;padding:44px 52px;width:400px;text-align:center;box-shadow:0 0 60px rgba(0,180,216,.08)}');
a('.alogo{font-size:30px;font-weight:bold;color:var(--ac);letter-spacing:5px;margin-bottom:2px}');
a('.asub{color:var(--mu2);font-size:10px;margin-bottom:30px;letter-spacing:2px;text-transform:uppercase}');
a('.abox label{display:block;text-align:left;font-size:9px;color:var(--mu2);margin-bottom:3px;text-transform:uppercase;letter-spacing:1px}');
a('.abox input,.abox select{width:100%;background:var(--bg);border:1px solid var(--bd2);color:var(--tx);padding:9px 12px;border-radius:5px;font-family:inherit;font-size:12px;margin-bottom:14px;outline:none;transition:border-color .2s}');
a('.abox input:focus,.abox select:focus{border-color:var(--ac)}');
a('.btnlogin{width:100%;padding:11px;background:var(--ac);color:#000;border:none;border-radius:5px;font-family:inherit;font-size:13px;font-weight:bold;cursor:pointer;letter-spacing:2px;transition:background .2s}');
a('.btnlogin:hover{background:#0cf}');
a('.aerr{color:var(--red);font-size:10px;margin-top:8px;min-height:16px}');
a('.ahint{color:#333;font-size:10px;margin-top:18px;line-height:1.8}');
a('.ahint b{color:#444}');

// Layout
a('#app{display:flex;flex:1;overflow:hidden}');
a('#sb{width:210px;background:var(--bg2);border-right:1px solid var(--bd);display:flex;flex-direction:column;transition:width .18s;flex-shrink:0;overflow:hidden}');
a('#sb.col{width:46px}');
a('.sbh{display:flex;align-items:center;justify-content:space-between;padding:0 10px;height:46px;border-bottom:1px solid var(--bd);flex-shrink:0}');
a('.sblogo{color:var(--ac);font-weight:bold;font-size:13px;letter-spacing:3px;white-space:nowrap}');
a('#sb.col .sblogo{display:none}');
a('.sbtog{background:none;border:none;color:var(--mu2);cursor:pointer;font-size:15px;padding:3px;flex-shrink:0;line-height:1}');
a('.sbtog:hover{color:var(--tx)}');
a('.sbnav{flex:1;overflow-y:auto;padding:4px 0}');
a('.sbsec{font-size:8px;color:#2a2a2a;padding:10px 12px 3px;text-transform:uppercase;letter-spacing:2px;white-space:nowrap}');
a('#sb.col .sbsec{display:none}');
a('.sbi{display:flex;align-items:center;gap:9px;padding:8px 12px;cursor:pointer;border-left:3px solid transparent;color:var(--mu2);white-space:nowrap;overflow:hidden;user-select:none;transition:all .15s}');
a('.sbi:hover{background:var(--bg3);color:var(--tx)}');
a('.sbi.on{border-left-color:var(--ac);color:var(--ac);background:rgba(0,180,216,.06)}');
a('.sbi.eng-only{opacity:.35;pointer-events:none}');
a('.sbi.eng-only.unlocked{opacity:1;pointer-events:auto}');
a('.sbic{font-size:14px;flex-shrink:0;width:18px;text-align:center}');
a('.sblb{font-size:11px}');
a('#sb.col .sblb{display:none}');
a('.sbft{padding:8px;border-top:1px solid var(--bd);flex-shrink:0}');
a('.sbuser{display:flex;align-items:center;gap:8px;padding:5px 4px;margin-bottom:6px}');
a('.sbav{width:28px;height:28px;border-radius:50%;background:var(--ac);color:#000;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:10px;flex-shrink:0}');
a('.sbui{overflow:hidden;flex:1}');
a('.sbun{font-size:11px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
a('.sbrl{font-size:8px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px}');
a('#sb.col .sbui{display:none}');
a('.btnout{width:100%;padding:5px;background:none;border:1px solid var(--bd2);color:var(--mu2);border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;transition:all .15s}');
a('.btnout:hover{border-color:var(--red);color:var(--red)}');
a('#sb.col .btnout{display:none}');

// Main
a('#main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}');
a('.topbar{background:var(--bg2);border-bottom:1px solid var(--bd);padding:0 14px;height:46px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}');
a('.tbtitle{color:var(--tx);font-size:12px;font-weight:bold;letter-spacing:1px}');
a('.tbr{display:flex;align-items:center;gap:12px;font-size:10px;color:var(--mu2)}');
a('.dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:3px;flex-shrink:0}');
a('.dot.g{background:var(--grn)}.dot.r{background:var(--red)}.dot.y{background:var(--ylw)}.dot.x{background:#333}.dot.p{background:var(--pur)}');
a('.content{flex:1;overflow-y:auto;padding:14px;min-height:0}');
a('.view{display:none}.view.on{display:block}');
a('.rbadge{padding:2px 8px;border-radius:10px;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}');
a('.rbadge.VIEWER{background:#1a1a1a;color:#666}.rbadge.OPERATOR{background:rgba(6,214,160,.1);color:var(--grn)}.rbadge.ENGINEER{background:rgba(0,180,216,.1);color:var(--ac)}.rbadge.TRAINER{background:rgba(255,209,102,.1);color:var(--ylw)}');

// Cards / common
a('.card{background:var(--bg2);border:1px solid var(--bd);border-radius:6px;padding:12px;margin-bottom:10px}');
a('.card-title{font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}');
a('.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}');
a('.col2{display:grid;grid-template-columns:1fr 1fr;gap:10px}');
a('.col3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}');
a('.btn{padding:4px 12px;background:var(--bg3);color:var(--mu2);border:1px solid var(--bd2);border-radius:3px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .15s}');
a('.btn:hover{border-color:var(--ac);color:var(--ac)}');
a('.btn.on{background:var(--ac);color:#000;border-color:var(--ac)}');
a('.btn.red{background:var(--red);color:#fff;border-color:var(--red)}');
a('.btn.grn{background:var(--grn);color:#000;border-color:var(--grn)}');
a('.btn.ylw{background:var(--ylw);color:#000;border-color:var(--ylw)}');
a('.btn:disabled{opacity:.3;cursor:not-allowed}');
a('input[type=number],input[type=text],select{background:var(--bg);border:1px solid var(--bd2);color:var(--tx);padding:5px 8px;border-radius:3px;font-family:inherit;font-size:11px;outline:none}');
a('input:focus,select:focus{border-color:var(--ac)}');
a('.tag{font-size:8px;padding:2px 6px;border-radius:10px;background:var(--bg3);color:var(--mu2)}');
a('.tag.live{background:rgba(239,35,60,.15);color:var(--red);border:1px solid rgba(239,35,60,.3)}');
a('.tag.cloud{background:rgba(0,180,216,.1);color:var(--ac)}');
a('.tag.ok{background:rgba(6,214,160,.1);color:var(--grn)}');
a('.tag.warn{background:rgba(255,209,102,.1);color:var(--ylw)}');
a('.sep{color:var(--bd2)}');
a('::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}');
a('</style></head><body>');

// ── AUTH ──────────────────────────────────────────────────────────────────
a('<div id="auth">');
a('<div class="abox">');
a('<div class="alogo">NEXUS v4</div>');
a('<div class="asub">Broadcast Orchestration Platform</div>');
a('<label>Username</label><input id="au" type="text" value="operator@nexus.studio">');
a('<label>Password</label><input id="ap" type="password" value="nexus2024">');
a('<label>Role</label>');
a('<select id="ar">');
a('<option value="VIEWER">VIEWER \u2014 Monitor only</option>');
a('<option value="OPERATOR" selected>OPERATOR \u2014 Production control</option>');
a('<option value="ENGINEER">ENGINEER \u2014 Full system access</option>');
a('<option value="TRAINER">TRAINER \u2014 Training mode</option>');
a('</select>');
a('<button class="btnlogin" onclick="doLogin()">SIGN IN</button>');
a('<div class="aerr" id="aerr"></div>');
a('<div class="ahint"><b>Demo:</b> any username &bull; password: nexus2024<br>Role controls access to engineering features</div>');
a('</div></div>');

// ── APP SHELL ─────────────────────────────────────────────────────────────
a('<div id="app" style="display:none">');
a('<div id="sb">');
a('<div class="sbh"><span class="sblogo">NEXUS</span><button class="sbtog" onclick="toggleSb()">&#9776;</button></div>');
a('<div class="sbnav">');
// LIVE section
a('<div class="sbsec">LIVE</div>');
a('<div class="sbi on" onclick="sv(\'live\',this)"><span class="sbic">&#128308;</span><span class="sblb">ON AIR</span></div>');
// MONITORING
a('<div class="sbsec">MONITORING</div>');
a('<div class="sbi" onclick="sv(\'mosaic\',this)"><span class="sbic">&#9638;</span><span class="sblb">MOSAIC</span></div>');
a('<div class="sbi" onclick="sv(\'scope\',this)"><span class="sbic">&#128202;</span><span class="sblb">SCOPES</span></div>');
a('<div class="sbi" onclick="sv(\'sync\',this)"><span class="sbic">&#9201;</span><span class="sblb">SYNC / PTP</span></div>');
// CONTROL
a('<div class="sbsec">CONTROL</div>');
a('<div class="sbi" onclick="sv(\'switch\',this)"><span class="sbic">&#127916;</span><span class="sblb">SWITCHER</span></div>');
a('<div class="sbi" onclick="sv(\'router\',this)"><span class="sbic">&#128257;</span><span class="sblb">ROUTER</span></div>');
a('<div class="sbi" onclick="sv(\'cloud\',this)"><span class="sbic">&#9729;</span><span class="sblb">CLOUD / SRT</span></div>');
a('<div class="sbi" onclick="sv(\'connect\',this)"><span class="sbic">&#128279;</span><span class="sblb">CONNECT</span></div>');
// ENGINEERING — locked for OPERATOR
a('<div class="sbsec">ENGINEERING</div>');
a('<div class="sbi eng-only" id="sb-devices" onclick="sv(\'devices\',this)"><span class="sbic">&#128225;</span><span class="sblb">DEVICES</span></div>');
a('<div class="sbi eng-only" id="sb-api" onclick="sv(\'api\',this)"><span class="sbic">&#9889;</span><span class="sblb">API EXPLORER</span></div>');
a('<div class="sbi eng-only" id="sb-predeploy" onclick="sv(\'predeploy\',this)"><span class="sbic">&#9989;</span><span class="sblb">PRE-DEPLOY</span></div>');
a('</div>');
a('<div class="sbft">');
a('<div class="sbuser"><div class="sbav" id="sbav">OP</div><div class="sbui"><div class="sbun" id="sbun">operator</div><div class="sbrl" id="sbrl">OPERATOR</div></div></div>');
a('<button class="btnout" onclick="doLogout()">&#9211; Sign Out</button>');
a('</div></div>');

// MAIN
a('<div id="main">');
a('<div class="topbar">');
a('<span class="tbtitle" id="tbtitle">ON AIR \u2014 Live Production</span>');
a('<div class="tbr">');
a('<span id="tb-onair-badge"></span>');
a('<span><span class="dot g" id="tbptpdot"></span>PTP <span id="tbptp">LOCKED</span></span>');
a('<span>NMOS <span id="tbnmos">0</span></span>');
a('<span>ST2110 <span id="tbflows">0</span></span>');
a('<span><span class="dot x" id="tbwsdot"></span><span id="tbws">WS offline</span></span>');
a('<span class="rbadge OPERATOR" id="tbrole">OPERATOR</span>');
a('<span id="tbclock" style="color:var(--tx);font-weight:bold"></span>');
a('</div></div>');
a('<div class="content">');

// ── LIVE VIEW ─────────────────────────────────────────────────────────────
a('<div id="v-live" class="view on">');
a('<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">');
// On-Air clock
a('<div class="card">');
a('<div class="card-title">ON AIR CLOCK</div>');
a('<div id="live-clock" style="font-size:36px;font-weight:bold;color:var(--red);letter-spacing:3px;font-variant-numeric:tabular-nums">00:00:00</div>');
a('<div style="font-size:9px;color:var(--mu2);margin-top:4px">UTC <span id="live-utc"></span></div>');
a('</div>');
// Show timer
a('<div class="card">');
a('<div class="card-title">SHOW TIMER</div>');
a('<div id="show-timer" style="font-size:36px;font-weight:bold;color:var(--ylw);letter-spacing:3px;font-variant-numeric:tabular-nums">00:00:00</div>');
a('<div class="row" style="margin-top:8px;gap:6px">');
a('<button class="btn grn" onclick="showTimerStart()" id="btn-ststart">START</button>');
a('<button class="btn red" onclick="showTimerStop()">STOP</button>');
a('<button class="btn" onclick="showTimerReset()">RESET</button>');
a('</div></div>');
// Tally status
a('<div class="card">');
a('<div class="card-title">TALLY STATUS</div>');
a('<div class="row" style="gap:8px;flex-wrap:wrap" id="tally-panel"></div>');
a('</div></div>');
// Segment rundown
a('<div class="card">');
a('<div class="card-title">SEGMENT RUNDOWN</div>');
a('<div id="rundown-list" style="display:flex;flex-direction:column;gap:4px"></div>');
a('<div class="row" style="margin-top:8px;gap:6px">');
a('<input id="seg-name" type="text" placeholder="Segment name..." style="flex:1">');
a('<input id="seg-dur" type="number" placeholder="Dur(s)" style="width:70px" value="120">');
a('<button class="btn grn" onclick="addSegment()">+ ADD</button>');
a('</div></div>');
// Comms / IFB
a('<div class="card" style="margin-top:0">');
a('<div class="card-title">COMMS / IFB</div>');
a('<div id="comms-list" style="display:flex;flex-direction:column;gap:5px"></div>');
a('</div>');
// Production info
a('<div class="card" style="margin-top:0">');
a('<div class="card-title">PRODUCTION</div>');
a('<div style="font-size:11px;line-height:2;color:var(--mu2)">');
a('Show: <span style="color:var(--tx)" id="prod-show">NEXUS LIVE EP.01</span><br>');
a('Venue: <span style="color:var(--tx)" id="prod-venue">Studio A \u2014 London</span><br>');
a('Director: <span style="color:var(--tx)">J. Smith</span><br>');
a('TX: <span class="tag live">LIVE</span> <span id="prod-tx">BBC ONE HD</span>');
a('</div></div>');
a('</div>');

// ── MOSAIC VIEW ───────────────────────────────────────────────────────────
a('<div id="v-mosaic" class="view">');
// Layout toolbar
a('<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">');
a('<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">LAYOUT:</span>');
a('<button class="btn on" onclick="setLay(1,1,this)">1x1</button>');
a('<button class="btn" onclick="setLay(2,2,this)">2x2</button>');
a('<button class="btn" onclick="setLay(3,3,this)">3x3</button>');
a('<button class="btn" onclick="setLay(4,4,this)">4x4</button>');
a('<button class="btn" onclick="setLay(2,4,this)">2x4</button>');
a('<button class="btn" onclick="setLay(3,4,this)">3x4</button>');
a('<button class="btn" onclick="setLay(4,6,this)">4x6</button>');
a('<button class="btn" onclick="setLay(5,8,this)">5x8</button>');
a('<span style="color:var(--bd2);margin:0 4px">|</span>');
a('<span style="color:var(--mu2);font-size:9px">SAVE:</span>');
a('<input id="lay-name" type="text" placeholder="Layout name..." style="width:130px">');
a('<button class="btn grn" onclick="saveLayout()">SAVE</button>');
a('<span style="color:var(--mu2);font-size:9px">RECALL:</span>');
a('<select id="lay-recall" onchange="recallLayout(this.value)" style="width:140px"><option value="">-- saved layouts --</option></select>');
a('<span style="color:var(--bd2);margin:0 4px">|</span>');
a('<span style="color:var(--mu2);font-size:9px">ASSIGN:</span>');
a('<select id="mv-src-sel" style="width:130px"><option value="">-- source --</option></select>');
a('<button class="btn" onclick="assignSelected()">ASSIGN SELECTED</button>');
a('</div>');
a('<div id="mvg" style="display:grid;gap:2px;background:#000;user-select:none"></div>');
a('</div>');

// ── SWITCHER VIEW ─────────────────────────────────────────────────────────
a('<div id="v-switch" class="view">');
a('<div class="card"><div class="card-title">PREVIEW BUS</div><div id="pvwbus" style="display:flex;flex-wrap:wrap;gap:3px"></div></div>');
a('<div class="card"><div class="card-title">PROGRAM BUS</div><div id="pgmbus" style="display:flex;flex-wrap:wrap;gap:3px"></div></div>');
a('<div class="card">');
a('<div class="row" style="gap:12px;flex-wrap:wrap">');
a('<div><div class="card-title">TRANSITION</div><div id="tbtns" style="display:flex;gap:3px">');
a('<button class="btn on" onclick="setTr(\'CUT\',this)">CUT</button>');
a('<button class="btn" onclick="setTr(\'MIX\',this)">MIX</button>');
a('<button class="btn" onclick="setTr(\'WIPE\',this)">WIPE</button>');
a('<button class="btn" onclick="setTr(\'DIP\',this)">DIP</button>');
a('<button class="btn" onclick="setTr(\'STING\',this)">STING</button>');
a('</div></div>');
a('<div><div class="card-title">RATE (frames)</div><input id="rateinp" type="number" min="1" max="250" value="25" style="width:65px"></div>');
a('<button class="btn red" style="padding:10px 32px;font-size:14px;font-weight:bold" onclick="doCut()" id="btn-cut">CUT</button>');
a('<button class="btn on" style="padding:10px 32px;font-size:14px;font-weight:bold" onclick="doAuto()" id="btn-auto">AUTO</button>');
a('<div><div style="font-size:9px;color:var(--mu2);margin-bottom:3px" id="autolbl"></div><div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;width:180px"><div id="pfill" style="height:100%;background:var(--ac);width:0%;transition:width .04s linear"></div></div></div>');
a('</div></div>');
a('<div style="font-size:10px;color:var(--mu2);margin-top:6px" id="swstat"></div>');
a('</div>');

// ── ROUTER VIEW (NEP/TFC-style NxM crosspoint) ────────────────────────────
a('<div id="v-router" class="view">');
a('<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;flex-wrap:wrap">');
a('<span style="color:var(--mu2);font-size:9px;text-transform:uppercase;letter-spacing:1px">FILTER:</span>');
a('<input id="rt-filter" type="text" placeholder="Filter sources/dests..." style="width:180px" oninput="renderRouter()">');
a('<select id="rt-cat" onchange="renderRouter()" style="width:140px">');
a('<option value="">All Types</option><option>Video</option><option>Audio</option><option>Data</option><option>AES67</option><option>ST2110-20</option><option>ST2110-30</option>');
a('</select>');
a('<button class="btn" onclick="clearAllRoutes()">CLEAR ALL</button>');
a('<button class="btn grn" onclick="lockRoutes()">LOCK ROUTES</button>');
a('<span style="color:var(--mu2);font-size:9px" id="rt-status">0 active routes</span>');
a('</div>');
a('<div style="overflow:auto;max-height:calc(100vh - 200px)">');
a('<table id="rt-table" style="border-collapse:collapse;font-size:10px;min-width:600px"></table>');
a('</div></div>');

// ── CLOUD / SRT VIEW ──────────────────────────────────────────────────────
a('<div id="v-cloud" class="view">');
a('<div class="col2">');
// Contribution links
a('<div>');
a('<div class="card-title" style="margin-bottom:8px">CLOUD CONTRIBUTION LINKS</div>');
a('<div id="cloud-links" style="display:flex;flex-direction:column;gap:6px"></div>');
a('<div class="row" style="margin-top:10px;gap:6px">');
a('<input id="cl-name" type="text" placeholder="Link name..." style="flex:1">');
a('<select id="cl-proto" style="width:90px"><option>SRT</option><option>RIST</option><option>NDI</option><option>RTMP</option><option>HLS</option></select>');
a('<input id="cl-url" type="text" placeholder="srt://host:port" style="flex:2">');
a('<button class="btn grn" onclick="addCloudLink()">+ ADD</button>');
a('</div></div>');
// Media transport stats
a('<div>');
a('<div class="card-title" style="margin-bottom:8px">TRANSPORT STATISTICS</div>');
a('<div id="cloud-stats" style="display:flex;flex-direction:column;gap:6px"></div>');
a('</div></div>');
// Cloud regions
a('<div class="card" style="margin-top:10px">');
a('<div class="card-title">CLOUD REGIONS / MEDIA NODES</div>');
a('<div id="cloud-regions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"></div>');
a('</div></div>');

// ── SCOPES VIEW ───────────────────────────────────────────────────────────
a('<div id="v-scope" class="view">');
a('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">');
a('<div class="card"><div class="card-title">Waveform Monitor</div><canvas id="cvw" height="180"></canvas></div>');
a('<div class="card"><div class="card-title">Vectorscope</div><canvas id="cvv" height="180"></canvas></div>');
a('<div class="card"><div class="card-title">RGB Parade</div><canvas id="cvp" height="180"></canvas></div>');
a('<div class="card"><div class="card-title">Loudness (LUFS)</div><canvas id="cvl" height="180"></canvas></div>');
a('</div></div>');

// ── SYNC VIEW ─────────────────────────────────────────────────────────────
a('<div id="v-sync" class="view">');
a('<div class="card">');
a('<div class="card-title">PTP OFFSET FROM MASTER</div>');
a('<div style="font-size:40px;font-weight:bold;color:var(--ac);font-variant-numeric:tabular-nums"><span id="ptpval">8</span><span style="font-size:13px;color:var(--mu2)"> ns</span></div>');
a('<div class="row" style="margin-top:8px;font-size:11px;color:var(--mu2);gap:20px;flex-wrap:wrap">');
a('<div><b id="ptpst" style="color:var(--tx)">LOCKED</b> Status</div>');
a('<div>GM: <b style="color:var(--tx)">NEXUS-GM-01</b></div>');
a('<div>Domain: <b style="color:var(--tx)">0</b></div>');
a('<div>Class: <b style="color:var(--tx)">6</b></div>');
a('<div>Profile: <b style="color:var(--tx)">AES67 / ST 2059-2</b></div>');
a('<div>Devices: <b style="color:var(--tx)" id="ptpdevs">12</b></div>');
a('</div></div>');
a('<div class="card-title" style="margin-top:10px;margin-bottom:4px">LIVE LOG</div>');
a('<div id="ptplog" style="background:#050505;border:1px solid var(--bd);border-radius:3px;padding:8px;height:150px;overflow-y:auto;font-size:10px;color:#4a4"></div>');
a('</div>');

// ── CONNECT VIEW ──────────────────────────────────────────────────────────
a('<div id="v-connect" class="view">');
a('<div class="card-title" style="margin-bottom:8px">NMOS IS-04 DISCOVERED DEVICES</div>');
a('<div id="nmoslist"></div>');
a('</div>');

// ── DEVICES VIEW (ENGINEER only) ──────────────────────────────────────────
a('<div id="v-devices" class="view">');
a('<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">');
a('<input id="dsrch" type="text" placeholder="Search manufacturer or model..." style="width:220px" oninput="filterDev()">');
a('<select id="dcat" onchange="filterDev()" style="width:150px">');
a('<option value="">All Categories</option>');
a('<option>Camera</option><option>Replay System</option><option>Audio Console</option>');
a('<option>Router</option><option>Multiviewer</option><option>Encoder/Decoder</option>');
a('<option>Monitor</option><option>Signal Processor</option>');
a('</select>');
a('<span style="color:var(--mu2);font-size:10px" id="dcount"></span>');
a('</div>');
a('<div style="overflow-x:auto">');
a('<table style="width:100%;border-collapse:collapse;font-size:11px" id="devtbl">');
a('<thead><tr style="background:var(--bg2)">');
a('<th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px;white-space:nowrap">Manufacturer</th>');
a('<th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px">Model</th>');
a('<th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px">Category</th>');
a('<th style="padding:6px 10px;text-align:center;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)" title="ST 2110">2110</th>');
a('<th style="padding:6px 10px;text-align:center;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)" title="NMOS IS-04/05">NMOS</th>');
a('<th style="padding:6px 10px;text-align:center;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)" title="AES67">AES67</th>');
a('<th style="padding:6px 10px;text-align:center;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)" title="PTP">PTP</th>');
a('<th style="padding:6px 10px;text-align:center;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)" title="TLS/Auth">TLS</th>');
a('<th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--bd);font-size:9px;color:var(--mu2)">Notes</th>');
a('</tr></thead><tbody id="devtbody"></tbody></table>');
a('</div></div>');

// ── API EXPLORER (ENGINEER only) ──────────────────────────────────────────
a('<div id="v-api" class="view">');
a('<div style="display:grid;grid-template-columns:260px 1fr;gap:10px;height:calc(100vh - 130px)">');
a('<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:6px;overflow-y:auto" id="apilist"></div>');
a('<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:6px;padding:16px;overflow-y:auto" id="apidet"><div style="color:var(--mu2);font-size:12px;margin-top:40px;text-align:center">Select an endpoint</div></div>');
a('</div></div>');

// ── PRE-DEPLOY (ENGINEER only) ────────────────────────────────────────────
a('<div id="v-predeploy" class="view">');
a('<div id="phasecont"></div>');
a('<div id="gobanner" style="padding:14px 20px;border-radius:6px;font-size:14px;font-weight:bold;text-align:center;margin-top:12px;letter-spacing:2px;background:rgba(239,35,60,.1);border:2px solid rgba(239,35,60,.3);color:var(--red)">&#9940; NO-GO \u2014 Complete all checks</div>');
a('</div>');

// Status bar
a('</div>'); // /content
a('<div id="sbar" style="background:var(--bg2);border-top:1px solid var(--bd);padding:4px 14px;display:flex;gap:16px;align-items:center;font-size:10px;color:var(--mu2);flex-shrink:0">');
a('<span><span class="dot g" id="sbptpdot"></span>PTP <span id="sbptp">LOCKED</span></span>');
a('<span style="color:var(--bd2)">|</span>');
a('<span>NMOS <span id="sbnmos">0</span></span>');
a('<span style="color:var(--bd2)">|</span>');
a('<span>ST2110 <span id="sbflows">0</span></span>');
a('<span style="color:var(--bd2)">|</span>');
a('<span><span class="dot x" id="sbwsdot"></span><span id="sbws">WS offline</span></span>');
a('<span style="color:var(--bd2)">|</span>');
a('<span id="sbclock" style="color:var(--tx)"></span>');
a('</div>');
a('</div></div>'); // /main /app

// ── JAVASCRIPT ────────────────────────────────────────────────────────────
a('<script>');
a('var SESS=null,pgm=1,pvw=2,tr="CUT",mrc=4,mrr=4,ws=null,wsok=false,stimer=null,aep=null;');
a('var showTimerVal=0,showTimerRunning=false,showTimerInterval=null;');
a('var selectedCell=null,savedLayouts={},routeLocks={};');
a('var SRCS=[];');
a('for(var i=1;i<=32;i++){');
a('  var n=i<=24?"CAM-"+(i<10?"0"+i:i):i<=29?"REPLAY-0"+(i-24):["PGM","PVW","GFX"][i-30]||("SRC-"+i);');
a('  SRCS.push({id:i,name:n});');
a('}');

// Auth + role
a('var ROLE_PERMS={VIEWER:[],OPERATOR:["live","mosaic","switch","router","cloud","connect","scope","sync"],ENGINEER:["live","mosaic","switch","router","cloud","connect","scope","sync","devices","api","predeploy"],TRAINER:["live","mosaic","switch","router","cloud","connect","scope","sync"]};');
a('function doLogin(){');
a('  var u=document.getElementById("au").value.trim();');
a('  var p=document.getElementById("ap").value;');
a('  var r=document.getElementById("ar").value;');
a('  if(!u){document.getElementById("aerr").textContent="Username required";return;}');
a('  if(p!=="nexus2024"){document.getElementById("aerr").textContent="Invalid password";return;}');
a('  document.getElementById("aerr").textContent="";');
a('  SESS={user:u,role:r,token:"demo-"+r+"-"+Date.now()};');
a('  var ini=u.split("@")[0].slice(0,2).toUpperCase();');
a('  document.getElementById("sbav").textContent=ini;');
a('  document.getElementById("sbun").textContent=u.split("@")[0];');
a('  document.getElementById("sbrl").textContent=r;');
a('  document.getElementById("tbrole").textContent=r;');
a('  document.getElementById("tbrole").className="rbadge "+r;');
a('  document.getElementById("auth").style.display="none";');
a('  document.getElementById("app").style.display="flex";');
a('  applyRole();initApp();');
a('}');
a('function doLogout(){SESS=null;document.getElementById("app").style.display="none";document.getElementById("auth").style.display="flex";document.getElementById("ap").value="";if(ws)try{ws.close();}catch(e){}if(stimer){clearInterval(stimer);stimer=null;}}');
a('function applyRole(){');
a('  var r=SESS?SESS.role:"VIEWER";');
a('  var isEng=r==="ENGINEER";');
a('  ["sb-devices","sb-api","sb-predeploy"].forEach(function(id){');
a('    var el=document.getElementById(id);');
a('    if(el){if(isEng)el.classList.add("unlocked");else el.classList.remove("unlocked");}');
a('  });');
a('  var canOp=r==="OPERATOR"||r==="ENGINEER"||r==="TRAINER";');
a('  ["btn-cut","btn-auto","btn-ststart"].forEach(function(id){var el=document.getElementById(id);if(el){el.disabled=!canOp;el.style.opacity=canOp?"1":"0.35";}});');
a('}');

// Navigation
a('var TITLES={live:"ON AIR \u2014 Live Production",mosaic:"MOSAIC \u2014 Multiviewer",switch:"SWITCHER \u2014 Production Control",router:"ROUTER \u2014 Signal Matrix",cloud:"CLOUD / SRT \u2014 Media Transport",scope:"SCOPES \u2014 Signal Analysis",sync:"SYNC \u2014 PTP Clock",connect:"CONNECT \u2014 NMOS Devices",devices:"DEVICES \u2014 Broadcast Compatibility",api:"API EXPLORER \u2014 Engineering",predeploy:"PRE-DEPLOY \u2014 Checklist"};');
a('function sv(id,el){');
a('  var r=SESS?SESS.role:"VIEWER";');
a('  var perms=ROLE_PERMS[r]||[];');
a('  if(perms.indexOf(id)<0&&r!=="ENGINEER"){return;}');
a('  document.querySelectorAll(".view").forEach(function(v){v.classList.remove("on");});');
a('  document.querySelectorAll(".sbi").forEach(function(i){i.classList.remove("on");});');
a('  document.getElementById("v-"+id).classList.add("on");');
a('  if(el)el.classList.add("on");');
a('  document.getElementById("tbtitle").textContent=TITLES[id]||id;');
a('  if(id==="scope")startScopes();');
a('  if(id==="devices")renderDev();');
a('  if(id==="api")renderApiList();');
a('  if(id==="router")renderRouter();');
a('  if(id==="cloud")renderCloud();');
a('  if(id==="mosaic")renderMV();');
a('}');
a('function toggleSb(){document.getElementById("sb").classList.toggle("col");}');

// LIVE section JS
a('// LIVE');
a('function initLive(){');
a('  renderTally();renderRundown();renderComms();');
a('  setInterval(function(){');
a('    var now=new Date();');
a('    document.getElementById("live-clock").textContent=now.toLocaleTimeString("en-GB",{hour12:false});');
a('    document.getElementById("live-utc").textContent=now.toUTCString().split(" ")[4]+" UTC";');
a('  },500);');
a('}');
a('function showTimerStart(){showTimerRunning=true;if(!showTimerInterval)showTimerInterval=setInterval(function(){if(showTimerRunning){showTimerVal++;var h=Math.floor(showTimerVal/3600),m=Math.floor((showTimerVal%3600)/60),s=showTimerVal%60;document.getElementById("show-timer").textContent=(h<10?"0"+h:h)+":"+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s);}},1000);}');
a('function showTimerStop(){showTimerRunning=false;}');
a('function showTimerReset(){showTimerRunning=false;showTimerVal=0;document.getElementById("show-timer").textContent="00:00:00";}');
a('function renderTally(){');
a('  var p=document.getElementById("tally-panel");p.innerHTML="";');
a('  SRCS.slice(0,8).forEach(function(s){');
a('    var on=s.id===pgm,pv=s.id===pvw;');
a('    var col=on?"var(--red)":pv?"var(--grn)":"var(--bg3)";');
a('    var tc=on||pv?"#000":"var(--mu2)";');
a('    var el=document.createElement("div");');
a('    el.style.cssText="padding:4px 8px;border-radius:3px;font-size:10px;font-weight:bold;background:"+col+";color:"+tc+";border:1px solid var(--bd2)";');
a('    el.textContent=s.name;');
a('    p.appendChild(el);');
a('  });');
a('}');
a('var SEGMENTS=[{name:"INTRO",dur:30,done:false},{name:"MAIN ITEM 1",dur:180,done:false},{name:"BREAK",dur:120,done:false},{name:"MAIN ITEM 2",dur:240,done:false},{name:"OUTRO",dur:60,done:false}];');
a('function renderRundown(){');
a('  var list=document.getElementById("rundown-list");list.innerHTML="";');
a('  SEGMENTS.forEach(function(seg,i){');
a('    var el=document.createElement("div");');
a('    el.style.cssText="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg3);border-radius:3px;border:1px solid var(--bd)";');
a('    var m=Math.floor(seg.dur/60),s=seg.dur%60;');
a('    el.innerHTML="<input type=\\"checkbox\\" "+(seg.done?"checked":"")+' +
    '" onchange=\\"SEGMENTS["+i+"].done=this.checked;renderRundown()\\">"+' +
    '"<span style=\\"flex:1;color:"+(seg.done?"var(--mu2)":"var(--tx)")+";text-decoration:"+(seg.done?"line-through":"none")+"\\">"+(i===0&&!seg.done?"<span class=\\"tag live\\" style=\\"margin-right:4px\\">NEXT</span>":"")+seg.name+"</span>"+' +
    '"<span style=\\"color:var(--mu2);font-size:10px\\">"+(m<10?"0"+m:m)+":"+(s<10?"0"+s:s)+"</span>"+' +
    '"<button onclick=\\"SEGMENTS.splice("+i+",1);renderRundown()\\" style=\\"background:none;border:none;color:var(--mu2);cursor:pointer;font-size:11px\\">&#10005;</button>";');
a('    list.appendChild(el);');
a('  });');
a('}');
a('function addSegment(){var n=document.getElementById("seg-name").value.trim(),d=parseInt(document.getElementById("seg-dur").value)||60;if(!n)return;SEGMENTS.push({name:n.toUpperCase(),dur:d,done:false});document.getElementById("seg-name").value="";renderRundown();}');
a('var COMMS=[{name:"DIRECTOR",ch:"IFB-1",active:true},{name:"CAMERA OP",ch:"IFB-2",active:false},{name:"FLOOR MGR",ch:"IFB-3",active:true},{name:"REPLAY OP",ch:"IFB-4",active:false}];');
a('function renderComms(){');
a('  var list=document.getElementById("comms-list");list.innerHTML="";');
a('  COMMS.forEach(function(c,i){');
a('    var el=document.createElement("div");');
a('    el.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:var(--bg3);border-radius:3px;border:1px solid var(--bd)";');
a('    el.innerHTML="<span style=\\"color:var(--tx)\\">"+c.name+"</span><span style=\\"color:var(--mu2);font-size:10px\\">"+c.ch+"</span><button onclick=\\"COMMS["+i+"].active=!COMMS["+i+"].active;renderComms()\\" style=\\"padding:2px 10px;border-radius:2px;border:1px solid "+(c.active?"var(--grn)":"var(--bd2)")+";background:"+(c.active?"rgba(6,214,160,.15)":"none")+";color:"+(c.active?"var(--grn)":"var(--mu2)")+";cursor:pointer;font-family:inherit;font-size:10px\\">"+(c.active?"LIVE":"MUTE")+"</button>";');
a('    list.appendChild(el);');
a('  });');
a('}');

// MOSAIC JS — fluid, drag-assign, save/recall
a('// MOSAIC');
a('var mvCells=[];');
a('function initMvSrcSel(){');
a('  var sel=document.getElementById("mv-src-sel");');
a('  SRCS.forEach(function(s){var o=document.createElement("option");o.value=s.id;o.textContent=s.name;sel.appendChild(o);});');
a('}');
a('function setLay(r,c,btn){mrr=r;mrc=c;document.querySelectorAll("#v-mosaic .btn").forEach(function(b){b.classList.remove("on");});btn.classList.add("on");renderMV();}');
a('function renderMV(){');
a('  var g=document.getElementById("mvg");');
a('  g.style.gridTemplateColumns="repeat("+mrc+",1fr)";');
a('  var count=mrr*mrc;');
a('  while(mvCells.length<count)mvCells.push({srcId:mvCells.length%SRCS.length+1});');
a('  g.innerHTML="";');
a('  for(var i=0;i<count;i++){');
a('    (function(idx){');
a('      var src=SRCS[(mvCells[idx].srcId-1)%SRCS.length];');
a('      var tl=src.id===pgm?"pgm":src.id===pvw?"pvw":"";');
a('      var hue=(src.id*37)%360;');
a('      var c=document.createElement("div");');
a('      c.style.cssText="aspect-ratio:16/9;position:relative;overflow:hidden;cursor:pointer;border:2px solid "+(tl==="pgm"?"var(--red)":tl==="pvw"?"var(--grn)":"#1e1e1e")+";background:hsl("+hue+",15%,8%);transition:border-color .15s";');
a('      c.innerHTML="<div style=\\"position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#1e1e1e;font-size:9px\\">VIDEO</div>"');
a('        +"<div style=\\"position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.8);padding:2px 5px;font-size:9px;display:flex;justify-content:space-between\\">"');
a('        +"<span>"+src.name+"</span>"');
a('        +(tl?"<span style=\\"font-weight:bold;color:"+(tl==="pgm"?"var(--red)":"var(--grn)")+"\\">"+tl.toUpperCase()+"</span>":"")');
a('        +"</div>"');
a('        +(selectedCell===idx?"<div style=\\"position:absolute;inset:0;border:2px solid var(--ac);pointer-events:none\\"></div>":"");');
a('      c.onclick=function(){selectedCell=(selectedCell===idx?null:idx);renderMV();};');
a('      c.ondblclick=function(){setPvw(src.id);};');
a('      g.appendChild(c);');
a('    })(i);');
a('  }');
a('}');
a('function assignSelected(){');
a('  if(selectedCell===null){alert("Click a cell first");return;}');
a('  var sid=parseInt(document.getElementById("mv-src-sel").value);');
a('  if(!sid)return;');
a('  mvCells[selectedCell]={srcId:sid};');
a('  selectedCell=null;renderMV();');
a('}');
a('function saveLayout(){');
a('  var name=document.getElementById("lay-name").value.trim();');
a('  if(!name)return;');
a('  savedLayouts[name]={rows:mrr,cols:mrc,cells:mvCells.slice()};');
a('  var sel=document.getElementById("lay-recall");');
a('  var exists=false;');
a('  for(var i=0;i<sel.options.length;i++)if(sel.options[i].value===name)exists=true;');
a('  if(!exists){var o=document.createElement("option");o.value=name;o.textContent=name;sel.appendChild(o);}');
a('  document.getElementById("lay-name").value="";');
a('}');
a('function recallLayout(name){');
a('  if(!name||!savedLayouts[name])return;');
a('  var lay=savedLayouts[name];');
a('  mrr=lay.rows;mrc=lay.cols;mvCells=lay.cells.slice();');
a('  renderMV();');
a('}');

// SWITCHER JS
a('// SWITCHER');
a('function renderBuses(){');
a('  var pb=document.getElementById("pvwbus"),gb=document.getElementById("pgmbus");');
a('  pb.innerHTML="";gb.innerHTML="";');
a('  SRCS.forEach(function(s){');
a('    var bp=document.createElement("button");');
a('    bp.textContent=s.name;');
a('    bp.className="btn"+(s.id===pvw?" on":"");');
a('    if(s.id===pvw)bp.style.background="var(--grn)";');
a('    bp.onclick=(function(sid){return function(){setPvw(sid);};})(s.id);');
a('    pb.appendChild(bp);');
a('    var bg=document.createElement("button");');
a('    bg.textContent=s.name;');
a('    bg.className="btn"+(s.id===pgm?" red":"");');
a('    bg.disabled=true;bg.style.cursor="default";');
a('    gb.appendChild(bg);');
a('  });');
a('  var st=document.getElementById("swstat");');
a('  if(st)st.textContent="PGM: "+(SRCS[pgm-1]||{name:"?"}).name+"   |   PVW: "+(SRCS[pvw-1]||{name:"?"}).name;');
a('  renderTally();');
a('}');
a('function setPvw(id){pvw=id;renderBuses();renderMV();wsSend({type:"SWITCHER_PVW",payload:{source:id}});}');
a('function doCut(){var t=pgm;pgm=pvw;pvw=t;renderBuses();renderMV();wsSend({type:"SWITCHER_CUT",payload:{pvw:pvw,pgm:pgm}});}');
a('function doAuto(){var rate=parseInt(document.getElementById("rateinp").value)||25,ms=Math.round(rate/25*1000),fill=document.getElementById("pfill"),lbl=document.getElementById("autolbl");lbl.textContent=tr+" "+rate+"f";fill.style.width="0%";var start=Date.now(),tmr=setInterval(function(){var pct=Math.min(100,((Date.now()-start)/ms)*100);fill.style.width=pct+"%";if(pct>=100){clearInterval(tmr);lbl.textContent="";var t=pgm;pgm=pvw;pvw=t;renderBuses();renderMV();}},40);}');
a('function setTr(t,btn){tr=t;document.querySelectorAll("#tbtns .btn").forEach(function(b){b.classList.remove("on");});btn.classList.add("on");}');

// ROUTER JS — NEP/TFC-style NxM crosspoint
a('// ROUTER');
a('var RT_SRCS=["CAM-01","CAM-02","CAM-03","CAM-04","CAM-05","CAM-06","REPLAY-01","REPLAY-02","GFX-01","GFX-02","AUDIO-01","AUDIO-02","SRT-IN-01","SRT-IN-02","NDI-01","NDI-02"];');
a('var RT_DSTS=["PGM-BUS","PVW-BUS","MV-01","MV-02","MV-03","MV-04","REC-01","REC-02","MON-01","MON-02","SRT-OUT-01","SRT-OUT-02"];');
a('var RT_TYPES=["ST2110-20","ST2110-20","ST2110-20","ST2110-20","ST2110-20","ST2110-20","ST2110-20","ST2110-20","ST2110-30","ST2110-30","AES67","AES67","SRT","SRT","NDI","NDI"];');
a('var ROUTES={};');
a('function renderRouter(){');
a('  var q=(document.getElementById("rt-filter").value||"").toLowerCase();');
a('  var cat=document.getElementById("rt-cat").value;');
a('  var srcs=RT_SRCS.filter(function(s,i){return (!q||(s.toLowerCase().includes(q)||RT_DSTS.some(function(d){return d.toLowerCase().includes(q);})))&&(!cat||RT_TYPES[i]===cat||RT_TYPES[i].includes(cat));});');
a('  var tbl=document.getElementById("rt-table");');
a('  tbl.innerHTML="";');
a('  // Header row');
a('  var htr=document.createElement("tr");');
a('  var th0=document.createElement("th");th0.textContent="SRC \\ DST";th0.style.cssText="padding:5px 8px;background:var(--bg2);color:var(--mu2);font-size:9px;text-transform:uppercase;border:1px solid var(--bd);white-space:nowrap;position:sticky;left:0;z-index:2";htr.appendChild(th0);');
a('  RT_DSTS.forEach(function(d){var th=document.createElement("th");th.textContent=d;th.style.cssText="padding:5px 6px;background:var(--bg2);color:var(--mu2);font-size:9px;border:1px solid var(--bd);white-space:nowrap;text-align:center;min-width:80px";htr.appendChild(th);});');
a('  tbl.appendChild(htr);');
a('  // Source rows');
a('  RT_SRCS.forEach(function(src,si){');
a('    if(q&&!src.toLowerCase().includes(q)&&!RT_DSTS.some(function(d){return d.toLowerCase().includes(q);}))return;');
a('    var tr2=document.createElement("tr");');
a('    var td0=document.createElement("td");');
a('    td0.style.cssText="padding:4px 8px;border:1px solid var(--bd);background:var(--bg2);color:var(--tx);font-size:10px;white-space:nowrap;position:sticky;left:0;z-index:1";');
a('    td0.innerHTML=src+"<br><span style=\\"color:var(--mu2);font-size:8px\\">"+RT_TYPES[si]+"</span>";');
a('    tr2.appendChild(td0);');
a('    RT_DSTS.forEach(function(dst,di){');
a('      var key=src+">"+dst;');
a('      var active=ROUTES[key];');
a('      var locked=routeLocks[key];');
a('      var td=document.createElement("td");');
a('      td.style.cssText="padding:3px;border:1px solid var(--bd);text-align:center;background:"+(active?"rgba(0,180,216,.12)":"var(--bg)")+";"+(locked?"opacity:.6":"");');
a('      var btn=document.createElement("button");');
a('      btn.style.cssText="width:100%;padding:3px 0;border-radius:2px;border:1px solid "+(active?"var(--ac)":"var(--bd2)")+";background:"+(active?"var(--ac)":"none")+";color:"+(active?"#000":"var(--mu2)")+";cursor:"+(locked?"not-allowed":"pointer")+";font-family:inherit;font-size:9px;font-weight:"+(active?"bold":"normal");');
a('      btn.textContent=active?(locked?"\uD83D\uDD12 LOCK":"\u2713"):(locked?"\uD83D\uDD12":"\u2014");');
a('      btn.disabled=locked;');
a('      btn.onclick=(function(k){return function(){if(ROUTES[k])delete ROUTES[k];else ROUTES[k]=true;renderRouter();updRouteStatus();};})(key);');
a('      td.appendChild(btn);tr2.appendChild(td);');
a('    });');
a('    tbl.appendChild(tr2);');
a('  });');
a('  updRouteStatus();');
a('}');
a('function updRouteStatus(){var n=Object.keys(ROUTES).length;document.getElementById("rt-status").textContent=n+" active route"+(n!==1?"s":"");document.getElementById("tbflows").textContent=n+" flows";document.getElementById("sbflows").textContent=n+" flows";}');
a('function clearAllRoutes(){if(confirm("Clear all routes?"))ROUTES={};renderRouter();}');
a('function lockRoutes(){Object.keys(ROUTES).forEach(function(k){routeLocks[k]=true;});renderRouter();}');

// CLOUD / SRT JS
a('// CLOUD');
a('var CLOUD_LINKS=[{name:"BBC-CONTRIB-01",proto:"SRT",url:"srt://contrib.bbc.co.uk:9000",active:true,bitrate:50,latency:12,loss:0.0},{name:"SKY-SPORTS-01",proto:"SRT",url:"srt://ingest.sky.com:9001",active:true,bitrate:80,latency:18,loss:0.1},{name:"CLOUD-RELAY-EU",proto:"RIST",url:"rist://eu-relay.nexus.cloud:5000",active:false,bitrate:0,latency:0,loss:0},{name:"NDI-BRIDGE-01",proto:"NDI",url:"ndi://studio-a-local",active:true,bitrate:120,latency:2,loss:0}];');
a('var CLOUD_REGIONS=[{name:"EU-WEST-1",provider:"AWS",nodes:4,active:true},{name:"US-EAST-1",provider:"AWS",nodes:2,active:true},{name:"AP-SOUTH-1",provider:"GCP",nodes:1,active:false},{name:"EU-CENTRAL-1",provider:"Azure",nodes:3,active:true}];');
a('function renderCloud(){');
a('  var list=document.getElementById("cloud-links");list.innerHTML="";');
a('  CLOUD_LINKS.forEach(function(lk,i){');
a('    var el=document.createElement("div");');
a('    el.style.cssText="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border-radius:4px;border:1px solid var(--bd)";');
a('    el.innerHTML="<span class=\\"dot "+(lk.active?"g":"x")+"\\" style=\\"flex-shrink:0\\"></span>"');
a('      +"<div style=\\"flex:1\\"><div style=\\"color:var(--tx);font-size:11px\\">"+lk.name+"</div>"');
a('      +"<div style=\\"color:var(--mu2);font-size:9px\\"><span class=\\"tag cloud\\">"+lk.proto+"</span> "+lk.url+"</div></div>"');
a('      +(lk.active?"<div style=\\"text-align:right;font-size:10px\\"><div style=\\"color:var(--ac)\\">"+lk.bitrate+" Mbps</div><div style=\\"color:var(--mu2)\\">"+lk.latency+"ms / "+lk.loss+"% loss</div></div>":"")');
a('      +"<button onclick=\\"CLOUD_LINKS["+i+"].active=!CLOUD_LINKS["+i+"].active;renderCloud()\\" style=\\"padding:3px 10px;border-radius:2px;border:1px solid "+(lk.active?"var(--red)":"var(--grn)")+";background:none;color:"+(lk.active?"var(--red)":"var(--grn)")+";cursor:pointer;font-family:inherit;font-size:10px\\">"+(lk.active?"DISCONNECT":"CONNECT")+"</button>";');
a('    list.appendChild(el);');
a('  });');
a('  var stats=document.getElementById("cloud-stats");stats.innerHTML="";');
a('  var totalBw=CLOUD_LINKS.filter(function(l){return l.active;}).reduce(function(s,l){return s+l.bitrate;},0);');
a('  [{label:"Total Bandwidth",val:totalBw+" Mbps",col:"var(--ac)"},{label:"Active Links",val:CLOUD_LINKS.filter(function(l){return l.active;}).length+"/"+CLOUD_LINKS.length,col:"var(--grn)"},{label:"Avg Latency",val:Math.round(CLOUD_LINKS.filter(function(l){return l.active&&l.latency>0;}).reduce(function(s,l){return s+l.latency;},0)/Math.max(1,CLOUD_LINKS.filter(function(l){return l.active&&l.latency>0;}).length))+"ms",col:"var(--ylw)"}].forEach(function(s){');
a('    var el=document.createElement("div");');
a('    el.style.cssText="padding:10px 14px;background:var(--bg3);border-radius:4px;border:1px solid var(--bd)";');
a('    el.innerHTML="<div style=\\"font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px\\">"+s.label+"</div><div style=\\"font-size:22px;font-weight:bold;color:"+s.col+"\\">"+s.val+"</div>";');
a('    stats.appendChild(el);');
a('  });');
a('  var reg=document.getElementById("cloud-regions");reg.innerHTML="";');
a('  CLOUD_REGIONS.forEach(function(r){');
a('    var el=document.createElement("div");');
a('    el.style.cssText="padding:8px 14px;background:var(--bg3);border-radius:4px;border:1px solid "+(r.active?"var(--ac)":"var(--bd)")+";min-width:140px";');
a('    el.innerHTML="<div style=\\"color:var(--tx);font-size:11px;font-weight:bold\\">"+r.name+"</div><div style=\\"color:var(--mu2);font-size:9px\\">"+r.provider+" &bull; "+r.nodes+" nodes</div><div style=\\"margin-top:4px\\"><span class=\\"tag "+(r.active?"ok":"warn")+"\\">"+(r.active?"ACTIVE":"STANDBY")+"</span></div>";');
a('    reg.appendChild(el);');
a('  });');
a('}');
a('function addCloudLink(){var n=document.getElementById("cl-name").value.trim(),pr=document.getElementById("cl-proto").value,u=document.getElementById("cl-url").value.trim();if(!n||!u)return;CLOUD_LINKS.push({name:n,proto:pr,url:u,active:false,bitrate:0,latency:0,loss:0});document.getElementById("cl-name").value="";document.getElementById("cl-url").value="";renderCloud();}');

// SCOPES JS
a('var stimer=null;');
a('function startScopes(){if(stimer)return;drawAll();stimer=setInterval(drawAll,80);}');
a('function drawAll(){dWave();dVec();dParade();dLoud();}');
a('function rcv(id){var c=document.getElementById(id);if(!c)return c;var w=c.parentElement.clientWidth-24;if(c.width!==w)c.width=w;return c;}');
a('function dWave(){var c=rcv("cvw");if(!c)return;var x=c.getContext("2d"),W=c.width,H=c.height,t=Date.now()/1000;x.fillStyle="#000";x.fillRect(0,0,W,H);x.strokeStyle="#1a1a1a";x.lineWidth=1;for(var y=0;y<=4;y++){x.beginPath();x.moveTo(0,H*y/4);x.lineTo(W,H*y/4);x.stroke();}x.strokeStyle="#0f0";x.lineWidth=1.5;x.beginPath();for(var i=0;i<W;i++){var v=0.5+0.35*Math.sin(i/W*Math.PI*2+t)+0.05*Math.sin(i/W*Math.PI*8+t*2);i===0?x.moveTo(i,H-v*H):x.lineTo(i,H-v*H);}x.stroke();}');
a('function dVec(){var c=rcv("cvv");if(!c)return;var x=c.getContext("2d"),W=c.width,H=c.height,cx=W/2,cy=H/2,r=Math.min(W,H)*0.44;x.fillStyle="#000";x.fillRect(0,0,W,H);x.strokeStyle="#1a1a1a";x.lineWidth=1;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(cx-r,cy);x.lineTo(cx+r,cy);x.stroke();x.beginPath();x.moveTo(cx,cy-r);x.lineTo(cx,cy+r);x.stroke();[{a:0,c:"#f44"},{a:60,c:"#ff4"},{a:120,c:"#4f4"},{a:180,c:"#4ff"},{a:240,c:"#44f"},{a:300,c:"#f4f"}].forEach(function(t){var rad=t.a*Math.PI/180,tx=cx+r*0.75*Math.cos(rad),ty=cy-r*0.75*Math.sin(rad);x.fillStyle=t.c;x.beginPath();x.arc(tx,ty,4,0,Math.PI*2);x.fill();});var now=Date.now()/1000;x.fillStyle="rgba(0,220,180,0.55)";for(var i=0;i<90;i++){var ang=(now*0.3+i*0.07)%(Math.PI*2),d=r*0.38*(0.8+0.2*Math.sin(now+i));x.beginPath();x.arc(cx+d*Math.cos(ang)+(Math.random()-0.5)*5,cy+d*Math.sin(ang)+(Math.random()-0.5)*5,1,0,Math.PI*2);x.fill();}}');
a('function dParade(){var c=rcv("cvp");if(!c)return;var x=c.getContext("2d"),W=c.width,H=c.height,t=Date.now()/1000;x.fillStyle="#000";x.fillRect(0,0,W,H);var cw=Math.floor(W/3)-2;[{c:"#f44",o:0},{c:"#4f4",o:1},{c:"#44f",o:2}].forEach(function(ch){var ox=ch.o*(cw+3);x.strokeStyle=ch.c;x.lineWidth=1.5;x.beginPath();for(var i=0;i<cw;i++){var v=0.5+0.3*Math.sin(i/cw*Math.PI*2+t+ch.o)+0.1*Math.sin(i/cw*Math.PI*6+t);i===0?x.moveTo(ox+i,H-v*H):x.lineTo(ox+i,H-v*H);}x.stroke();});}');
a('function dLoud(){var c=rcv("cvl");if(!c)return;var x=c.getContext("2d"),W=c.width,H=c.height,t=Date.now()/1000;x.fillStyle="#000";x.fillRect(0,0,W,H);var chs=["L","R","C","Ls","Rs","LFE"],bw=Math.floor(W/chs.length)-3;chs.forEach(function(ch,i){var lv=Math.max(0.05,Math.min(0.98,0.55+0.3*Math.sin(t*1.3+i*1.1)+0.1*Math.random()));var ox=i*(bw+3),bh=lv*H,col=lv>0.9?"#f44":lv>0.75?"#fa0":"#0af";x.fillStyle="#111";x.fillRect(ox,0,bw,H);x.fillStyle=col;x.fillRect(ox,H-bh,bw,bh);x.fillStyle="#555";x.font="9px monospace";x.fillText(ch,ox+2,H-2);});}');

// PTP + NMOS + DEVICES + API + PRE-DEPLOY JS
a('// PTP');
a('function startPtp(){updPtp();setInterval(updPtp,3000);}');
a('function updPtp(){var off=Math.floor(4+Math.random()*10);document.getElementById("ptpval").textContent=off;["tbptp","sbptp"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent="LOCKED "+off+"ns";});var log=document.getElementById("ptplog"),ts=new Date().toLocaleTimeString(),e=document.createElement("div");e.innerHTML="<span style=\\"color:#333;margin-right:6px\\">"+ts+"</span>offset="+off+"ns  gm=NEXUS-GM-01  domain=0  profile=ST2059-2";log.insertBefore(e,log.firstChild);if(log.children.length>50)log.removeChild(log.lastChild);}');

a('// NMOS');
a('var NDEVS=[{id:1,name:"NEXUS-CAM-01",type:"Node",ip:"10.0.1.11",flows:4,on:true},{id:2,name:"NEXUS-CAM-02",type:"Node",ip:"10.0.1.12",flows:4,on:true},{id:3,name:"NEXUS-CAM-03",type:"Node",ip:"10.0.1.13",flows:4,on:false},{id:4,name:"NEXUS-REPLAY-01",type:"Node",ip:"10.0.1.21",flows:8,on:true},{id:5,name:"NEXUS-ROUTER-01",type:"Device",ip:"10.0.1.31",flows:64,on:true},{id:6,name:"NEXUS-MONITOR-01",type:"Receiver",ip:"10.0.1.41",flows:2,on:false},{id:7,name:"NEXUS-ENCODER-01",type:"Sender",ip:"10.0.1.51",flows:4,on:true},{id:8,name:"NEXUS-DECODER-01",type:"Receiver",ip:"10.0.1.52",flows:4,on:false}];');
a('function renderNmos(){var list=document.getElementById("nmoslist"),conn=0,flows=0;list.innerHTML="";NDEVS.forEach(function(d){if(d.on){conn++;flows+=d.flows;}var el=document.createElement("div");el.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:4px;margin-bottom:6px";el.innerHTML="<div><div style=\\"color:var(--tx);font-size:11px\\"><span style=\\"width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:6px;background:"+(d.on?"var(--grn)":"#333")+"\\">&nbsp;</span>"+d.name+"</div><div style=\\"color:var(--mu2);font-size:10px;margin-top:2px\\">"+d.type+" &middot; "+d.ip+" &middot; "+d.flows+" flows</div></div><button onclick=\\"NDEVS.find(function(x){return x.id==="+d.id+"}).on=!NDEVS.find(function(x){return x.id==="+d.id+"}).on;renderNmos()\\" style=\\"padding:4px 12px;border-radius:2px;border:1px solid "+(d.on?"var(--red)":"var(--grn)")+";background:none;color:"+(d.on?"var(--red)":"var(--grn)")+";cursor:pointer;font-family:inherit;font-size:10px\\">"+(d.on?"DISCONNECT":"CONNECT")+"</button>";list.appendChild(el);});document.getElementById("tbnmos").textContent=conn;document.getElementById("sbnmos").textContent=conn;}');

a('// DEVICES');
a('var CK="\u2713",CX="\u2014",CP="\u25d1";');
a('var DEVS=[{mfr:"Sony",mdl:"HDC-5500",cat:"Camera",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Full ST 2110, NMOS IS-04/05"},{mfr:"Sony",mdl:"HDC-F5500 4K",cat:"Camera",s:CK,n:CK,a:CK,p:CK,t:CK,note:"4K HDR, ST 2110-22"},{mfr:"Grass Valley",mdl:"LDX 150",cat:"Camera",s:CK,n:CK,a:CK,p:CK,t:CK,note:"GV AMPP compatible"},{mfr:"Grass Valley",mdl:"LDX 86N",cat:"Camera",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Native IP 4K/HDR"},{mfr:"Ikegami",mdl:"UHK-X750",cat:"Camera",s:CK,n:CK,a:CK,p:CK,t:CP,note:"ST 2110-20/30 native"},{mfr:"Hitachi",mdl:"SK-UHD4000",cat:"Camera",s:CK,n:CP,a:CK,p:CK,t:CP,note:"4K UHD ST 2110 option"},{mfr:"Blackmagic",mdl:"URSA Broadcast G2",cat:"Camera",s:CX,n:CX,a:CX,p:CX,t:CX,note:"SDI only; use NEXUS SDI bridge"},{mfr:"EVS",mdl:"XT-VIA",cat:"Replay System",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Full IP, XSQUARE ecosystem"},{mfr:"EVS",mdl:"XT4K",cat:"Replay System",s:CK,n:CK,a:CK,p:CK,t:CK,note:"4K HDR NMOS IS-04/05/07"},{mfr:"Grass Valley",mdl:"K2 Dyno S",cat:"Replay System",s:CK,n:CK,a:CK,p:CK,t:CK,note:"GV AMPP full IP"},{mfr:"Lawo",mdl:"mc2 96",cat:"Audio Console",s:CK,n:CK,a:CK,p:CK,t:CK,note:"AES67/ST 2110-30, RAVENNA"},{mfr:"Lawo",mdl:"mc2 56 MkIII",cat:"Audio Console",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Full NMOS IS-04/05/08"},{mfr:"Calrec",mdl:"Artemis / Apollo",cat:"Audio Console",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Hydra2 + AoIP, NMOS"},{mfr:"SSL",mdl:"System T S500",cat:"Audio Console",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Tempest engine, NMOS IS-04/05"},{mfr:"Yamaha",mdl:"RIVAGE PM10",cat:"Audio Console",s:CP,n:CP,a:CK,p:CK,t:CP,note:"Dante/AES67; NMOS via gateway"},{mfr:"DiGiCo",mdl:"Quantum 7",cat:"Audio Console",s:CP,n:CP,a:CK,p:CK,t:CP,note:"MADI/Dante; AES67 bridge"},{mfr:"Grass Valley",mdl:"GV Orbit",cat:"Router",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Full NMOS IS-04/05/07/08"},{mfr:"Evertz",mdl:"EQX / MAGNUM",cat:"Router",s:CK,n:CK,a:CK,p:CK,t:CK,note:"SDVN full IP routing"},{mfr:"Ross Video",mdl:"Ultrix FR12",cat:"Router",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Integrated MV+router"},{mfr:"Grass Valley",mdl:"Kaleido-IP X320",cat:"Multiviewer",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Pure IP multiviewer"},{mfr:"Evertz",mdl:"Quartz MV",cat:"Multiviewer",s:CK,n:CK,a:CK,p:CK,t:CK,note:"ST 2110 native"},{mfr:"Haivision",mdl:"KB Encoder",cat:"Encoder/Decoder",s:CK,n:CK,a:CK,p:CK,t:CK,note:"SRT, HEVC, ST 2110"},{mfr:"Harmonic",mdl:"VOS360",cat:"Encoder/Decoder",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Cloud-native full IP"},{mfr:"Sony",mdl:"BVM-HX310",cat:"Monitor",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Reference OLED full IP"},{mfr:"Evertz",mdl:"7800FR",cat:"Signal Processor",s:CK,n:CK,a:CK,p:CK,t:CK,note:"Full IP processing"}];');
a('function renderDev(){var q=(document.getElementById("dsrch").value||"").toLowerCase(),cat=document.getElementById("dcat").value,rows=DEVS.filter(function(d){return (d.mfr+" "+d.mdl+" "+d.cat).toLowerCase().includes(q)&&(!cat||d.cat===cat);});document.getElementById("dcount").textContent=rows.length+" devices";var tb=document.getElementById("devtbody");tb.innerHTML="";rows.forEach(function(d){var tr2=document.createElement("tr");tr2.innerHTML="<td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);color:var(--tx);font-weight:bold\\">"+d.mfr+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);color:var(--mu2)\\">"+d.mdl+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd)\\"><span style=\\"font-size:8px;padding:2px 6px;border-radius:10px;background:var(--bg3);color:var(--mu2)\\">"+d.cat+"</span></td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);text-align:center\\">"+d.s+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);text-align:center\\">"+d.n+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);text-align:center\\">"+d.a+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);text-align:center\\">"+d.p+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);text-align:center\\">"+d.t+"</td><td style=\\"padding:6px 10px;border-bottom:1px solid var(--bd);color:var(--mu2);font-size:10px\\">"+d.note+"</td>";tb.appendChild(tr2);});}');
a('function filterDev(){renderDev();}');

// API EXPLORER + PRE-DEPLOY + WS + INIT
a('// API');
a('var AEPS=[{m:"WS",p:"/ws/control",t:"WebSocket Control",d:"Real-time bidirectional control. JWT token required. Messages: SWITCHER_CUT, SWITCHER_AUTO, SWITCHER_PVW, TALLY_UPDATE, MV_UPDATE, ROUTER_CONNECT.",req:null,res:\'{"type":"INIT","role":"ENGINEER","timestamp":1700000000000}\'},{m:"GET",p:"/health/live",t:"Liveness Probe",d:"Kubernetes liveness check.",req:null,res:\'{"status":"alive"}\'},{m:"GET",p:"/api/v1/switcher/state",t:"Switcher State",d:"Current PGM/PVW, transition, rate.",req:null,res:\'{"pgm":1,"pvw":2,"transition":"CUT","rate":25,"inTransition":false}\'},{m:"POST",p:"/api/v1/switcher/cut",t:"Switcher Cut",d:"Execute cut. Broadcasts TALLY_UPDATE.",req:\'{"pvw":3,"pgm":1}\',res:\'{"success":true,"newPgm":3,"newPvw":1,"latency_ms":4}\'},{m:"GET",p:"/api/v1/ptp/status",t:"PTP Status",d:"Grandmaster offset, lock, domain, clock class.",req:null,res:\'{"offset":8,"locked":true,"grandmasterId":"NEXUS-GM-01","domain":0,"clockClass":6}\'},{m:"GET",p:"/api/v1/router/flows",t:"Router Flows",d:"All active ST 2110 flows.",req:null,res:\'[{"id":"flow-001","src":"CAM-01","dst":"PGM-BUS","type":"ST2110-20","active":true}]\'},{m:"POST",p:"/api/v1/router/connect",t:"Router Connect",d:"Create a route between source and destination.",req:\'{"src":"CAM-01","dst":"PGM-BUS","type":"ST2110-20"}\',res:\'{"success":true,"routeId":"r-001"}\'},{m:"GET",p:"/api/v1/multiviewer/layout",t:"MV Layout",d:"Current mosaic layout and cell assignments.",req:null,res:\'{"layout":"4x4","cells":[{"index":0,"source":1,"tally":"pgm"}]}\'},{m:"POST",p:"/api/v1/multiviewer/layout",t:"Set MV Layout",d:"Update mosaic. Broadcasts MV_UPDATE.",req:\'{"layout":"2x2","cells":[{"index":0,"source":1}]}\',res:\'{"success":true}\'},{m:"GET",p:"/api/v1/cloud/links",t:"Cloud Links",d:"All SRT/RIST/NDI contribution links and their status.",req:null,res:\'[{"name":"BBC-CONTRIB-01","proto":"SRT","active":true,"bitrate":50,"latency_ms":12}]\'},{m:"POST",p:"/api/v1/cloud/connect",t:"Cloud Connect",d:"Establish a cloud media transport link.",req:\'{"name":"NEW-LINK","proto":"SRT","url":"srt://host:9000"}\',res:\'{"success":true,"linkId":"cl-001"}\'},{m:"GET",p:"/api/v1/nmos/health",t:"NMOS Health",d:"IS-04 registry health and device count.",req:null,res:\'{"status":"healthy","devices":8}\'},{m:"GET",p:"/metrics",t:"Prometheus Metrics",d:"WebSocket connections, latency histograms, flow counts.",req:null,res:"nexus_ws_connections_total 4\\nnexus_ws_connections_by_role{role=\\"ENGINEER\\"} 1"}];');
a('function renderApiList(){var list=document.getElementById("apilist");if(!list)return;list.innerHTML="";AEPS.forEach(function(ep,i){var el=document.createElement("div");el.style.cssText="padding:8px 12px;border-bottom:1px solid var(--bd);cursor:pointer"+(aep===i?";background:rgba(0,180,216,.08);border-left:3px solid var(--ac)":"");el.innerHTML="<span style=\\"font-size:9px;font-weight:bold;padding:2px 5px;border-radius:2px;margin-right:6px;background:"+(ep.m==="WS"?"rgba(123,45,139,.3)":ep.m==="POST"?"rgba(0,119,182,.3)":"rgba(6,214,160,.15)")+";color:"+(ep.m==="WS"?"#c084fc":ep.m==="POST"?"var(--ac)":"var(--grn)")+"\\">"+ep.m+"</span><span style=\\"font-size:11px;color:var(--mu2)\\">"+ep.p+"</span>";el.onclick=(function(idx){return function(){showEp(idx);};})(i);list.appendChild(el);});}');
a('function showEp(i){aep=i;var ep=AEPS[i];renderApiList();var d=document.getElementById("apidet");d.innerHTML="<h2 style=\\"font-size:14px;color:var(--tx);margin-bottom:6px\\">"+ep.t+"</h2><div style=\\"color:var(--mu2);font-size:11px;margin-bottom:12px;line-height:1.6\\">"+ep.d+"</div>"+(ep.req?"<div style=\\"font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px\\">Request</div><pre style=\\"background:#050505;border:1px solid var(--bd);border-radius:4px;padding:10px;font-size:11px;color:var(--ac);overflow-x:auto;white-space:pre-wrap;margin-bottom:10px\\">"+ep.req+"</pre>":"")+"<div style=\\"font-size:9px;color:var(--mu2);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px\\">Response</div><pre style=\\"background:#050505;border:1px solid var(--bd);border-radius:4px;padding:10px;font-size:11px;color:var(--ac);overflow-x:auto;white-space:pre-wrap;margin-bottom:10px\\">"+ep.res+"</pre>"+(ep.m!=="WS"?"<button onclick=\\"tryEp("+i+")\\" style=\\"padding:6px 16px;background:var(--ac);color:#000;border:none;border-radius:3px;font-family:inherit;font-size:11px;cursor:pointer;font-weight:bold\\">&gt; Try it</button><div id=\\"tryres\\" style=\\"background:#050505;border:1px solid var(--bd);border-radius:4px;padding:10px;font-size:11px;color:var(--grn);margin-top:8px;min-height:40px;white-space:pre-wrap\\">Ready</div>":"<div style=\\"color:var(--mu2);font-size:11px;margin-top:8px\\">Use live controls to interact via WebSocket.</div>");}');
a('function tryEp(i){var ep=AEPS[i],r=document.getElementById("tryres");r.style.color="var(--ylw)";r.textContent="Fetching "+ep.p+"...";setTimeout(function(){r.style.color="var(--grn)";r.textContent="HTTP 200 OK\\n\\n"+ep.res;},400+Math.random()*300);}');

a('// PRE-DEPLOY');
a('var PHASES=[{t:"Phase 1 \u2014 Network",items:["10GbE switches configured with VLAN isolation","PTP grandmaster clock installed and locked","Multicast routing enabled","Network latency < 1ms verified","IGMP snooping enabled"]},{t:"Phase 2 \u2014 Hardware",items:["FPGA SDI bridge firmware flashed","ST 2110-20 video flows verified","ST 2110-30 audio flows verified","PTP sync < 50ns on all endpoints","NMOS IS-04 discovery confirmed"]},{t:"Phase 3 \u2014 Software",items:["Kubernetes cluster healthy","NMOS IS-04 registry responding","Switcher latency < 5ms","Router routing table loaded","Cloud links tested"]},{t:"Phase 4 \u2014 Monitoring",items:["Prometheus scraping all targets","Grafana dashboards loading","Alert rules tested","On-call rotation confirmed"]},{t:"Phase 5 \u2014 Security",items:["JWT secrets rotated","TLS certificates valid","Network policies applied","Operator credentials distributed","Audit logging enabled"]}];');
a('var CS={};');
a('function renderPhases(){var c=document.getElementById("phasecont");if(!c)return;c.innerHTML="";PHASES.forEach(function(ph,pi){var div=document.createElement("div");div.style.cssText="background:var(--bg2);border:1px solid var(--bd);border-radius:6px;padding:12px 16px;margin-bottom:10px";var h=document.createElement("h3");h.style.cssText="font-size:12px;color:var(--ac);margin-bottom:10px";h.textContent=ph.t;div.appendChild(h);ph.items.forEach(function(item,ii){var key=pi+"-"+ii,row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px;color:"+(CS[key]?"var(--grn)":"var(--mu2)");var cb=document.createElement("input");cb.type="checkbox";cb.checked=!!CS[key];cb.dataset.key=key;cb.style.accentColor="var(--ac)";cb.onchange=function(){CS[this.dataset.key]=this.checked;renderPhases();updBanner();};var lbl=document.createElement("label");lbl.textContent=item;row.appendChild(cb);row.appendChild(lbl);div.appendChild(row);});c.appendChild(div);});}');
a('function updBanner(){var tot=0,done=0;PHASES.forEach(function(ph,pi){ph.items.forEach(function(_,ii){tot++;if(CS[pi+"-"+ii])done++;});});var b=document.getElementById("gobanner");if(!b)return;if(done===tot){b.style.cssText="padding:14px 20px;border-radius:6px;font-size:14px;font-weight:bold;text-align:center;margin-top:12px;letter-spacing:2px;background:rgba(6,214,160,.1);border:2px solid var(--grn);color:var(--grn)";b.textContent="\u2705 GO \u2014 All "+tot+" checks passed";}else{b.style.cssText="padding:14px 20px;border-radius:6px;font-size:14px;font-weight:bold;text-align:center;margin-top:12px;letter-spacing:2px;background:rgba(239,35,60,.1);border:2px solid rgba(239,35,60,.3);color:var(--red)";b.textContent="\u26d4 NO-GO \u2014 "+done+"/"+tot+" checks complete";}}');

a('// WS');
a('function initWs(){try{ws=new WebSocket("ws://localhost:8080/ws/control?token="+(SESS?SESS.token:"demo"));ws.onopen=function(){wsok=true;setWs(true);};ws.onclose=ws.onerror=function(){wsok=false;setWs(false);};ws.onmessage=function(e){try{var m=JSON.parse(e.data);if(m.type==="TALLY_UPDATE"){pgm=m.pgm;pvw=m.pvw;renderBuses();renderMV();renderTally();}}catch(x){}};} catch(x){setWs(false);}}');
a('function setWs(ok){var cls="dot "+(ok?"g":"x"),txt=ok?"WS connected":"WS offline (demo mode)";["sbwsdot","tbwsdot"].forEach(function(id){var el=document.getElementById(id);if(el)el.className=cls;});["sbws","tbws"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=txt;});}');
a('function wsSend(m){if(ws&&wsok)try{ws.send(JSON.stringify(m));}catch(e){}}');

a('// Clock');
a('function tick(){var t=new Date().toLocaleTimeString();["sbclock","tbclock"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=t;});}');

a('// INIT');
a('function initApp(){');
a('  initMvSrcSel();renderMV();renderBuses();renderNmos();renderPhases();updBanner();');
a('  startPtp();initWs();tick();setInterval(tick,1000);');
a('  renderDev();renderApiList();initLive();');
a('  // Simulate live stats update');
a('  setInterval(function(){');
a('    if(CLOUD_LINKS.some(function(l){return l.active;})){');
a('      CLOUD_LINKS.forEach(function(l){if(l.active){l.bitrate=Math.round(l.bitrate*(0.95+Math.random()*0.1));l.latency=Math.max(1,Math.round(l.latency+(Math.random()-0.5)*2));}});');
a('      var cv=document.getElementById("v-cloud");if(cv&&cv.classList.contains("on"))renderCloud();');
a('    }');
a('  },3000);');
a('}');

a('document.getElementById("ap").addEventListener("keydown",function(e){if(e.key==="Enter")doLogin();});');
a('document.getElementById("au").addEventListener("keydown",function(e){if(e.key==="Enter")doLogin();});');
a('</script></body></html>');

// Write + validate
fs.writeFileSync(OUT, H.join('\n'), 'utf8');
console.log('Written:', OUT, '('+H.length+' lines,', fs.statSync(OUT).size, 'bytes)');
