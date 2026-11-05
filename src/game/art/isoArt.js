import { rng } from '../util/rng.js';
import { bakeBackground } from './background.js';
import { flowerHead } from './flowers.js';
import { iso, GARDEN, STALL } from '../level/layout.js';

/**
 * Изометрическая графика уровня: поляна (фон под ширину экрана) с домиком, лавкой, огородом,
 * прудом и деревьями, а ещё грядка, колодец и верстак отдельными текстурами.
 * Рисуется прямо через canvas: у предметов три грани с градиентами, свет слева сверху,
 * мягкие тени на земле. Запекается один раз, в кадре только drawImage.
 */
const INK = '#3e2512';
let c = null, g = null, PAL = null;
function use(p) { g = p; c = p.ctx; }

/** Палитры мест: трава, полоски навеса, плоды на деревьях, цветы вокруг. */
const PALETTES = {
  home:  { grass: ['#8fcf5e', '#7dbf50', '#86c657', '#6fb046'], stripe: '#e8607e', fruit: 0xe8483a, flowers: ['daisy', 'tulip', 'rose'], pines: 1 },
  brook: { grass: ['#86c97a', '#72b86a', '#7cc070', '#5fa45c'], stripe: '#4f9fd8', fruit: null, flowers: ['cornflower', 'daisy', 'rose'], pines: 3 },
  hill:  { grass: ['#b4cf62', '#a0c050', '#a8c658', '#8aaa44'], stripe: '#e8952e', fruit: 0xffa030, flowers: ['sunflower', 'tulip', 'daisy'], pines: 0 },
};

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function shade(n, k) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return hex((f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255));
}
function path(pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
function fillPoly(pts, fill, lw = 2.4) {
  path(pts); c.fillStyle = fill; c.fill();
  if (lw) { c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
}
function lin(x1, y1, x2, y2, stops) {
  const gr = c.createLinearGradient(x1, y1, x2, y2);
  stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
  return gr;
}
function groundShadow(x, y, w, h, a = 0.22) {
  const gr = c.createRadialGradient(x, y, 0, x, y, w / 2);
  gr.addColorStop(0, 'rgba(40,60,20,' + a + ')'); gr.addColorStop(1, 'rgba(40,60,20,0)');
  c.save(); c.translate(x, y); c.scale(1, h / w); c.translate(-x, -y);
  c.fillStyle = gr; c.beginPath(); c.arc(x, y, w / 2, 0, Math.PI * 2); c.fill(); c.restore();
}

/** Брусок на земле: footprint ax×ay клеток, высота h; грани с градиентом, свет слева. */
function block(sx, sy, ax, ay, h, color, { lw = 2.4, top = true } = {}) {
  const P = iso(sx, sy), X = ax / 2, Y = ay / 2;
  const [N0, E0, S0, W0] = [P(-X, -Y), P(X, -Y), P(X, Y), P(-X, Y)];
  const [Nh, Eh, Sh, Wh] = [P(-X, -Y, h), P(X, -Y, h), P(X, Y, h), P(-X, Y, h)];
  fillPoly([W0, S0, Sh, Wh], lin(W0[0], 0, S0[0], 0, [shade(color, -0.05), shade(color, -0.18)]), lw);
  fillPoly([S0, E0, Eh, Sh], lin(S0[0], 0, E0[0], 0, [shade(color, -0.3), shade(color, -0.42)]), lw);
  if (top) fillPoly([Nh, Eh, Sh, Wh], lin(Wh[0], Nh[1], Eh[0], Sh[1], [shade(color, 0.22), shade(color, 0.05)]), lw);
  return { P, N: Nh, E: Eh, S: Sh, W: Wh };
}


/* ---------------- земля ---------------- */
function ground(left, right, top, bottom, R) {
  const Wd = right - left, Hd = bottom - top;
  c.fillStyle = lin(0, 0, 0, 844, PAL.grass); c.fillRect(left, top, Wd, Hd);
  const n = Wd * Hd / 4700;
  for (let i = 0; i < n * 0.08; i++) {
    const x = left + R() * Wd, y = top + R() * Hd, r = 20 + R() * 50;
    c.fillStyle = R() < 0.5 ? 'rgba(200,240,140,0.16)' : 'rgba(60,110,30,0.12)';
    c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < n; i++) {
    const x = left + R() * Wd, y = top + R() * Hd, l = 3 + R() * 4;
    c.strokeStyle = R() < 0.6 ? 'rgba(60,110,35,0.4)' : 'rgba(220,245,170,0.45)';
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 3, y - l); c.stroke();
  }
  for (let i = 0; i < n * 0.1; i++) {
    const x = left + R() * Wd, y = top + R() * Hd;
    c.fillStyle = ['#ffffff', '#ffe36a', '#ff9ab8', '#b9a8ff'][i % 4];
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.57) * 1.8, y + Math.sin(k * 1.57) * 1.1, 1.3, 0, 7); c.fill(); }
  }
}

