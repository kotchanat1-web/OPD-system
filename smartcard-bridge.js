const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8181;
const exePath = path.join(__dirname, 'CardReader.exe');
const indexPath = path.join(__dirname, 'index.html');

// In-flight request lock & debounce cache
let isExecuting = false;
let executionQueue = [];
let lastReadResult = null;
let lastReadTime = 0;
const CACHE_DURATION_MS = 350;

// Active WebSocket client sockets
const activeWsSockets = new Set();

function createWebSocketFrame(data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8');
  const length = payload.length;
  let header;

  if (length <= 125) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function parseWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7F;
  let currentOffset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    currentOffset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    currentOffset = 10;
  }

  let maskingKey = null;
  if (isMasked) {
    if (buffer.length < currentOffset + 4) return null;
    maskingKey = buffer.slice(currentOffset, currentOffset + 4);
    currentOffset += 4;
  }

  if (buffer.length < currentOffset + payloadLength) return null;
  const payload = Buffer.from(buffer.slice(currentOffset, currentOffset + payloadLength));

  if (isMasked && maskingKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4];
    }
  }

  return { payload: payload.toString('utf8'), totalLength: currentOffset + payloadLength };
}

function broadcastWs(msgObj) {
  const frame = createWebSocketFrame(msgObj);
  for (const socket of activeWsSockets) {
    try {
      if (socket.writable) socket.write(frame);
    } catch (e) {
      activeWsSockets.delete(socket);
    }
  }
}

function executeCardReader(args, callback) {
  const isReadCommand = (!args || args.length === 0);
  const now = Date.now();

  if (isReadCommand && lastReadResult && (now - lastReadTime) < CACHE_DURATION_MS) {
    return callback(null, lastReadResult);
  }

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

    if (executionQueue.length > 0) {
      const next = executionQueue.shift();
      if (next.isReadCommand && (Date.now() - lastReadTime) < CACHE_DURATION_MS) {
        next.callback(null, lastReadResult);
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

  // 1. Smart Card Read API
  if (urlPath === '/read' || urlPath === '/api/read') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    executeCardReader([], (err, resultJson) => {
      res.writeHead(200);
      res.end(resultJson);
    });
  } 
  // 2. Health & Reader Status API
  else if (urlPath === '/health' || urlPath === '/status' || urlPath === '/api/health' || urlPath === '/api/status') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    executeCardReader(['--health'], (err, resultJson) => {
      res.writeHead(200);
      res.end(resultJson);
    });
  } 
  // 3. Web App Serving
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
  // 4. Static file serving
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

// WebSocket Upgrade Handler (RFC 6455)
server.on('upgrade', (req, socket, head) => {
  const wsKey = req.headers['sec-websocket-key'];
  if (!wsKey) {
    socket.destroy();
    return;
  }

  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto.createHash('sha1').update(wsKey + GUID).digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Private-Network: true',
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));
  activeWsSockets.add(socket);

  // Send greeting
  const welcomeFrame = createWebSocketFrame({
    event: 'connected',
    message: 'Thai Smart Card Bridge (WebSocket) Ready',
    status: 'ok'
  });
  socket.write(welcomeFrame);

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length > 0) {
      const parsed = parseWebSocketFrame(buffer);
      if (!parsed) break;

      buffer = buffer.slice(parsed.totalLength);
      const text = parsed.payload;

      if (text.includes('health') || text.includes('status')) {
        executeCardReader(['--health'], (err, resJson) => {
          socket.write(createWebSocketFrame(resJson));
        });
      } else {
        executeCardReader([], (err, resJson) => {
          socket.write(createWebSocketFrame(resJson));
        });
      }
    }
  });

  socket.on('close', () => {
    activeWsSockets.delete(socket);
  });

  socket.on('error', () => {
    activeWsSockets.delete(socket);
  });
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
  console.log(`  Smart Card Bridge (HTTP + WebSocket) is listening on port ${PORT}`);
  console.log(`  Web App URL: http://127.0.0.1:${PORT}/app`);
  console.log(`  WebSocket URL: ws://127.0.0.1:${PORT}/ws`);
  console.log(`  พร้อมอ่านข้อมูลบัตรประชาชนสำหรับคลินิกเวชกรรมนครสวรรค์เฮลท์แคร์`);
  console.log(`===================================================================`);
});
