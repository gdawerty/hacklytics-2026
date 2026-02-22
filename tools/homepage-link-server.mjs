import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'homepage', 'dist');
const port = Number(process.env.HOMEPAGE_PORT || 4173);
const frontendBase = process.env.FRONTEND_BASE || 'http://localhost:8080';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.geojson': 'application/geo+json; charset=utf-8',
};

function sendFile(res, p) {
  fs.readFile(p, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/dashboard') {
    res.writeHead(302, { Location: `${frontendBase.replace(/\/$/, '')}/dashboard` });
    res.end();
    return;
  }

  const safePath = path.normalize(pathname).replace(/^\/+/, '');
  let filePath = path.join(distDir, safePath);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (pathname === '/' || !path.extname(pathname)) {
    filePath = path.join(distDir, 'index.html');
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`[homepage-link] Serving homepage dist at http://localhost:${port}`);
  console.log(`[homepage-link] /dashboard -> ${frontendBase.replace(/\/$/, '')}/dashboard`);
});