/** Тропинка из плиток по диагонали. */
function stonePath(pts) {
  for (const [x, y, s] of pts) {
    const P = iso(x, y), r = 0.32 * s;
    groundShadow(x, y + 3, 40 * s, 14 * s, 0.18);
    const p = [P(-r, -r * 0.8), P(r, -r * 0.9), P(r * 0.9, r), P(-r * 0.8, r)].map(([a, b]) => [a, b]);
    fillPoly(p, lin(x - 20, y - 10, x + 20, y + 10, ['#efe4cc', '#cdbf9f']), 2);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x - 5 * s, y - 2 * s, 6 * s, 2.2 * s, 0, 0, 7); c.fill();
  }
}

/* ---------------- деревья, кусты, цветы ---------------- */
function blobs(list, color, lw = 2.6) {
  c.fillStyle = INK;
  for (const [x, y, r] of list) { c.beginPath(); c.arc(x, y, r + lw, 0, 7); c.fill(); }
  for (const [x, y, r] of list) {
    const gr = c.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.1);
    gr.addColorStop(0, shade(color, 0.3)); gr.addColorStop(0.6, hex(color)); gr.addColorStop(1, shade(color, -0.3));
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
}
function tree(x, y, s = 1, fruit = 0xe8483a) {
  groundShadow(x + 10 * s, y, 90 * s, 30 * s, 0.28);
  c.fillStyle = lin(x - 7 * s, 0, x + 7 * s, 0, ['#a87446', '#6e4626']);
  fillPoly([[x - 7 * s, y], [x - 5 * s, y - 50 * s], [x + 5 * s, y - 50 * s], [x + 7 * s, y]], c.fillStyle, 2.4);
  const L = [[x - 22, y - 62, 24], [x + 22, y - 64, 24], [x, y - 84, 30], [x - 6, y - 56, 22], [x + 12, y - 50, 18]]
    .map(([a, b, r]) => [x + (a - x) * s, y + (b - y) * s, r * s]);
  blobs(L, 0x5fae45);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  for (const [a, b, r] of L) { c.beginPath(); c.ellipse(a - r * 0.35, b - r * 0.4, r * 0.35, r * 0.2, -0.5, 0, 7); c.fill(); }
  if (fruit != null) {
    const f = rng(Math.round(x * 7 + y));
    for (let i = 0; i < 9; i++) {
      const [a, b, r] = L[i % L.length], ang = f() * 6.28, d = f() * r * 0.7;
      disc(a + Math.cos(ang) * d, b + Math.sin(ang) * d, 4 * s, fruit);
    }
  }
}
function pine(x, y, s = 1) {
  groundShadow(x + 8 * s, y, 70 * s, 22 * s, 0.26);
  fillPoly([[x - 5 * s, y], [x - 4 * s, y - 20 * s], [x + 4 * s, y - 20 * s], [x + 5 * s, y]], '#7a4e2c', 2.2);
  for (let i = 0; i < 4; i++) {
    const w = (34 - i * 7) * s, yy = y - 14 * s - i * 20 * s;
    fillPoly([[x - w, yy], [x, yy - 34 * s], [x + w, yy]], lin(x - w, 0, x + w, 0, ['#4f9c4a', '#2f7040']), 2.4);
    c.fillStyle = 'rgba(255,255,255,0.15)'; fillPoly([[x - w * 0.8, yy - 2], [x, yy - 32 * s], [x - w * 0.2, yy - 2]], c.fillStyle, 0);
  }
}
function disc(x, y, r, color, lw = 1.6) {
  c.beginPath(); c.arc(x, y, r, 0, 7);
  const gr = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  gr.addColorStop(0, shade(color, 0.45)); gr.addColorStop(1, hex(color));
  c.fillStyle = gr; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
}
function bush(x, y, s = 1, berry = 0xff6fa0) {
  groundShadow(x + 5, y, 60 * s, 18 * s, 0.25);
  const L = [[x - 14 * s, y - 12 * s, 14 * s], [x + 13 * s, y - 12 * s, 14 * s], [x, y - 22 * s, 16 * s]];
  blobs(L, 0x4f9e3e, 2.4);
  if (berry != null) for (let i = 0; i < 8; i++) { const [a, b, r] = L[i % 3]; disc(a + (i * 7 % 11 - 5) * s, b + (i * 5 % 9 - 4) * s, 3.2 * s, berry, 1.3); }
}
function clump(x, y, kind, n = 5, s = 0.42) {
  const f = rng(Math.round(x + y * 3));
  groundShadow(x, y, 46, 14, 0.18);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([x + (f() - 0.5) * 34, y - 4 + (f() - 0.5) * 12, 10 + f() * 12]);
  pts.sort((a, b) => a[1] - b[1]);
  for (const [a, b, h] of pts) stem(a, b, h);
  for (const [a, b, h] of pts) flowerHead(g, kind, a, b - h, s);
}
function stem(x, y, h) {
  c.lineCap = 'round';
  c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 2, y - h / 2, x, y - h); c.stroke();
  c.strokeStyle = '#5f9c3e'; c.lineWidth = 2; c.stroke();
  fillPoly([[x, y - h * 0.4], [x + 8, y - h * 0.55], [x + 1, y - h * 0.25]], '#7cc05a', 1.4);
}

