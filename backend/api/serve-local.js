'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { exec } = require('child_process');

const HTML = path.join(__dirname, 'nexus-demo.html');
const PORT = 8080;

const server = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(HTML).pipe(res);
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
  console.log('NEXUS v4 Demo — Local Server');
  console.log('============================');
  ips.forEach(function(ip) {
    console.log('  http://' + ip + ':' + PORT);
  });
  console.log('');
  console.log('Password: nexus2024');
  console.log('Press Ctrl+C to stop.');
  console.log('');

  exec('cmd /c start http://localhost:' + PORT);
});

process.on('SIGINT', function() { server.close(); process.exit(0); });
