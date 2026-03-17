'use strict';
/**
 * NEXUS v6 builder — runs _gen_nexus6.js output array, appends missing
 * WS block + all view inits + closing tags, writes nexus-v6.html
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// ── Execute _gen_nexus6.js to populate `out` array ───────────────────────────
const out = [];
const w = s => out.push(s);

// Inline the generator (eval its content with our w/out in scope)
const genSrc = fs.readFileSync(path.join(ROOT, '_gen_nexus6.js'), 'utf8')
  // Strip the first 3 lines (require/out/w declarations) so we use ours
  .split('\n').slice(3).join('\n');

// eslint-disable-next-line no-eval
eval(genSrc);

// ── Append everything the generator was missing ──────────────────────────────
const tail = `
function _wsConnect(){
  var proto=location.protocol==='https:'?'wss':'ws';
  var url=proto+'://'+location.hostname+':3000/ws';
  try{
    _ws=new WebSocket(url);
    _ws.onopen=function(){
      _wsConnected=true;
      document.getElementById('sb-ws').textContent='WS LIVE';
      document.getElementById('sb-ws').style.color='var(--ok)';
      _wsReconnCount=0;
    };
    _ws.onclose=function(){
      _wsConnected=false;
      document.getElementById('sb-ws').textContent='WS OFF';
      document.getElementById('sb-ws').style.color='var(--t3)';
      setTimeout(_wsConnect, Math.min(30000, 1000*Math.pow(2,_wsReconnCount++)));
    };
    _ws.onmessage=function(e){
      try{
        var d=JSON.parse(e.data);
        if(d.type==='TC_UPDATE'){document.getElementById('sb-tc').textContent=d.timecode;}
        if(d.type==='PTP_UPDATE'){document.getElementById('sb-ptp').textContent=(d.offset>0?'+':'')+d.offset+'ns';}
        if(d.type==='SWITCHER_CUT'||d.type==='SWITCHER_SYNC'){
          var me=_ME[d.me];if(me){me.pgm=d.pgm;me.pvw=d.pvw;_renderME(d.me);}
          _updateStatusBar();
        }
        if(d.type==='ALARM'){addAlarm(d.alarm.severity,d.alarm.message);}
        if(d.type==='FULL_STATE'){
          if(d.state.me)d.state.me.forEach(function(m,i){_ME[i]=m;_renderME(i);});
          _updateStatusBar();
        }
      }catch(ex){}
    };
  }catch(ex){
    setTimeout(_wsConnect,5000);
  }
}

// ── AUTOMATION VIEW ──────────────────────────────────────────────────────────
var _autoRules=[];
function _initAutomation(){
  var v=document.getElementById('view-automation');
  if(!v)return;
  _autoRules=[
    {id:1,name:'Auto-cut on timecode',trigger:'TC 10:30:00:00',action:'CUT ME1 → CAM-03',active:true},
    {id:2,name:'GFX on air at break',trigger:'RUNDOWN CUE TYPE=BREAK',action:'KEY1 ON ME1',active:true},
    {id:3,name:'SRT failover',trigger:'SRT LOSS > 5%',action:'ROUTE VTR-01 → PGM',active:false},
    {id:4,name:'PTP alarm',trigger:'PTP OFFSET > 100ns',action:'ALARM CRIT + NOTIFY',active:true},
  ];
  v.innerHTML='<div style="padding:12px;display:flex;flex-direction:column;gap:8px;height:100%;overflow:auto">'+
    '<div class="pnl"><div class="pnl-h"><span class="pnl-t">AUTOMATION RULES</span>'+
    '<button class="btn btn-acc" onclick="_addAutoRule()">+ ADD RULE</button></div>'+
    '<div style="padding:8px" id="auto-list"></div></div></div>';
  _renderAutoRules();
}
function _renderAutoRules(){
  var el=document.getElementById('auto-list');if(!el)return;
  el.innerHTML=_autoRules.map(function(r){
    return '<div class="auto-rule '+(r.active?'active':'inactive')+'">'+
      '<div style="flex:1"><div style="font-size:11px;font-weight:700;color:var(--t1)">'+r.name+'</div>'+
      '<div style="font-size:9px;color:var(--t3);margin-top:2px">IF: <span style="color:var(--acc)">'+r.trigger+'</span> → THEN: <span style="color:var(--pvw)">'+r.action+'</span></div></div>'+
      '<button class="btn btn-sm" onclick="_toggleAuto('+r.id+')">'+(r.active?'DISABLE':'ENABLE')+'</button>'+
      '</div>';
  }).join('');
}
function _toggleAuto(id){var r=_autoRules.find(function(x){return x.id===id;});if(r){r.active=!r.active;_renderAutoRules();}}
function _addAutoRule(){toast('info','Automation Editor','Rule builder coming in v6.1');}

// ── DATABASE VIEW ────────────────────────────────────────────────────────────
function _initDatabase(){
  var v=document.getElementById('view-database');
  if(!v)return;
  v.innerHTML='<div style="padding:12px;display:flex;flex-direction:column;gap:8px;height:100%;overflow:auto">'+
    '<div class="pnl"><div class="pnl-h"><span class="pnl-t">LOCAL STORAGE DB</span></div>'+
    '<div style="padding:12px" id="db-list"></div></div></div>';
  var el=document.getElementById('db-list');if(!el)return;
  var keys=Object.keys(localStorage).filter(function(k){return k.startsWith('nx_');});
  if(!keys.length){el.innerHTML='<div style="color:var(--t3);font-size:11px;padding:8px">No saved state.</div>';return;}
  el.innerHTML='<table class="kv">'+keys.map(function(k){
    return '<tr><td>'+k+'</td><td>'+localStorage.getItem(k)+'</td></tr>';
  }).join('')+'</table>';
}

// ── SIGNAL FLOW VIEW ─────────────────────────────────────────────────────────
function _initFlow(){
  var v=document.getElementById('view-flow');
  if(!v)return;
  v.innerHTML='<div style="padding:12px;height:100%;display:flex;flex-direction:column;gap:8px">'+
    '<div class="pnl" style="flex:1;position:relative;overflow:hidden">'+
    '<div class="pnl-h"><span class="pnl-t">SIGNAL FLOW DIAGRAM</span>'+
    '<span style="font-size:9px;color:var(--t3)">Drag nodes to rearrange</span></div>'+
    '<div class="flow-wrap" id="flow-canvas-wrap">'+
    '<canvas id="flow-canvas"></canvas>'+
    _flowNodes().join('')+
    '</div></div></div>';
  _drawFlowLines();
}
function _flowNodes(){
  var nodes=[
    {id:'cam',type:'INPUT',name:'CAM SOURCES',x:40,y:60,color:'var(--acc)'},
    {id:'srt',type:'INGEST',name:'SRT/RIST',x:40,y:180,color:'var(--pur)'},
    {id:'router',type:'ROUTER',name:'IP ROUTER',x:220,y:120,color:'var(--gold)'},
    {id:'me1',type:'SWITCHER',name:'ME 1',x:400,y:80,color:'var(--pgm)'},
    {id:'me2',type:'SWITCHER',name:'ME 2',x:400,y:180,color:'var(--pvw)'},
    {id:'pgm',type:'OUTPUT',name:'PGM OUT',x:580,y:80,color:'var(--pgm)'},
    {id:'rec',type:'RECORD',name:'RECORDER',x:580,y:180,color:'var(--warn)'},
  ];
  return nodes.map(function(n){
    return '<div class="flow-node" style="left:'+n.x+'px;top:'+n.y+'px;border-color:'+n.color+'">'+
      '<div class="fn-type">'+n.type+'</div>'+
      '<div class="fn-name">'+n.name+'</div>'+
      '<div class="fn-status"><span class="dot dot-ok"></span> ACTIVE</div>'+
      '</div>';
  });
}
function _drawFlowLines(){
  var cv=document.getElementById('flow-canvas');if(!cv)return;
  var wrap=document.getElementById('flow-canvas-wrap');if(!wrap)return;
  cv.width=wrap.offsetWidth||800;cv.height=wrap.offsetHeight||400;
  var ctx=cv.getContext('2d');
  ctx.strokeStyle='rgba(0,212,255,0.25)';ctx.lineWidth=1.5;
  var lines=[[155,90,220,140],[155,200,220,160],[340,140,400,100],[340,140,400,200],[520,100,580,100],[520,100,580,200]];
  lines.forEach(function(l){ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();});
}

// ── TRAINING VIEW ────────────────────────────────────────────────────────────
var _trMods=[
  {id:'ip',icon:'🌐',title:'IP Broadcast Fundamentals',dur:'25 min',
   steps:[
    {t:'SMPTE ST 2110',b:'ST 2110 separates video (ST 2110-20), audio (ST 2110-30), and ancillary data (ST 2110-40) into independent IP flows. Each flow is a multicast RTP stream.'},
    {t:'PTP Timing',b:'IEEE 1588v2 PTP with SMPTE ST 2059-2 profile synchronises all nodes to a GPS-locked grandmaster. Target offset: <50ns. Critical threshold: 100ns.'},
    {t:'NMOS Discovery',b:'IS-04 registers all senders/receivers. IS-05 manages connections. IS-07 distributes tally events. IS-08 handles audio channel mapping.'},
   ]},
  {id:'sw',icon:'🎬',title:'Switcher Operations',dur:'15 min',
   steps:[
    {t:'ME Banks',b:'3 Mix/Effects banks. Each has PGM (on-air) and PVW (preview) buses. ME 1 feeds master output.'},
    {t:'Cut & Auto',b:'CUT: instant switch PVW→PGM. AUTO: timed transition (MIX/WIPE/DIP) at set rate. Default 25 frames = 1 second at 25fps.'},
    {t:'Tally',b:'Tally derived from ME state after every operation. PGM=RED, PVW=GREEN. Distributed via IS-07 to all registered endpoints.'},
   ]},
  {id:'rt',icon:'🔀',title:'Router & Signal Flow',dur:'20 min',
   steps:[
    {t:'Crosspoint Matrix',b:'Full NxM matrix. Each cell routes a source to a destination. Levels: VIDEO (ST 2110-20), AUDIO (ST 2110-30), ANC (ST 2110-40).'},
    {t:'Salvos',b:'Group multiple crosspoints into a salvo for simultaneous execution. Essential for scene changes requiring coordinated re-routes.'},
    {t:'Locking',b:'Lock any destination to prevent accidental re-routing. Only ENGINEER role can unlock. Locked routes shown with padlock indicator.'},
   ]},
];
var _trActive=null,_trStep=0;
function _initTraining(){
  var v=document.getElementById('view-training');if(!v)return;
  v.innerHTML='<div style="display:flex;gap:8px;padding:8px;height:100%;overflow:hidden">'+
    '<div style="width:240px;flex-shrink:0;overflow-y:auto">'+
    '<div class="pnl"><div class="pnl-h"><span class="pnl-t">MODULES</span></div>'+
    '<div style="padding:6px" id="tr-list"></div></div></div>'+
    '<div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0">'+
    '<div class="pnl" style="flex:1;display:flex;flex-direction:column">'+
    '<div class="pnl-h" id="tr-hdr"><span class="pnl-t">SELECT A MODULE</span></div>'+
    '<div style="flex:1;padding:20px;overflow-y:auto" id="tr-body">'+
    '<div style="text-align:center;padding:60px;color:var(--t3)"><div style="font-size:40px">📚</div>'+
    '<div style="margin-top:12px;letter-spacing:2px;font-size:11px">SELECT A TRAINING MODULE TO BEGIN</div></div></div>'+
    '<div style="padding:10px;border-top:1px solid var(--b1);display:flex;align-items:center;gap:8px" id="tr-ctrl" style="display:none">'+
    '<button class="btn" onclick="trPrev()">◀ PREV</button>'+
    '<div style="flex:1;height:3px;background:var(--b1);border-radius:2px"><div id="tr-prog" style="height:100%;background:var(--acc);border-radius:2px;transition:width .3s;width:0%"></div></div>'+
    '<span style="font-size:9px;color:var(--t3)" id="tr-lbl">0/0</span>'+
    '<button class="btn btn-acc" onclick="trNext()">NEXT ▶</button>'+
    '</div></div></div></div>';
  _trRender();
}
function _trRender(){
  var el=document.getElementById('tr-list');if(!el)return;
  el.innerHTML=_trMods.map(function(m){
    var a=_trActive&&_trActive.id===m.id;
    return '<div style="padding:10px;border:1px solid '+(a?'var(--acc)':'var(--b1)')+';border-radius:4px;margin-bottom:4px;cursor:pointer;background:'+(a?'rgba(0,212,255,.06)':'var(--bg2)')+'" onclick="trLoad(\''+m.id+'\')">'+
      '<div style="font-size:13px;margin-bottom:4px">'+m.icon+'</div>'+
      '<div style="font-size:10px;font-weight:700">'+m.title+'</div>'+
      '<div style="font-size:9px;color:var(--t3);margin-top:2px">'+m.dur+' · '+m.steps.length+' steps</div>'+
      '</div>';
  }).join('');
}
function trLoad(id){
  _trActive=_trMods.find(function(m){return m.id===id;});
  _trStep=0;_trRender();_trShow();
  var c=document.getElementById('tr-ctrl');if(c)c.style.display='flex';
}
function _trShow(){
  if(!_trActive)return;
  var s=_trActive.steps[_trStep];
  var hdr=document.getElementById('tr-hdr');
  var body=document.getElementById('tr-body');
  var prog=document.getElementById('tr-prog');
  var lbl=document.getElementById('tr-lbl');
  if(hdr)hdr.innerHTML='<span class="pnl-t">'+_trActive.title+'</span><span class="bx bx-acc">STEP '+(_trStep+1)+'/'+_trActive.steps.length+'</span>';
  if(body)body.innerHTML='<div style="max-width:560px"><div style="font-size:18px;font-weight:700;margin-bottom:14px;color:var(--t1)">'+s.t+'</div><div style="font-size:13px;color:var(--t2);line-height:1.8">'+s.b+'</div>'+(_trStep===_trActive.steps.length-1?'<div style="margin-top:20px;padding:14px;background:rgba(0,255,136,.06);border:1px solid var(--pvw);border-radius:6px"><div style="font-size:10px;font-weight:700;color:var(--pvw);margin-bottom:4px">✓ MODULE COMPLETE</div><div style="font-size:11px;color:var(--t2)">Select another module to continue.</div></div>':'')+'</div>';
  var pct=((_trStep+1)/_trActive.steps.length*100).toFixed(0);
  if(prog)prog.style.width=pct+'%';
  if(lbl)lbl.textContent=(_trStep+1)+'/'+_trActive.steps.length;
}
function trNext(){if(_trActive&&_trStep<_trActive.steps.length-1){_trStep++;_trShow();}}
function trPrev(){if(_trActive&&_trStep>0){_trStep--;_trShow();}}

</script>

</body>
</html>`;

w(tail);

// ── Write output ─────────────────────────────────────────────────────────────
const html = out.join('\n');
const outPath = path.join(ROOT, 'nexus-v6.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('nexus-v6.html written:', html.split('\n').length, 'lines,', html.length, 'chars');

// Quick validation
console.log('Has DOCTYPE:', html.startsWith('<!DOCTYPE'));
console.log('Has </html>:', html.trimEnd().endsWith('</html>'));
console.log('Has login:', html.includes('id="login"'));
console.log('Has automation:', html.includes('_initAutomation'));
console.log('Has training:', html.includes('_initTraining'));
console.log('Has flow:', html.includes('_initFlow'));
console.log('<script> balance:', html.split('<script').length - 1, 'open /', html.split('</script>').length - 1, 'close');