function house(x, y) {
  groundShadow(x + 20, y + 10, 210, 70, 0.3);
  const ax = 2.3, ay = 1.7, h = 66;
  const b = block(x, y, ax, ay, h, 0xf6e6c4, { top: false });
  const P = b.P, X = ax / 2, Y = ay / 2;
  // доски на стенах
  c.strokeStyle = 'rgba(62,37,18,0.25)'; c.lineWidth = 1.2;
  for (let z = 12; z < h; z += 11) {
    const a = P(-X, Y, z), s = P(X, Y, z), e = P(X, -Y, z);
    c.beginPath(); c.moveTo(...a); c.lineTo(...s); c.lineTo(...e); c.stroke();
  }
  // фронтон справа
  const rh = 46;
  fillPoly([P(X, -Y, h), P(X, Y, h), P(X, 0, h + rh)], lin(0, 0, 1, 0, ['#e2cfa6', '#d4bf94']), 2.4);
  // окно на фронтоне
  const wcen = P(X, 0, h + 16);
  c.fillStyle = '#8fd0f0'; c.beginPath(); c.arc(wcen[0], wcen[1], 7, 0, 7); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  // крыша: два ската с черепицей
  const o = 0.16;
  const back = [P(-X - o, -Y - o, h - 6), P(X + o, -Y - o, h - 6), P(X + o, 0, h + rh), P(-X - o, 0, h + rh)];
  fillPoly(back, '#a8342a', 2.6);
  const front = [P(-X - o, 0, h + rh), P(X + o, 0, h + rh), P(X + o, Y + o, h - 6), P(-X - o, Y + o, h - 6)];
  fillPoly(front, lin(front[0][0], front[0][1], front[2][0], front[2][1], ['#f0705a', '#d04a38']), 2.6);
  c.strokeStyle = 'rgba(120,30,20,0.55)'; c.lineWidth = 1.6;
  for (let t = 0.2; t < 1; t += 0.2) {
    const a = P(-X - o, Y * t + o * t, h + rh - (rh + 6) * t), e = P(X + o, Y * t + o * t, h + rh - (rh + 6) * t);
    c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(...P(-X - o + 0.1, 0.05, h + rh - 3)); c.lineTo(...P(X + o - 0.1, 0.05, h + rh - 3)); c.stroke();
  // труба
  const ch = P(-X * 0.45, -0.25, h + rh - 8);
  block(ch[0], ch[1] + 22, 0.28, 0.28, 34, 0xb86a4a, { lw: 2.2 });
  c.fillStyle = 'rgba(255,255,255,0.7)';
  for (const [dx, dy, r] of [[2, -22, 6], [8, -32, 5], [4, -42, 4]]) { c.beginPath(); c.arc(ch[0] + dx, ch[1] + dy - 10, r, 0, 7); c.fill(); }
  // дверь и окна на передней стене (грань y = +Y)
  const door = [P(0.15, Y, 0), P(0.6, Y, 0), P(0.6, Y, 40), P(0.15, Y, 40)];
  fillPoly(door, lin(0, door[2][1], 0, door[0][1], ['#a8703f', '#7a4a26']), 2.4);
  const knob = P(0.52, Y, 20); disc(knob[0], knob[1], 2.2, 0xffd84a, 1);
  for (const x0 of [-0.85, -0.3]) {
    const wv = [P(x0, Y, 24), P(x0 + 0.34, Y, 24), P(x0 + 0.34, Y, 46), P(x0, Y, 46)];
    fillPoly(wv, lin(0, wv[2][1], 0, wv[0][1], ['#c4ecff', '#6fb8e0']), 2.4);
    c.strokeStyle = INK; c.lineWidth = 1.6; const m1 = P(x0 + 0.17, Y, 24), m2 = P(x0 + 0.17, Y, 46);
    c.beginPath(); c.moveTo(...m1); c.lineTo(...m2); c.stroke();
    // ящик с цветами под окном
    const bx = [P(x0 - 0.04, Y + 0.06, 18), P(x0 + 0.38, Y + 0.06, 18), P(x0 + 0.38, Y + 0.06, 25), P(x0 - 0.04, Y + 0.06, 25)];
    fillPoly(bx, '#8a5a33', 2);
    for (let k = 0; k < 3; k++) { const f = P(x0 + 0.06 + k * 0.12, Y + 0.06, 29); flowerHead(g, k % 2 ? 'tulip' : 'rose', f[0], f[1], 0.22); }
  }
  // ступенька
  const st = P(0.38, Y + 0.18, 0); block(st[0], st[1], 0.55, 0.3, 6, 0xcdbf9f, { lw: 2 });
}

function stall(x, y) {
  groundShadow(x, y + 8, 220, 60, 0.28);
  // прилавок
  const b = block(x, y, 2.6, 0.75, 34, 0xc88a52);
  const P = b.P;
  c.strokeStyle = 'rgba(62,37,18,0.3)'; c.lineWidth = 1.3;
  for (let t = -1.1; t < 1.3; t += 0.35) { const a = P(t, 0.375, 2), e = P(t, 0.375, 32); c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke(); }
  // вёдра с цветами на прилавке
  for (const [t, k] of [[-0.85, 'tulip'], [-0.2, 'daisy'], [0.45, 'sunflower'], [1.0, 'cornflower']]) {
    const p = P(t, 0, 34);
    block(p[0], p[1], 0.26, 0.26, 14, 0x6fa8d0, { lw: 1.8 });
    for (let i = 0; i < 3; i++) { const fx = p[0] - 7 + i * 7, fy = p[1] - 20 - (i % 2) * 5; stem(fx, p[1] - 10, 12); flowerHead(g, k, fx, fy, 0.32); }
  }
  // столбики и полосатый навес
  for (const [t, u] of [[-1.25, -0.3], [1.25, -0.3]]) {
    const a = P(t, u, 0), e = P(t, u, 96);
    c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke();
    c.strokeStyle = '#a8703f'; c.lineWidth = 4; c.stroke();
  }
  const n = 8, L = -1.45, Rr = 1.45;
  for (let i = 0; i < n; i++) {
    const t0 = L + (Rr - L) * i / n, t1 = L + (Rr - L) * (i + 1) / n;
    const q = [P(t0, -0.55, 104), P(t1, -0.55, 104), P(t1, 0.35, 86), P(t0, 0.35, 86)];
    fillPoly(q, i % 2 ? '#fff6ea' : PAL.stripe, 2);
  }
  // фестоны
  for (let i = 0; i < n; i++) {
    const t0 = L + (Rr - L) * i / n, t1 = L + (Rr - L) * (i + 1) / n, a = P(t0, 0.35, 86), e = P(t1, 0.35, 86);
    c.beginPath(); c.moveTo(...a); c.quadraticCurveTo((a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + 9, e[0], e[1]); c.closePath();
    c.fillStyle = i % 2 ? '#fff6ea' : PAL.stripe; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,0.25)';
  fillPoly([P(L, -0.55, 104), P(Rr, -0.55, 104), P(Rr, -0.3, 99), P(L, -0.3, 99)], c.fillStyle, 0);
  // вывеска
  const sg = P(0, -0.55, 118);
  fillPoly([[sg[0] - 36, sg[1] - 12], [sg[0] + 36, sg[1] + 6], [sg[0] + 36, sg[1] + 24], [sg[0] - 36, sg[1] + 6]], lin(0, sg[1] - 12, 0, sg[1] + 24, ['#ffe08a', '#e0b04a']), 2.4);
  c.save(); c.translate(sg[0], sg[1] + 6); c.transform(1, 0.25, 0, 1, 0, 0);
  c.fillStyle = INK; c.font = '700 12px "Arial Black", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('ЦВЕТЫ', 0, 1); c.restore();
}

function pond(x, y) {
  c.save(); c.translate(x, y); c.scale(1, 0.5);
  c.beginPath(); c.ellipse(0, 0, 70, 60, 0, 0, 7); c.fillStyle = '#b8b0a4'; c.fill(); c.lineWidth = 2.4 / 0.75; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.ellipse(2, 2, 60, 50, 0, 0, 7);
  const gr = c.createRadialGradient(-20, -20, 5, 0, 0, 60); gr.addColorStop(0, '#9ee0ff'); gr.addColorStop(1, '#3a8ac0');
  c.fillStyle = gr; c.fill(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
  for (const [dx, dy, w] of [[-20, -8, 14], [10, 6, 18], [24, -10, 10]]) { c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx + w, y + dy); c.stroke(); }
  for (const [dx, dy] of [[-30, 6], [20, -6]]) {
    c.beginPath(); c.ellipse(x + dx, y + dy, 11, 5, 0, 0.3, Math.PI * 2 - 0.2); c.lineTo(x + dx, y + dy); c.closePath();
    c.fillStyle = '#6fb04a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  }
  flowerHead(g, 'rose', x - 30, y + 2, 0.26);
  // камушки по краю
  for (const [dx, dy, r] of [[-66, 4, 8], [-50, 22, 7], [60, 12, 9], [40, 26, 6], [-10, 30, 7]]) {
    c.beginPath(); c.ellipse(x + dx, y + dy, r, r * 0.65, 0, 0, 7); c.fillStyle = lin(0, y + dy - r, 0, y + dy + r, ['#e8e2d6', '#a49c90'])
    c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
  }
  // камыши
  for (const [dx, dy] of [[52, -14], [60, -10], [-60, -12]]) {
    c.strokeStyle = INK; c.lineWidth = 3.6; c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx + 2, y + dy - 34); c.stroke();
    c.strokeStyle = '#5f9c3e'; c.lineWidth = 1.8; c.stroke();
    fillPoly([[x + dx - 1, y + dy - 26], [x + dx + 5, y + dy - 26], [x + dx + 5, y + dy - 40], [x + dx - 1, y + dy - 40]], '#8a5a33', 1.6);
  }
}

function fenceEdge(a, b, n) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    if (i < n) {
      // перекладины
      const x2 = a[0] + (b[0] - a[0]) * (i + 1) / n, y2 = a[1] + (b[1] - a[1]) * (i + 1) / n;
      for (const z of [10, 20]) {
        c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y - z); c.lineTo(x2, y2 - z); c.stroke();
        c.strokeStyle = '#f3e2c0'; c.lineWidth = 2.6; c.stroke();
      }
    }
    fillPoly([[x - 3.5, y + 1], [x - 3.5, y - 24], [x, y - 29], [x + 3.5, y - 24], [x + 3.5, y + 1]], lin(x - 4, 0, x + 4, 0, ['#fff8e8', '#e6d2aa']), 2);
  }
}
function stroke2(x1, y1, x2, y2) {
  c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = '#5f9c3e'; c.lineWidth = 2; c.stroke();
}
function sparkle(x, y, r) {
  c.fillStyle = '#fff8c0';
  c.beginPath(); c.moveTo(x, y - r * 2); c.quadraticCurveTo(x, y, x + r * 2, y); c.quadraticCurveTo(x, y, x, y + r * 2); c.quadraticCurveTo(x, y, x - r * 2, y); c.quadraticCurveTo(x, y, x, y - r * 2); c.fill();
}

