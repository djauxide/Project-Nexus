'use strict';
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const crypto = require('crypto');

const TOKEN    = 'nfp_8gYBvsWwTnmKAvEBXkDTiMkfqMgQ2ii1064c';
const HTML_SRC = path.join(__dirname, '..', '..', 'docs', 'index.html');

function api(method, urlPath, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    var bodyBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))) : null;
    var headers = Object.assign({ 'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'nexus/1.0' }, extraHeaders || {});
    if (bodyBuf) { headers['Content-Length'] = bodyBuf.length; if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'; }
    var req = https.request({ hostname: 'api.netlify.com', path: '/api/v1' + urlPath, method: method, headers: headers }, function(res) {
      var d = []; res.on('data', function(c) { d.push(c); });
      res.on('end', function() { var raw = Buffer.concat(d).toString(); try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); } });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function crc32(buf) {
  if (!crc32.t) { crc32.t = new Uint32Array(256); for (var i=0;i<256;i++){var c=i;for(var j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crc32.t[i]=c;} }
  var crc=0xFFFFFFFF; for(var i=0;i<buf.length;i++) crc=crc32.t[(crc^buf[i])&0xFF]^(crc>>>8); return (crc^0xFFFFFFFF)>>>0;
}

function buildZip(filename, content) {
  var name = Buffer.from(filename), data = Buffer.isBuffer(content)?content:Buffer.from(content);
  var comp = zlib.deflateRawSync(data, {level:9}), crc = crc32(data);
  var d = new Date(), dt = {t:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), d:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()};
  var lfh = Buffer.alloc(30+name.length);
  lfh.writeUInt32LE(0x04034b50,0); lfh.writeUInt16LE(20,4); lfh.writeUInt16LE(0,6); lfh.writeUInt16LE(8,8);
  lfh.writeUInt16LE(dt.t,10); lfh.writeUInt16LE(dt.d,12); lfh.writeUInt32LE(crc,14);
  lfh.writeUInt32LE(comp.length,18); lfh.writeUInt32LE(data.length,22); lfh.writeUInt16LE(name.length,26); lfh.writeUInt16LE(0,28); name.copy(lfh,30);
  var cd = Buffer.alloc(46+name.length);
  cd.writeUInt32LE(0x02014b50,0); cd.writeUInt16LE(20,4); cd.writeUInt16LE(20,6); cd.writeUInt16LE(0,8); cd.writeUInt16LE(8,10);
  cd.writeUInt16LE(dt.t,12); cd.writeUInt16LE(dt.d,14); cd.writeUInt32LE(crc,16); cd.writeUInt32LE(comp.length,20);
  cd.writeUInt32LE(data.length,24); cd.writeUInt16LE(name.length,28); cd.writeUInt16LE(0,30); cd.writeUInt16LE(0,32);
  cd.writeUInt16LE(0,34); cd.writeUInt16LE(0,36); cd.writeUInt32LE(0,38); cd.writeUInt32LE(0,42); name.copy(cd,46);
  var eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(0,4); eocd.writeUInt16LE(0,6); eocd.writeUInt16LE(1,8);
  eocd.writeUInt16LE(1,10); eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(lfh.length+comp.length,16); eocd.writeUInt16LE(0,20);
  return Buffer.concat([lfh, comp, cd, eocd]);
}

async function main() {
  var html = fs.readFileSync(HTML_SRC);
  console.log('HTML:', Math.round(html.length/1024)+'KB');

  // Delete old site first to free the name
  var sites = await api('GET', '/sites?per_page=100');
  var old = Array.isArray(sites) && sites.find(function(s){return s.name==='nexus-v4-demo';});
  if (old) {
    console.log('Deleting old site...');
    await api('DELETE', '/sites/'+old.id);
    console.log('Deleted.');
    await new Promise(function(r){setTimeout(r,2000);});
  }

  // Create fresh site
  var siteName = 'nexus-v4-demo-' + crypto.randomBytes(2).toString('hex');
  console.log('Creating site:', siteName);
  var site = await api('POST', '/sites', {name: siteName});
  console.log('Site ID:', site.id);
  console.log('Site URL:', site.ssl_url);

  // Deploy zip
  var zip = buildZip('index.html', html);
  console.log('Deploying zip:', Math.round(zip.length/1024)+'KB');
  var deploy = await api('POST', '/sites/'+site.id+'/deploys', zip, {'Content-Type':'application/zip'});
  console.log('Deploy ID:', deploy.id, '| State:', deploy.state);

  // Poll until ready
  var id = deploy.id, state = deploy.state, url = deploy.ssl_url || site.ssl_url;
  for (var i = 0; i < 20 && state !== 'ready' && state !== 'error'; i++) {
    await new Promise(function(r){setTimeout(r,2000);});
    var d = await api('GET', '/deploys/'+id);
    state = d.state; url = d.ssl_url || url;
    process.stdout.write('  state: ' + state + '          \r');
  }
  console.log('');
  console.log('');
  console.log('==============================================');
  console.log('LIVE URL: ' + url);
  console.log('STATE:    ' + state);
  console.log('==============================================');

  // Open in browser
  require('child_process').exec('cmd /c start ' + url);
}

main().catch(function(e){ console.error('ERROR:', e.message); });
