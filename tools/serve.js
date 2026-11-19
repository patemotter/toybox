// Zero-dependency static file server for Toybox dev/test tools.
//
// Programmatic use:
//   const { startServer, ensureServer } = require('./serve');
//   const srv = await ensureServer();        // reuses PORT / :8120 if already running, else starts on a free port
//   // ... use srv.url or srv.port ...
//   await srv.close();
//
// CLI use:
//   node tools/serve.js [port] [dir]         // default: port 8120, repo root

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const REPO_ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function probePort(port, host = '127.0.0.1', timeoutMs = 400) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

function startServer(rootDir = REPO_ROOT, port = 0) {
  const root = path.resolve(rootDir || REPO_ROOT);
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const method = (req.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Method Not Allowed');
        return;
      }

      const rawUrl = req.url || '/';
      const qIdx = rawUrl.indexOf('?');
      const rawPath = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
      let decoded;
      try {
        decoded = decodeURIComponent(rawPath);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Bad Request');
        return;
      }

      const relPath = decoded.replace(/^\/+/, '');
      let filePath = path.resolve(root, relPath);
      if (filePath !== root && !filePath.startsWith(rootPrefix)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (err, stat) => {
        if (!err && stat.isDirectory()) {
          if (!rawPath.endsWith('/')) {
            const loc = rawPath + '/' + (qIdx >= 0 ? rawUrl.slice(qIdx) : '');
            res.writeHead(301, { Location: loc, 'Cache-Control': 'no-store' });
            res.end();
            return;
          }
          filePath = path.join(filePath, 'index.html');
          stat = null;
        }

        const serveFile = (st) => {
          const ext = path.extname(filePath).toLowerCase();
          const mime = MIME[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': mime,
            'Content-Length': st.size,
            'Cache-Control': 'no-store',
          });
          if (method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(filePath);
          stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500, { 'Cache-Control': 'no-store' });
            res.end();
          });
          stream.pipe(res);
        };

        if (stat && stat.isFile()) {
          serveFile(stat);
        } else {
          fs.stat(filePath, (err2, stat2) => {
            if (err2 || !stat2.isFile()) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
              res.end('Not Found');
              return;
            }
            serveFile(stat2);
          });
        }
      });
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      const addr = server.address();
      const actualPort = addr && typeof addr === 'object' ? addr.port : port;
      const url = 'http://localhost:' + actualPort;
      const close = () => new Promise((res) => {
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
        server.close(() => res());
      });
      resolve({ server, port: actualPort, url, close });
    });
  });
}

async function ensureServer({ rootDir, port } = {}) {
  if (process.env.PORT) {
    const p = Number(process.env.PORT);
    return { port: p, url: 'http://localhost:' + p, close: async () => {} };
  }
  const checkPort = port || 8120;
  if (await probePort(checkPort)) {
    return { port: checkPort, url: 'http://localhost:' + checkPort, close: async () => {} };
  }
  const srv = await startServer(rootDir || REPO_ROOT, 0);
  return { port: srv.port, url: srv.url, close: srv.close };
}

module.exports = { startServer, ensureServer };

if (require.main === module) {
  const cliPort = process.argv[2] ? Number(process.argv[2]) : 8120;
  const cliDir = process.argv[3] ? path.resolve(process.argv[3]) : REPO_ROOT;
  startServer(cliDir, cliPort).then((srv) => {
    console.log(`Serving ${cliDir} at ${srv.url}`);
    const shutdown = () => srv.close().then(() => process.exit(0));
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