/* ---------------- огород ---------------- */
function gardenCorners() {
  const P = iso(GARDEN.x, GARDEN.y), s = GARDEN.size / 2;
  return { N: P(-s, -s), E: P(s, -s), S: P(s, s), W: P(-s, s) };
}
function gardenGround() {
  const { N, E, S, W } = gardenCorners();
  fillPoly([N, E, S, W], lin(W[0], N[1], E[0], S[1], ['#f2dfae', '#dcc38c']), 0);
  // песок с камешками
  const r = rng(31);
  c.save(); path([N, E, S, W]); c.clip();
  for (let i = 0; i < 160; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(160,120,70,0.25)' : 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(W[0] + r() * (E[0] - W[0]), N[1] + r() * (S[1] - N[1]), 2 + r() * 2, 1 + r(), 0, 0, 7); c.fill();
  }
  c.restore();
  // бортик из камней по краю
  c.lineWidth = 2.2; c.strokeStyle = 'rgba(62,37,18,0.55)'; path([N, E, S, W]); c.stroke();
}
/** Низкая кромка из камушков и цветов спереди: Тиша её перешагивает. */
function frontBorder(a, b, n, gapFrom = 2, gapTo = -1) {
  for (let i = 0; i <= n; i++) {
    if (i >= gapFrom && i <= gapTo) continue;
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    c.beginPath(); c.ellipse(x, y, 7, 4.5, 0, 0, 7); c.fillStyle = lin(0, y - 5, 0, y + 5, ['#f0ebe0', '#b0a898']); c.fill();
    c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
    if (i % 3 === 1) { stem(x + 8, y + 2, 12); flowerHead(g, PAL.flowers[i % PAL.flowers.length], x + 8, y - 10, 0.3); }
  }
}

