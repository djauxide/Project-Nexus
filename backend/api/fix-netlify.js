'use strict';
const https = require('https');
const TOKEN     = 'nfp_8gYBvsWwTnmKAvEBXkDTiMkfqMgQ2ii1064c';
const SITE_ID   = '19f6f763-029b-4e7b-af03-380725d8b43a';
const DEPLOY_ID = '69b7c703767823f848f42ae1';

function api(method, path, body) {
  return new Promise(function(resolve, reject) {
    var bodyBuf = body ? Buffer.from(JSON.stringify(body)) : null;
    var headers = {
      'Authorization': 'Bearer ' + TOKEN,
      'User-Agent': 'nexus/1.0'
    };
    if (bodyBuf) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = bodyBuf.length; }
    var req = https.request({
      hostname: 'api.netlify.com',
      path: '/api/v1' + path,
      method: method,
      headers: headers
    }, function(res) {
      var d = [];
      res.on('data', function(c) { d.push(c); });
      res.on('end', function() {
        var raw = Buffer.concat(d).toString();
        try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function main() {
  // Restore/publish the deploy to the site's main URL
  console.log('Publishing deploy ' + DEPLOY_ID + ' to site...');
  var result = await api('POST', '/sites/' + SITE_ID + '/deploys/' + DEPLOY_ID + '/restore', {});
  console.log('Result state:', result.state);
  console.log('URL:', result.ssl_url || result.url);

  // Also verify site
  var site = await api('GET', '/sites/' + SITE_ID, null);
  console.log('\nSite published deploy:', site.published_deploy && site.published_deploy.id);
  console.log('Site URL:', site.ssl_url);
  console.log('Custom domain:', site.custom_domain || 'none');
}
main().catch(console.error);
