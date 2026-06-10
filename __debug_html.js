const fs = require('fs');
const path = require('path');
const http = require('http');

const p = path.resolve('D:/tracer/frontend/index.html');
console.log('path:', p);
const content = fs.readFileSync(p, 'utf8');
console.log('disk has src?', content.includes('<script type="module" src="/app.js"'));
const bodyStart = content.indexOf('<body');
const bodyEnd = content.indexOf('</body>') + 7;
console.log('disk body:', content.slice(bodyStart, bodyEnd));

const url = 'http://127.0.0.1:5000/?t=' + Date.now();
http.get(url, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('status:', res.statusCode);
    console.log('resp has src?', d.includes('<script type="module" src="/app.js"'));
    console.log('resp has import?', d.includes('import React from'));
    const rbStart = d.indexOf('<body');
    const rbEnd = d.indexOf('</body>') + 7;
    console.log('resp body:', d.slice(rbStart, rbEnd));
  });
}).on('error', e => { console.error(e); process.exit(1); });
