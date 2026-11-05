// Minimal static server for the web export (SPA fallback to index.html).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.env.PORT ?? 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.map': 'application/json',
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = normalize(join(root, url));
    if (!file.startsWith(root)) throw new Error('outside root');
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) file = s?.isDirectory() && (await stat(join(file, 'index.html')).catch(() => null)) ? join(file, 'index.html') : join(root, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`sriram teja web: http://localhost:${port}`));
