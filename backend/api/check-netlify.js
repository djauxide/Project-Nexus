'use strict';
const https = require('https');
const TOKEN = 'nfp_8gYBvsWwTnmKAvEBXkDTiMkfqMgQ2ii1064c';

function api(path) {
  return new Promise(function(resolve, reject) {
    https.get({
      hostname: 'api.netlify.com',
      path: '/api/v1' + path,
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'nexus/1.0' }
    }, function(res) {
      var d = [];
      res.on('data', function(c) { d.push(c); });
      res.on('end', function() { resolve(JSON.parse(Buffer.concat(d).toString())); });
    }).on('error', reject);
  });
}

async function main() {
  var sites = await api('/sites?per_page=100');
  var site = sites.find(function(s) { return s.name === 'nexus-v4-demo'; });
  if (!site) { console.log('Site not found. All sites:'); sites.forEach(function(s){ console.log(' -', s.name, s.ssl_url); }); return; }
  
  console.log('Site ID:', site.id);
  console.log('Site URL:', site.ssl_url);
  console.log('Published deploy:', site.published_deploy ? site.published_deploy.id : 'NONE');
  console.log('State:', site.published_deploy ? site.published_deploy.state : 'N/A');

  // Get recent deploys
  var deploys = await api('/sites/' + site.id + '/deploys?per_page=5');
  console.log('\nRecent deploys:');
  deploys.forEach(function(d) {
    console.log(' ', d.id, d.state, d.deploy_ssl_url || d.ssl_url || '');
  });
}
main().catch(console.error);
