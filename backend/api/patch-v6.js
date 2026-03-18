'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'nexus-v6.html');
let c = fs.readFileSync(FILE, 'utf8');
const before = c.length;

// ── 1. Fix WS port — use 3001 so it doesn't conflict with the HTML server on 8080
c = c.replace(
  "var wsUrl = 'ws://localhost:8080/ws/control?token=' + _DEMO_TOKEN;",
  "var wsUrl = 'ws://localhost:3001/ws/control?token=' + _DEMO_TOKEN;"
);

// ── 2. Wrap every _initXxx() call in _initAll with try/catch so one broken
//    view can't crash the entire app
c = c.replace(
  /function _initAll\(\) \{([\s\S]*?)\n\}/,
  function(match, body) {
    const wrapped = body.replace(
      /^(\s+)(_init\w+\(\));$/gm,
      '$1try { $2 } catch(e) { console.warn("$2 failed:", e); }'
    );
    return 'function _initAll() {' + wrapped + '\n}';
  }
);

// ── 3. Add title version tag so we can confirm which build is live
c = c.replace(
  '<title>NEXUS v5 — Broadcast Orchestration Platform</title>',
  '<title>NEXUS v6 — Broadcast Orchestration Platform</title>'
);

// ── 4. Update topbar version label
c = c.replace(
  /<div class="tb-v">v5<\/div>/,
  '<div class="tb-v">v6</div>'
);

// ── 5. Fix garbled UTF-8 sequences (â€" → —, Â± → ±, â†' → →)
c = c.replace(/â€"/g, '—');
c = c.replace(/Â±/g, '±');
c = c.replace(/â†'/g, '→');
c = c.replace(/â€™/g, "'");
c = c.replace(/â€œ/g, '"');
c = c.replace(/â€/g, '"');
c = c.replace(/Â·/g, '·');

const after = c.length;
fs.writeFileSync(FILE, c, 'utf8');
console.log('Patched nexus-v6.html');
console.log('  Size before:', before, '→ after:', after);
console.log('  WS port fixed:', c.includes('localhost:3001'));
console.log('  Title is v6:', c.includes('NEXUS v6'));
console.log('  try/catch in _initAll:', c.includes('try { _initLive()'));
console.log('  Garbled chars fixed:', !c.includes('â€"'));
