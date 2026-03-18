'use strict';
/**
 * NEXUS v8 — Public Tunnel Server
 * Serves nexus-v8.html locally on port 3000
 * Creates a public Cloudflare Quick Tunnel (no account needed)
 * cloudflared.exe is auto-downloaded on first run and reused
 */
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const { spawn } = require('child_process');

const HTML      = path.join(__dirname, '..', '..', 'nexus-v8.html');
const PORT      = 3000;
const CF_EXE    = path.join(__dirname, '..', '..', 'cloudflared.exe');
const CF_URL    = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

// ── Verify HTML exists ────────────────────────────────────────────────────────
if (!fs.existsSync(HTML)) {
  console.error('ERROR: nexus-v8.html not found at', HTML);
  process.exit(1);
}

// ── Local HTTP server ─────────────────────────────────────────────────────────
const server = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(HTML).pipe(res);
});

server.listen(PORT, '0.0.0.0', function() {
  var os = require('os');
  var ifaces = os.networkInterfaces();
  var localIPs = ['localhost'];
  Object.values(ifaces).forEach(function(list) {
    (list || []).forEach(function(i) {
      if (i.family === 'IPv4' && !i.internal) localIPs.push(i.address);
    });
  });

  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   NEXUS v8 — Broadcast Orchestration     ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  LOCAL LINKS:');
  localIPs.forEach(function(ip) {
    console.log('    http://' + ip + ':' + PORT);
  });
  console.log('');
  console.log('  Password : nexus2024');
  console.log('');
  console.log('  Starting Cloudflare tunnel...');
  console.log('');

  // Open local link in browser
  spawn('cmd', ['/c', 'start', 'http://localhost:' + PORT], { detached: true, stdio: 'ignore' });

  // Start tunnel
  startTunnel();
});

// ── Cloudflare Quick Tunnel ───────────────────────────────────────────────────
function startTunnel() {
  if (fs.existsSync(CF_EXE)) {
    launchTunnel();
  } else {
    console.log('  Downloading cloudflared.exe (one-time)...');
    downloadFile(CF_URL, CF_EXE, function(err) {
      if (err) {
        console.error('  Download failed:', err.message);
        console.log('  Running local-only mode.');
        return;
      }
      console.log('  cloudflared.exe saved to project root.');
      launchTunnel();
    });
  }
}

function launchTunnel() {
  var cf = spawn(CF_EXE, ['tunnel', '--url', 'http://localhost:' + PORT], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  var urlFound = false;

  function parseLine(line) {
    var m = line.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/i);
    if (m && !urlFound) {
      urlFound = true;
      console.log('');
      console.log('  ╔══════════════════════════════════════════════════════╗');
      console.log('  ║  PUBLIC URL (share with client):                     ║');
      console.log('  ║  ' + m[0].padEnd(52) + '║');
      console.log('  ║  Password: nexus2024                                 ║');
      console.log('  ╚══════════════════════════════════════════════════════╝');
      console.log('');
      console.log('  Press Ctrl+C to stop both server and tunnel.');
      console.log('');
    }
  }

  cf.stdout.on('data', function(d) {
    d.toString().split('\n').forEach(function(l) { if (l.trim()) parseLine(l); });
  });
  cf.stderr.on('data', function(d) {
    d.toString().split('\n').forEach(function(l) { if (l.trim()) parseLine(l); });
  });
  cf.on('close', function(code) {
    console.log('Tunnel closed (code ' + code + ')');
  });
  cf.on('error', function(e) {
    console.error('cloudflared error:', e.message);
  });

  process.on('SIGINT', function() {
    console.log('\nShutting down...');
    cf.kill();
    server.close();
    process.exit(0);
  });
}

// ── File downloader ───────────────────────────────────────────────────────────
function downloadFile(url, dest, cb) {
  // Follow redirects
  https.get(url, function(res) {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return downloadFile(res.headers.location, dest, cb);
    }
    if (res.statusCode !== 200) {
      return cb(new Error('HTTP ' + res.statusCode));
    }
    var file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', function() { file.close(cb); });
    file.on('error', function(e) { fs.unlink(dest, function(){}); cb(e); });
  }).on('error', cb);
}
