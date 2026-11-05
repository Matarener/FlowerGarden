// Локальный сервер для разработки, без зависимостей.
// ES-модули не открываются напрямую из файла (file://), поэтому игру запускаем через сервер:
//   node tools/serve.mjs        → http://localhost:5173
//   node tools/serve.mjs 8080   → другой порт
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';

const root = resolve(process.argv[3] || '.');
const port = Number(process.argv[2]) || 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Не найдено');
  }
}).listen(port, '0.0.0.0', () => {
  console.log('Цветочная поляна: http://localhost:' + port);
  // адрес в локальной сети — чтобы открыть игру с телефона в том же Wi-Fi
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log('С телефона: http://' + a.address + ':' + port);
  }
});
