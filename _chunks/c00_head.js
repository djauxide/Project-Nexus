'use strict';
const fs = require('fs');
const path = require('path');

// Read all chunks in order and concatenate
const chunkDir = path.join(__dirname, '_chunks');
const files = fs.readdirSync(chunkDir).filter(f => f.endsWith('.html')).sort();
const html = files.map(f => fs.readFileSync(path.join(chunkDir, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(__dirname, 'nexus-v6.html'), html, 'utf8');
console.log('nexus-v6.html written:', html.length, 'chars,', html.split('\n').length, 'lines');
