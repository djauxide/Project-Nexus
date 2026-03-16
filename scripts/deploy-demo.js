#!/usr/bin/env node
'use strict';
/**
 * NEXUS Demo — Netlify direct deploy
 * Uses Netlify's zip-deploy API. No CLI, no npm install needed.
 * Node built-ins only: https, fs, zlib, path, crypto
 *
 * Usage:
 *   node scripts/deploy-demo.js <NETLIFY_TOKEN> [site-name]
 *
 * Get a token: https://app.netlify.com/user/applications#personal-access-tokens
 * Site name is optional — omit to auto-generate, or reuse an existing one.
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const zlib   = require('zlib');
const crypto = require('crypto');

const TOKEN     = process.argv[2];
const SITE_NAME = process.argv[3] || ('nexus-demo-' + crypto.randomBytes(3).toString('hex'));
const HTML_SRC  = path.join(__dirname, '..', 'docs', 'index.html');

if (!TOKEN) {
  console.error('Usage: node scripts/deploy-demo.js <NETLIFY_TOKEN> [site-name]');
  console.error('Get token: https://app.netlify.com/user/applications#personal-access-tokens');
  process.exit(1);
}

if (!fs.existsSync(HTML_SRC)) {
  console.error('Missing: ' + HTML_SRC);
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function apiRequest(method, urlPath, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    var bodyBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))) : null;
    var headers = Object.assign({
      'Authorization': 'Bearer ' + TOKEN,
      'User-Agent':    'nexus-deploy/1.0'
    }, extraHeaders || {});
    if (bodyBuf) {
      headers['Content-Length'] = bodyBuf.length;
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    var req = https.request({
      hostname: 'api.netlify.com',
      path:     '/api/v1' + urlPath,
      method:   method,
      headers:  headers
    }, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var raw = Buffer.concat(chunks).toString();
        var data;
        try { data = JSON.parse(raw); } catch(e) { data = raw; }
        if (res.statusCode >= 400) {
          reject(new Error('HTTP ' + res.statusCode + ': ' + (data.message || raw)));
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// Build a minimal zip in memory containing just index.html
// ZIP format: local file header + data + central directory + end record
function buildZip(filename, content) {
  var nameBuf    = Buffer.from(filename);
  var contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  var compressed = zlib.deflateRawSync(contentBuf, { level: 9 });

  var crc = crc32(contentBuf);
  var now = dosDateTime();

  // Local file header
  var lfh = Buffer.alloc(30 + nameBuf.length);
  lfh.writeUInt32LE(0x04034b50, 0);  // signature
  lfh.writeUInt16LE(20, 4);           // version needed
  lfh.writeUInt16LE(0, 6);            // flags
  lfh.writeUInt16LE(8, 8);            // compression: deflate
  lfh.writeUInt16LE(now.time, 10);
  lfh.writeUInt16LE(now.date, 12);
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(compressed.length, 18);
  lfh.writeUInt32LE(contentBuf.length, 22);
  lfh.writeUInt16LE(nameBuf.length, 26);
  lfh.writeUInt16LE(0, 28);
  nameBuf.copy(lfh, 30);

  var dataOffset = 0;
  var centralDir = Buffer.alloc(46 + nameBuf.length);
  centralDir.writeUInt32LE(0x02014b50, 0); // signature
  centralDir.writeUInt16LE(20, 4);
  centralDir.writeUInt16LE(20, 6);
  centralDir.writeUInt16LE(0, 8);
  centralDir.writeUInt16LE(8, 10);
  centralDir.writeUInt16LE(now.time, 12);
  centralDir.writeUInt16LE(now.date, 14);
  centralDir.writeUInt32LE(crc, 16);
  centralDir.writeUInt32LE(compressed.length, 20);
  centralDir.writeUInt32LE(contentBuf.length, 24);
  centralDir.writeUInt16LE(nameBuf.length, 28);
  centralDir.writeUInt16LE(0, 30);
  centralDir.writeUInt16LE(0, 32);
  centralDir.writeUInt16LE(0, 34);
  centralDir.writeUInt16LE(0, 36);
  centralDir.writeUInt32LE(0, 38);
  centralDir.writeUInt32LE(dataOffset, 42);
  nameBuf.copy(centralDir, 46);

  var cdOffset = lfh.length + compressed.length;
  var eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([lfh, compressed, centralDir, eocd]);
}

function crc32(buf) {
  var table = crc32.table || (crc32.table = (function() {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime() {
  var d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  var html = fs.readFileSync(HTML_SRC);
  console.log('HTML size: ' + Math.round(html.length / 1024) + ' KB');

  // 1. Find or create site
  console.log('Checking for existing site "' + SITE_NAME + '"...');
  var sites = await apiRequest('GET', '/sites?per_page=100', null);
  var site  = Array.isArray(sites) && sites.find(function(s) { return s.name === SITE_NAME; });

  if (!site) {
    console.log('Creating new site "' + SITE_NAME + '"...');
    site = await apiRequest('POST', '/sites', { name: SITE_NAME });
    console.log('Site created: ' + site.ssl_url);
  } else {
    console.log('Reusing site: ' + site.ssl_url);
  }

  // 2. Build zip
  console.log('Building zip...');
  var zip = buildZip('index.html', html);
  console.log('Zip size: ' + Math.round(zip.length / 1024) + ' KB');

  // 3. Deploy
  console.log('Deploying...');
  var deploy = await apiRequest(
    'POST',
    '/sites/' + site.id + '/deploys',
    zip,
    { 'Content-Type': 'application/zip' }
  );

  // 4. Wait for ready
  var url = deploy.ssl_url || deploy.url || ('https://' + SITE_NAME + '.netlify.app');
  var deployId = deploy.id;
  var state = deploy.state;
  var attempts = 0;

  while (state !== 'ready' && state !== 'error' && attempts < 30) {
    process.stdout.write('  state: ' + state + ' ...\r');
    await new Promise(function(r) { setTimeout(r, 2000); });
    var d = await apiRequest('GET', '/deploys/' + deployId, null);
    state = d.state;
    url   = d.ssl_url || d.url || url;
    attempts++;
  }

  console.log('');
  if (state === 'ready') {
    console.log('\n\u2705 DEPLOYED: ' + url);
    console.log('   Share this URL with your client.');
  } else {
    console.log('\u26a0 Deploy state: ' + state + ' — check https://app.netlify.com');
    console.log('   URL: ' + url);
  }
}

main().catch(function(e) {
  console.error('\u274c Error:', e.message);
  process.exit(1);
});
