'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const HTML = path.join(__dirname, '..', '..', 'nexus-v7.html');
const PORT = 3000;

if (!fs.existsSync(HTML)) {
  console.error('ERROR: nexus-v7.html not found at', HTML);
  process.exit(1);
}

const server = http.createServer(function(req, res) {
  // Serve nexus-v6.html for all requests
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(HTML).pipe(res);
});

server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use. Kill the existing process and retry.');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', function() {
  var os = require('os');
  var ifaces = os.networkInterfaces();
  var ips = ['localhost'];
  Object.values(ifaces).forEach(function(list) {
    list.forEach(function(i) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    });
  });

  console.log('');
  console.log('  NEXUS v7 — Local Demo Server');
  console.log('  ==============================');
  ips.forEach(function(ip) {
    console.log('  http://' + ip + ':' + PORT);
  });
  console.log('');
  console.log('  Password : nexus2024');
  console.log('  File     : ' + HTML);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');

  exec('cmd /c start http://localhost:' + PORT);
});

process.on('SIGINT', function() {
  console.log('\nStopping server...');
  server.close();
  process.exit(0);
});
