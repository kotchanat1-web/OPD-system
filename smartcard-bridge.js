const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 8181;
const exePath = path.join(__dirname, 'CardReader.exe');
const indexPath = path.join(__dirname, 'index.html');

// In-flight request lock & debounce cache to prevent USB collision
let isExecuting = false;
let executionQueue = [];
let lastReadResult = null;
let lastReadTime = 0;
const CACHE_DURATION_MS = 350;

function executeCardReader(args, callback) {
  const isReadCommand = (!args || args.length === 0);
  const now = Date.now();

  // If reading card and we have a very fresh cache, return cached result immediately
  if (isReadCommand && lastReadResult && (now - lastReadTime) < CACHE_DURATION_MS) {
    return callback(null, lastReadResult);
  }

  // Queue if another read process is already communicating with the chip
  if (isExecuting) {
    executionQueue.push({ args, callback, isReadCommand });
    return;
  }

  isExecuting = true;

  execFile(exePath, args || [], { encoding: 'utf8', timeout: 3500 }, (err, stdout, stderr) => {
    isExecuting = false;
    const output = (stdout || '').trim();

    let resultJson = output;
    if (!resultJson || !resultJson.startsWith('{')) {
      if (err) {
        resultJson = JSON.stringify({
          status: 'error',
          message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเครื่องอ่าน: ' + (stderr || err.message)
        });
      } else {
        resultJson = JSON.stringify({
          status: 'waiting_card',
          message: 'กำลังตรวจจับเครื่องอ่านบัตร...'
        });
      }
    }

    if (isReadCommand) {
      lastReadResult = resultJson;
      lastReadTime = Date.now();
    }

    callback(null, resultJson);

    // Process next queued request if any
    if (executionQueue.length > 0) {
      const next = executionQueue.shift();
      // If next is a read command and we just finished reading, resolve immediately
      if (next.isReadCommand && (Date.now() - lastReadTime) < CACHE_DURATION_MS) {
        next.callback(null, lastReadResult);
        // continue draining any further duplicates
        while (executionQueue.length > 0 && executionQueue[0].isReadCommand) {
          executionQueue.shift().callback(null, lastReadResult);
        }
      } else {
        executeCardReader(next.args, next.callback);
      }
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const server = http.createServer((req, res) => {
  // Enhanced CORS & Chrome Private Network Access Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const rawUrl = (req.url || '/').split('?')[0];
  const urlPath = rawUrl.toLowerCase();

  // 1. Smart Card Read API (/read, /api/read)
  if (urlPath === '/read' || urlPath === '/api/read') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    executeCardReader([], (err, resultJson) => {
      res.writeHead(200);
      res.end(resultJson);
    });
  } 
  // 2. Health & Reader Status API (/health, /status, /api/health)
  else if (urlPath === '/health' || urlPath === '/status' || urlPath === '/api/health' || urlPath === '/api/status') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    executeCardReader(['--health'], (err, resultJson) => {
      res.writeHead(200);
      res.end(resultJson);
    });
  } 
  // 3. Web App Serving (/app, /, /index.html, /opd)
  else if (urlPath === '/' || urlPath === '/app' || urlPath === '/index.html' || urlPath === '/opd') {
    fs.readFile(indexPath, (err, htmlData) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading index.html: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlData);
    });
  }
  // 4. Static file serving (e.g. assets)
  else {
    const safePath = path.normalize(rawUrl).replace(/^(\.\.[\/\\])+/, '');
    const localFilePath = path.join(__dirname, safePath);

    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      const ext = path.extname(localFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(localFilePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not Found', path: rawUrl }));
    }
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`[INFO] Port ${PORT} is already in use. Smart Card Bridge is already active!`);
  } else {
    console.error('Server error:', e);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`===================================================================`);
  console.log(`  Smart Card Bridge is listening on http://127.0.0.1:${PORT}`);
  console.log(`  Web App URL: http://127.0.0.1:${PORT}/app`);
  console.log(`  พร้อมอ่านข้อมูลบัตรประชาชนสำหรับคลินิกเวชกรรมนครสวรรค์เฮลท์แคร์`);
  console.log(`===================================================================`);
});
