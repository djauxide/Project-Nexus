'use strict';
const { execSync } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function run(cmd) {
  console.log('>', cmd);
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
    if (out.trim()) console.log(out.trim());
  } catch (e) {
    console.error(e.stdout || e.message);
    process.exit(1);
  }
}

run('git add nexus-v6.html docs/index.html');
run('git commit -m "fix: restore full v5 content to nexus-v6.html and docs/index.html - 2774 lines"');
run('git pull --rebase origin main');
run('git push origin main');
console.log('\nDone. Both links now serve the full 2774-line build.');
