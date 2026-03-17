'use strict';
const fs = require('fs'), path = require('path');
const c = fs.readFileSync(path.join(__dirname, '..', '..', 'nexus-v6.html'), 'utf8');
const views = ['live','mosaic','switcher','router','rundown','playout','orchestrator',
  'cloudmcr','srt','scopes','ptp','nmos','devices','api','preflight','training',
  'automation','flow','network','database'];
views.forEach(v => console.log('view-' + v + ':', c.includes('id="view-' + v + '"')));
console.log('\nHas _initLive:', c.includes('_initLive'));
console.log('Has _initMosaic:', c.includes('_initMosaic'));
console.log('Has _initSwitcher:', c.includes('_initSwitcher'));
console.log('Has _initRouter:', c.includes('_initRouter'));
console.log('Has _initScopes:', c.includes('_initScopes'));
console.log('Has NAV_GROUPS:', c.includes('NAV_GROUPS'));
console.log('Has doLogin:', c.includes('doLogin'));