/* ---------------- фон уровня ---------------- */
function drawCore(place) {
  return (p, label, { left, right }) => {
    use(p); PAL = PALETTES[place];
    const R = rng(7);
    ground(left, right, -160, 1040, R);
    // по краям за серединой — лес
    for (let x = left + 20; x < right; x += 46) {
      if (x > -20 && x < 410) continue;
      const y = 150 + rng(Math.round(x))() * 600;
      (PAL.pines && (Math.round(x / 46) % 2) ? pine : treeP)(x, y, 0.9);
    }
    stonePath([[214, 360, 0.9], [196, 376, 1], [150, 640, 1], [124, 656, 0.9], [258, 652, 0.9], [284, 668, 1]]);

    // дальний план
    if (PAL.pines) pine(22, 150, 0.95); else treeP(16, 140, 0.9);
    treeP(372, 150, 0.85);
    house(66, 226);
    bush(166, 186, 0.8);
    stall(STALL.x, STALL.y);

    // огород: песок, забор сзади, кромка спереди
    gardenGround();
    const gc = gardenCorners();
    fenceEdge(gc.W, gc.N, 6); fenceEdge(gc.N, gc.E, 6);
    frontBorder(gc.W, gc.S, 9, 7, 9);
    frontBorder(gc.S, gc.E, 9, 0, 2);

    // цветы и кусты вокруг
    clump(18, 420, PAL.flowers[1], 4); clump(374, 452, PAL.flowers[0], 5);
    bush(372, 548, 0.75, 0xffd84a);
    clump(20, 560, PAL.flowers[2], 4);
    pond(196, 770);
    clump(24, 790, PAL.flowers[0], 5); clump(370, 800, PAL.flowers[2], 4);
    treeP(-10, 830, 0.8);
    if (place === 'hill') { haystack(366, 610); haystack(30, 600, 0.8); }
    if (place === 'brook') { pine(370, 640, 0.7); }

    // солнечный свет слева сверху
    const gr = c.createRadialGradient(80, 60, 20, 80, 60, 460);
    gr.addColorStop(0, 'rgba(255,240,190,0.26)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = gr; c.fillRect(left, -160, right - left, 1200);
  };
}
function drawSides(place) {
  return (p, sides, r) => {
    use(p); PAL = PALETTES[place];
    for (const [a, b] of sides) {
      for (let x = a + 30; x < b - 10; x += 70) {
        const y = 140 + r() * 760;
        const k = r();
        if (k < 0.35) treeP(x + r() * 30, y, 0.8 + r() * 0.3);
        else if (k < 0.55 && PAL.pines) pine(x + r() * 30, y, 0.8);
        else if (k < 0.8) bush(x + r() * 30, y, 0.8);
        else clump(x + r() * 30, y, PAL.flowers[Math.floor(r() * 3)], 5);
      }
    }
  };
}
function treeP(x, y, s) { tree(x, y, s, PAL.fruit); }
function haystack(x, y, s = 1) {
  groundShadow(x + 4, y, 70 * s, 22 * s, 0.25);
  c.beginPath(); c.moveTo(x - 30 * s, y); c.quadraticCurveTo(x - 30 * s, y - 46 * s, x, y - 50 * s); c.quadraticCurveTo(x + 30 * s, y - 46 * s, x + 30 * s, y); c.closePath();
  c.fillStyle = lin(x - 30, 0, x + 30, 0, ['#ffe08a', '#d8a840']); c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.strokeStyle = 'rgba(140,90,30,0.5)'; c.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 9 * s, y - 4); c.lineTo(x + i * 7 * s, y - 40 * s); c.stroke(); }
}

