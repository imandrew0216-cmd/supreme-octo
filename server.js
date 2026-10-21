const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

function serveStaticFile(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.join(PUBLIC_DIR, urlPath.replace(/^\/+/, ''));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(safePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8'
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  serveStaticFile(req, res);
});

const wss = new WebSocketServer({ server });

const sessions = new Map();

function createShellSession(ws) {
  const shell = spawn('bash', ['-i'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  shell.stdout.on('data', (data) => {
    ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
  });

  shell.stderr.on('data', (data) => {
    ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
  });

  shell.on('close', (code) => {
    ws.send(JSON.stringify({ type: 'exit', code }));
    sessions.delete(ws);
  });

  shell.on('error', (err) => {
    ws.send(JSON.stringify({ type: 'output', data: `Error: ${err.message}\n` }));
  });

  ws.send(JSON.stringify({ type: 'welcome', data: 'Welcome to the remote shell.\n' }));
  sessions.set(ws, shell);
}

wss.on('connection', (ws) => {
  createShellSession(ws);

  ws.on('message', (message) => {
    const text = message.toString();

    if (text === 'CLEAR') {
      ws.send(JSON.stringify({ type: 'clear' }));
      return;
    }

    const shell = sessions.get(ws);
    if (!shell || shell.killed) {
      ws.send(JSON.stringify({ type: 'output', data: 'Shell not available.\n' }));
      return;
    }

    shell.stdin.write(text + '\n');
  });

  ws.on('close', () => {
    const shell = sessions.get(ws);
    if (shell && !shell.killed) {
      shell.kill('SIGTERM');
    }
    sessions.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Real terminal app running at http://localhost:${PORT}`);
});
