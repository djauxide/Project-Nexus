'use strict';
// Serves nexus-demo.html on a local port, then tunnels via localhost.run (SSH)
// No accounts, no installs needed — just Node + SSH (built into Windows 10+)
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { spawn } = require('child_process');

const HTML = path.join(__dirname, 'nexus-demo.html');
const PORT = 8743;

// 1. Start local HTTP server
const server = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(HTML).pipe(res);
});

server.listen(PORT, '127.0.0.1', function() {
  console.log('Local server: http://localhost:' + PORT);
  console.log('Starting SSH tunnel via localhost.run...');
  console.log('(This requires SSH — built into Windows 10+)');
  console.log('');

  // 2. SSH tunnel to localhost.run — free, no account needed
  var ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-R', '80:localhost:' + PORT,
    'nokey@localhost.run'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  var urlFound = false;

  function parseLine(line) {
    // localhost.run outputs the public URL in the tunnel info
    var m = line.match(/https?:\/\/[a-z0-9\-]+\.lhr\.life/i) ||
            line.match(/https?:\/\/[a-z0-9\-]+\.localhost\.run/i);
    if (m && !urlFound) {
      urlFound = true;
      console.log('');
      console.log('================================================');
      console.log('PUBLIC URL: ' + m[0]);
      console.log('Password:   nexus2024');
      console.log('================================================');
      console.log('');
      console.log('Share this URL with your client.');
      console.log('Press Ctrl+C to stop.');
      // Open in browser
      spawn('cmd', ['/c', 'start', m[0]], { detached: true, stdio: 'ignore' });
    }
  }

  ssh.stdout.on('data', function(d) {
    var lines = d.toString().split('\n');
    lines.forEach(function(l) { if (l.trim()) { console.log('[ssh]', l); parseLine(l); } });
  });
  ssh.stderr.on('data', function(d) {
    var lines = d.toString().split('\n');
    lines.forEach(function(l) { if (l.trim()) { console.log('[ssh]', l); parseLine(l); } });
  });
  ssh.on('close', function(code) {
    console.log('SSH tunnel closed (code ' + code + ')');
    server.close();
    process.exit(0);
  });
  ssh.on('error', function(e) {
    console.error('SSH error:', e.message);
    console.log('');
    console.log('SSH not available. Try accessing locally:');
    console.log('http://localhost:' + PORT);
  });
});

process.on('SIGINT', function() {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});