/** Фон поляны для места (home, brook, hill) под ширину экрана. */
export function isoGladeBackground(textures, renderer, place) {
  return bakeBackground(textures, renderer, 'isoglade_' + place, drawCore(place), drawSides(place));
}

/* ---------------- предметы отдельными текстурами ---------------- */
function bedArt(st) {
  const x = 0, y = 0;
  groundShadow(x, y + 10, 104, 34, 0.25);
  if (st === 'locked') {
    const P = iso(0, 0), r = GARDEN.bed / 2;
    const d = [P(-r, -r), P(r, -r), P(r, r), P(-r, r)];
    fillPoly(d, 'rgba(120,170,70,0.45)', 0);
    c.setLineDash([6, 6]); c.lineWidth = 2.2; c.strokeStyle = 'rgba(255,255,255,0.6)'; path(d); c.stroke(); c.setLineDash([]);
    for (const [a, b] of [[-22, -4], [16, 8], [8, -12]]) { stroke2(a, b, a - 2, b - 9); stroke2(a + 4, b, a + 5, b - 11); }
    return;
  }
  block(x, y, GARDEN.bed, GARDEN.bed, 10, 0xb07a46, { lw: 2.4 });
  const P = iso(x, y), r = GARDEN.bed / 2 - 0.1;
  const sp = [P(-r, -r, 10), P(r, -r, 10), P(r, r, 10), P(-r, r, 10)];
  fillPoly(sp, lin(sp[3][0], sp[0][1], sp[1][0], sp[2][1], ['#8a5a33', '#6b4426']), 1.6);
  c.strokeStyle = 'rgba(40,20,8,0.4)'; c.lineWidth = 1.6;
  for (let t = -0.3; t <= 0.31; t += 0.2) { const a = P(t, -r + 0.05, 10), e = P(t, r - 0.05, 10); c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke(); }
  const q = rng(5);
  for (let i = 0; i < 18; i++) { c.fillStyle = q() < 0.5 ? 'rgba(150,100,60,0.6)' : 'rgba(40,20,8,0.5)'; c.beginPath(); c.ellipse((q() - 0.5) * 60, -10 + (q() - 0.5) * 30, 1.6, 1, 0, 0, 7); c.fill(); }
}

