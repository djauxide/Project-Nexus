const fs = require('fs');
const src = fs.readFileSync('gen-demo.js', 'utf8');

// Find JS_CORE manually - look for the backtick after "const JS_CORE = "
let pos = src.indexOf('const JS_CORE = `');
if (pos === -1) { console.log('JS_CORE not found'); process.exit(1); }
pos += 'const JS_CORE = `'.length;

// Find the closing backtick (not preceded by backslash)
let end = pos;
while (end < src.length) {
  if (src[end] === '`' && src[end-1] !== '\\') break;
  end++;
}
const inner = src.slice(pos, end);
console.log('JS_CORE length:', inner.length);
console.log('First 200 chars:', JSON.stringify(inner.slice(0, 200)));
console.log('Last 200 chars:', JSON.stringify(inner.slice(-200)));

try {
  new Function(inner);
  console.log('JS_CORE: VALID');
} catch(e) {
  console.log('JS_CORE ERROR:', e.message);
  // Binary search for error location
  let lo = 0, hi = inner.length;
  while (hi - lo > 20) {
    const mid = Math.floor((lo + hi) / 2);
    try { new Function(inner.slice(0, mid)); lo = mid; }
    catch(e2) { hi = mid; }
  }
  console.log('Error near char', lo, ':', JSON.stringify(inner.slice(Math.max(0,lo-80), lo+80)));
// Also show char codes around position 62
console.log('Chars 55-75:');
for (var i = 55; i < 75; i++) {
  console.log('  ['+i+']', inner.charCodeAt(i), JSON.stringify(inner[i]));
}
}
