'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', '..', 'nexus-v5.html');
let c = fs.readFileSync(FILE, 'utf8');

// ── 1. Add TRAINER to login role selector ─────────────────────────────────────
c = c.replace(
  /(<select class="lg-sel" id="lg-role">)([\s\S]*?)(<\/select>)/,
  '<select class="lg-sel" id="lg-role">' +
  '<option value="ENGINEER">ENGINEER \u2014 Full System Access</option>' +
  '<option value="OPERATOR">OPERATOR \u2014 Production Control</option>' +
  '<option value="TRAINER">TRAINER \u2014 Training &amp; Guided Mode</option>' +
  '<option value="VIEWER">VIEWER \u2014 Monitor Only</option>' +
  '</select>'
);

// ── 2. Add SWITCH USER button to topbar right ─────────────────────────────────
c = c.replace(
  /<div class="tb-right">\s*<span class="tb-role" id="tb-role"><\/span>\s*<span class="dot dot-ok dot-pulse"><\/span>\s*<\/div>/,
  '<div class="tb-right">' +
  '<button class="nb" style="font-size:8px;letter-spacing:1px;padding:0 10px;border:1px solid var(--b2);border-radius:3px;height:26px;margin-right:6px;color:var(--acc)" onclick="switchUser()">&#8635; SWITCH USER</button>' +
  '<span class="tb-role" id="tb-role"></span>' +
  '<span class="dot dot-ok dot-pulse"></span>' +
  '</div>'
);

// ── 3. Add view-training div ──────────────────────────────────────────────────
if (!c.includes('view-training')) {
  c = c.replace(
    '<div class="view" id="view-orchestrator"></div>',
    '<div class="view" id="view-orchestrator"></div>\n    <div class="view" id="view-training"></div>'
  );
}

// ── 4. Add TRAINING to VIEWS array ────────────────────────────────────────────
if (!c.includes("'training','TRAINING'")) {
  c = c.replace(
    "['preflight','PRE-FLIGHT']",
    "['preflight','PRE-FLIGHT'],['training','TRAINING']"
  );
}

// ── 5. Add _initTraining() to _initAll ────────────────────────────────────────
if (!c.includes('_initTraining()')) {
  c = c.replace(
    '_initOrchestrator();',
    '_initOrchestrator();\n  _initTraining();'
  );
}

// ── 6. Add ROLE_NAV + canEngineer/canOperator after canOp ─────────────────────
if (!c.includes('ROLE_NAV')) {
  c = c.replace(
    'function canOp(){ return ROLE !== \'VIEWER\'; }',
    'function canOp(){ return ROLE===\'ENGINEER\'||ROLE===\'OPERATOR\'||ROLE===\'TRAINER\'; }\n' +
    'function canEngineer(){ return ROLE===\'ENGINEER\'; }\n' +
    'function canOperator(){ return ROLE===\'ENGINEER\'||ROLE===\'OPERATOR\'; }\n' +
    'var ROLE_NAV={\n' +
    '  ENGINEER:[\'live\',\'mosaic\',\'switcher\',\'router\',\'rundown\',\'playout\',\'orchestrator\',\'cloudmcr\',\'srt\',\'scopes\',\'ptp\',\'nmos\',\'devices\',\'api\',\'preflight\',\'training\'],\n' +
    '  OPERATOR:[\'live\',\'mosaic\',\'switcher\',\'router\',\'rundown\',\'playout\',\'cloudmcr\',\'srt\',\'scopes\',\'ptp\',\'nmos\',\'preflight\',\'training\'],\n' +
    '  TRAINER:[\'live\',\'mosaic\',\'switcher\',\'router\',\'rundown\',\'playout\',\'orchestrator\',\'cloudmcr\',\'srt\',\'scopes\',\'ptp\',\'nmos\',\'devices\',\'preflight\',\'training\'],\n' +
    '  VIEWER:[\'live\',\'mosaic\',\'scopes\',\'ptp\',\'training\']\n' +
    '};'
  );
}

// ── 7. Update _buildNav to filter by role ─────────────────────────────────────
c = c.replace(
  /function _buildNav\(\) \{[\s\S]*?nav\.innerHTML = VIEWS\.map\(function\(x\)\{/,
  'function _buildNav() {\n' +
  '  var nav = document.getElementById(\'tb-nav\');\n' +
  '  var allowed = ROLE_NAV[ROLE] || ROLE_NAV.VIEWER;\n' +
  '  nav.innerHTML = VIEWS.filter(function(x){ return allowed.indexOf(x[0]) !== -1; }).map(function(x){'
);

// ── 8. Add switchUser + doLogin patch before closing </script> of main block ──
if (!c.includes('switchUser')) {
  const switchCode = `
// ─── USER SWITCHER ────────────────────────────────────────────────────────────
function switchUser() {
  var lg = document.getElementById('login');
  lg.style.display = 'flex';
  document.getElementById('lg-pw').value = '';
  document.getElementById('lg-err').style.display = 'none';
  window._switchMode = true;
}
var _origDoLogin = doLogin;
doLogin = function() {
  var pw = document.getElementById('lg-pw').value;
  var err = document.getElementById('lg-err');
  if (pw !== PW) { err.style.display='block'; return; }
  err.style.display = 'none';
  ROLE = document.getElementById('lg-role').value.split(' ')[0];
  document.getElementById('login').style.display = 'none';
  document.getElementById('tb-role').textContent = ROLE;
  document.getElementById('sb-role').textContent = ROLE;
  if (window._switchMode) {
    window._switchMode = false;
    _buildNav();
    showView('live');
    addAlarm('info','Switched to role: ' + ROLE);
  } else {
    document.getElementById('app').style.display = 'flex';
    _buildNav();
    _startTC();
    _initAll();
    showView('live');
  }
};
`;
  // Insert after the _wsConnect block (find the WS section end)
  c = c.replace('// ─── LIVE VIEW', switchCode + '\n// ─── LIVE VIEW');
}

fs.writeFileSync(FILE, c, 'utf8');
console.log('Patch done. Checking:');
console.log('  TRAINER option:', c.includes('value="TRAINER"'));
console.log('  ROLE_NAV:', c.includes('ROLE_NAV'));
console.log('  view-training:', c.includes('view-training'));
console.log('  _initTraining:', c.includes('_initTraining'));
console.log('  switchUser:', c.includes('switchUser'));
console.log('  TRAINING nav:', c.includes("'training','TRAINING'"));