/** Колодец: (0, 0) — на 36 ниже вала ворота, как ждёт сцена (верёвка, ведро и ручка отдельно). */
function wellArt() {
  const x = 0, base = 26, h = 30, rim = base - h, axle = -36;
  groundShadow(x + 8, base + 6, 110, 36, 0.3);
  const rx = 30, ry = 15;
  c.fillStyle = lin(x - rx, 0, x + rx, 0, ['#d8d2c6', '#a49c90', '#8a8276']);
  c.beginPath(); c.ellipse(x, base, rx, ry, 0, 0, Math.PI); c.lineTo(x - rx, rim); c.ellipse(x, rim, rx, ry, 0, Math.PI, 0, true); c.closePath();
  c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.strokeStyle = 'rgba(62,37,18,0.35)'; c.lineWidth = 1.3;
  for (let row = 0; row < 3; row++) {
    const yy = base - 6 - row * 9;
    c.beginPath(); c.ellipse(x, yy, rx, ry, 0, 0.1, Math.PI - 0.1); c.stroke();
    for (let k = 0; k < 5; k++) { const a = 0.35 + k * 0.6 + (row % 2) * 0.3, px = x + Math.cos(a) * rx; c.beginPath(); c.moveTo(px, yy + Math.sin(a) * ry - 9); c.lineTo(px, yy + Math.sin(a) * ry); c.stroke(); }
  }
  c.beginPath(); c.ellipse(x, rim, rx, ry, 0, 0, 7); c.fillStyle = '#c8c0b2'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.ellipse(x, rim + 1, rx - 7, ry - 4, 0, 0, 7); c.fillStyle = lin(0, rim - 10, 0, rim + 10, ['#1d4f70', '#3a8ab8']); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x - 6, rim - 2, 8, 2, 0, 0, 7); c.fill();
  for (const dx of [-26, 26]) { c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x + dx, rim + 4); c.lineTo(x + dx, axle - 14); c.stroke(); c.strokeStyle = '#a8703f'; c.lineWidth = 4; c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 30, axle); c.lineTo(x + 34, axle); c.stroke();
  c.strokeStyle = '#8a5a33'; c.lineWidth = 3; c.stroke();
  const ey = axle - 10, top = axle - 46;
  fillPoly([[x - 48, ey], [x, top], [x, top + 9], [x - 44, ey + 7]], '#7a4a26', 2.4);
  fillPoly([[x + 48, ey], [x, top], [x, top + 9], [x + 44, ey + 7]], '#6a3e20', 2.4);
  fillPoly([[x - 48, ey], [x, top], [x + 4, top - 4], [x - 40, ey - 6]], lin(x - 48, ey, x, top, ['#d87a4a', '#b85a32']), 2.4);
  fillPoly([[x + 48, ey], [x, top], [x + 4, top - 4], [x + 52, ey - 6]], lin(x, top, x + 52, ey, ['#c06038', '#8f4426']), 2.4);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 40, ey - 4); c.lineTo(x, top + 1); c.stroke();
}

