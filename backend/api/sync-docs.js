'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const src = path.join(ROOT, 'nexus-v6.html');
const dst = path.join(ROOT, 'docs', 'index.html');
fs.copyFileSync(src, dst);
const lines = fs.readFileSync(dst, 'utf8').split('\n').length;
console.log('Copied nexus-v6.html -> docs/index.html (' + lines + ' lines)');
