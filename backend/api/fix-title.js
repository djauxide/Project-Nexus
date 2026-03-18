'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', '..', 'nexus-v6.html');
let c = fs.readFileSync(FILE, 'utf8');

// Fix title — replace whatever is between <title> and </title>
c = c.replace(/<title>[^<]*<\/title>/, '<title>NEXUS v6 \u2014 Broadcast Orchestration Platform</title>');

fs.writeFileSync(FILE, c, 'utf8');
console.log('Title fixed:', c.match(/<title>[^<]*<\/title>/)[0]);