/** Верстак для букетов: (0, 0) — середина столешницы, земля на 26 ниже. */
function tableArt() {
  const x = 0, y = 26;
  groundShadow(x + 4, y + 6, 120, 34, 0.28);
  const P = iso(x, y), Z = 24;
  for (const [u, v] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) {
    const a = P(u, v, 0), e = P(u, v, Z);
    c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 6.5; c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke();
    c.strokeStyle = '#8a5a33'; c.lineWidth = 3.8; c.stroke();
  }
  block(x, y - Z, 1.36, 0.8, 8, 0xc88a52);
  const p = iso(x, y - Z);
  const r1 = p(-0.38, 0, 8);
  disc(r1[0], r1[1] - 6, 8, 0xe05a8a, 2); disc(r1[0], r1[1] - 6, 3, 0xffffff, 1.4);
  const r2 = p(0.3, 0.05, 8);
  fillPoly([[r2[0] - 12, r2[1] - 3], [r2[0] + 10, r2[1] - 6], [r2[0] + 12, r2[1]], [r2[0] - 8, r2[1] + 3]], '#fff1d0', 1.8);
}

/** Заменить плоские текстуры уровня изометрическими. Вызывать после makeGardenTextures. */
export function makeIsoTextures(textures) {
  const put = (key, w, h, ox, oy, draw) => { textures.delete(key); textures.bake(key, w, h, ox, oy, (p) => { use(p); draw(); }); };
  put('bed', 112, 86, 56, 44, () => bedArt('open'));
  put('bed_locked', 112, 86, 56, 44, () => bedArt('locked'));
  put('well', 116, 140, 58, 92, wellArt);
  put('table', 124, 96, 62, 54, tableArt);
  put('counter', 2, 2, 1, 1, () => {});
}

/* ---------------- общие кусочки ---------------- */
