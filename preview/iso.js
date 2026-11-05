import { TextureCache } from '../src/engine/TextureCache.js';
import { Painter } from '../src/engine/Painter.js';
import { makeCritterTextures } from '../src/game/art/critters.js';
import { flowerHead } from '../src/game/art/flowers.js';
import { rng } from '../src/game/util/rng.js';

/**
 * Пробный кадр уровня в изометрии: всё рисуется кодом, но объёмнее — три грани у предметов,
 * свет слева сверху, градиенты, тени на земле, мелкий декор. Только для оценки стиля, в игру не входит.
 */
const W = 390, H = 844, S = 2;
const INK = '#3e2512';
const cv = document.getElementById('c');
cv.width = W * S; cv.height = H * S; cv.style.width = W + 'px'; cv.style.height = H + 'px';
const c = cv.getContext('2d');
c.scale(S, S);
const g = new Painter(c);
const R = rng(7);

const TW = 74, TH = 40;
/** Точка в изометрии: (x, y) — клетки на земле от центра предмета, z — высота в пикселях. */
const iso = (sx, sy) => (x, y, z = 0) => [sx + (x - y) * TW / 2, sy + (x + y) * TH / 2 - z];

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
function ground() {
  c.fillStyle = lin(0, 0, 0, H, ['#8fcf5e', '#7dbf50', '#86c657', '#6fb046']); c.fillRect(0, 0, W, H);
  // пятна светлой и тёмной травы
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * H, r = 20 + R() * 50;
    c.fillStyle = R() < 0.5 ? 'rgba(180,230,120,0.18)' : 'rgba(60,120,40,0.13)';
    c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  }
  // штрихи травы
  for (let i = 0; i < 900; i++) {
    const x = R() * W, y = R() * H, l = 3 + R() * 4;
    c.strokeStyle = R() < 0.6 ? 'rgba(70,130,45,0.45)' : 'rgba(200,240,150,0.5)';
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 3, y - l); c.stroke();
  }
  // клевер и крошечные цветочки
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H;
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

/* ---------------- постройки ---------------- */
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
    fillPoly(q, i % 2 ? '#fff6ea' : '#e8607e', 2);
  }
  // фестоны
  for (let i = 0; i < n; i++) {
    const t0 = L + (Rr - L) * i / n, t1 = L + (Rr - L) * (i + 1) / n, a = P(t0, 0.35, 86), e = P(t1, 0.35, 86);
    c.beginPath(); c.moveTo(...a); c.quadraticCurveTo((a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + 9, e[0], e[1]); c.closePath();
    c.fillStyle = i % 2 ? '#fff6ea' : '#e8607e'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
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

function well(x, y) {
  groundShadow(x + 8, y + 6, 110, 36, 0.3);
  // каменный сруб: цилиндр
  const rx = 30, ry = 15, h = 30;
  c.fillStyle = lin(x - rx, 0, x + rx, 0, ['#d8d2c6', '#a49c90', '#8a8276']);
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.lineTo(x - rx, y - h); c.ellipse(x, y - h, rx, ry, 0, Math.PI, 0, true); c.closePath();
  c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  // камни
  c.strokeStyle = 'rgba(62,37,18,0.35)'; c.lineWidth = 1.3;
  for (let row = 0; row < 3; row++) {
    const yy = y - 6 - row * 9;
    c.beginPath(); c.ellipse(x, yy, rx, ry, 0, 0.1, Math.PI - 0.1); c.stroke();
    for (let k = 0; k < 5; k++) { const a = 0.35 + k * 0.6 + (row % 2) * 0.3, px = x + Math.cos(a) * rx; c.beginPath(); c.moveTo(px, yy + Math.sin(a) * ry - 9); c.lineTo(px, yy + Math.sin(a) * ry); c.stroke(); }
  }
  c.beginPath(); c.ellipse(x, y - h, rx, ry, 0, 0, 7); c.fillStyle = '#c8c0b2'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.ellipse(x, y - h + 1, rx - 7, ry - 4, 0, 0, 7); c.fillStyle = lin(0, y - h - 10, 0, y - h + 10, ['#1d4f70', '#3a8ab8']); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x - 6, y - h - 2, 8, 2, 0, 0, 7); c.fill();
  // стойки и крыша
  for (const dx of [-26, 26]) { c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x + dx, y - h + 4); c.lineTo(x + dx, y - h - 56); c.stroke(); c.strokeStyle = '#a8703f'; c.lineWidth = 4; c.stroke(); }
  c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 30, y - h - 40); c.lineTo(x + 34, y - h - 40); c.stroke();
  c.strokeStyle = '#8a5a33'; c.lineWidth = 3; c.stroke();
  // ручка ворота
  c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 34, y - h - 40); c.lineTo(x + 40, y - h - 30); c.stroke();
  // верёвка и ведро
  c.strokeStyle = '#d8b878'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y - h - 40); c.lineTo(x + 4, y - h - 18); c.stroke();
  fillPoly([[x - 4, y - h - 18], [x + 12, y - h - 18], [x + 10, y - h - 6], [x - 2, y - h - 6]], lin(x - 4, 0, x + 12, 0, ['#c8a070', '#8a5a33']), 2);
  // двускатная крыша: два ската с толщиной
  const ey = y - h - 50, top = y - h - 86;
  fillPoly([[x - 48, ey], [x, top], [x, top + 9], [x - 44, ey + 7]], '#7a4a26', 2.4);
  fillPoly([[x + 48, ey], [x, top], [x, top + 9], [x + 44, ey + 7]], '#6a3e20', 2.4);
  fillPoly([[x - 48, ey], [x, top], [x + 4, top - 4], [x - 40, ey - 6]], lin(x - 48, ey, x, top, ['#d87a4a', '#b85a32']), 2.4);
  fillPoly([[x + 48, ey], [x, top], [x + 4, top - 4], [x + 52, ey - 6]], lin(x, top, x + 52, ey, ['#c06038', '#8f4426']), 2.4);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 40, ey - 4); c.lineTo(x, top + 1); c.stroke();
}

function workbench(x, y) {
  groundShadow(x + 4, y + 6, 120, 34, 0.28);
  const P = iso(x, y), Z = 24;
  for (const [u, v] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) {
    const a = P(u, v, 0), e = P(u, v, Z);
    c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 6.5; c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke();
    c.strokeStyle = '#8a5a33'; c.lineWidth = 3.8; c.stroke();
  }
  block(x, y - Z, 1.36, 0.8, 8, 0xc88a52);
  // катушка ленты, ножницы и букет
  const p = iso(x, y - Z);
  const r1 = p(-0.38, 0, 8);
  disc(r1[0], r1[1] - 6, 8, 0xe05a8a, 2); disc(r1[0], r1[1] - 6, 3, 0xffffff, 1.4);
  const r2 = p(0.22, 0.05, 8);
  for (let i = 0; i < 3; i++) stem(r2[0] - 6 + i * 6, r2[1], 14);
  for (let i = 0; i < 3; i++) flowerHead(g, ['rose', 'daisy', 'tulip'][i], r2[0] - 6 + i * 6, r2[1] - 15 - (i % 2) * 4, 0.33);
  fillPoly([[r2[0] - 8, r2[1] - 6], [r2[0] + 8, r2[1] - 6], [r2[0] + 3, r2[1] + 2], [r2[0] - 3, r2[1] + 2]], '#ffd0e0', 1.8);
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

/* ---------------- огород и забор ---------------- */
const GARDEN = { x: 195, y: 492, size: 4.9 };
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
function gardenCorners() {
  const P = iso(GARDEN.x, GARDEN.y), s = GARDEN.size / 2;
  return { N: P(-s, -s), E: P(s, -s), S: P(s, s), W: P(-s, s) };
}
function gardenSoil() {
  const { N, E, S, W } = gardenCorners();
  fillPoly([N, E, S, W], 'rgba(120,170,70,0.55)', 0);
  // дорожки между грядками светлым песком
  c.save(); path([N, E, S, W]); c.clip();
  c.fillStyle = 'rgba(240,220,170,0.55)'; c.fillRect(0, 0, W, H); c.restore();
}

function bed(x, y, st) {
  groundShadow(x, y + 10, 104, 34, 0.25);
  const b = block(x, y, 1.3, 1.3, 10, 0xb07a46, { lw: 2.4 });
  const P = iso(x, y);
  // земля внутри рамки
  const r = 0.54, soil = st === 'dry' ? ['#c49a6a', '#a87a4e'] : ['#8a5a33', '#6b4426'];
  const sp = [P(-r, -r, 10), P(r, -r, 10), P(r, r, 10), P(-r, r, 10)];
  fillPoly(sp, lin(sp[3][0], sp[0][1], sp[1][0], sp[2][1], soil), 1.6);
  c.strokeStyle = st === 'dry' ? 'rgba(90,60,30,0.35)' : 'rgba(40,20,8,0.4)'; c.lineWidth = 1.6;
  for (let t = -0.3; t <= 0.31; t += 0.2) { const a = P(t, -r + 0.05, 10), e = P(t, r - 0.05, 10); c.beginPath(); c.moveTo(...a); c.lineTo(...e); c.stroke(); }
  if (st === 'dry') { c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 10, y - 12); c.lineTo(x - 2, y - 8); c.lineTo(x + 4, y - 14); c.stroke(); }
  const spots = [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]].map(([u, v]) => P(u, v, 10)).sort((a, b) => a[1] - b[1]);
  if (st === 'bloom-rose' || st === 'bloom-daisy' || st === 'bloom-tulip' || st === 'bloom-sunflower') {
    const k = st.slice(6);
    for (const [px, py] of spots) stem(px, py, k === 'sunflower' ? 30 : 20);
    for (const [px, py] of spots) flowerHead(g, k, px, py - (k === 'sunflower' ? 30 : 20), k === 'sunflower' ? 0.55 : 0.44);
    // искорки — можно собирать
    for (const [dx, dy] of [[-30, -44], [28, -36]]) sparkle(x + dx, y + dy, 5);
  } else if (st === 'grow' || st === 'dry') {
    for (const [px, py] of spots) {
      stroke2(px, py, px, py - 12);
      fillPoly([[px, py - 9], [px + 9, py - 15], [px + 3, py - 6]], '#7cc05a', 1.4);
      fillPoly([[px, py - 8], [px - 8, py - 13], [px - 2, py - 5]], '#6fb04a', 1.4);
    }
    if (st === 'dry') thirst(x + 2, y - 50);
  } else if (st === 'seed') {
    for (const [px, py] of spots) { c.fillStyle = '#3e2512'; c.beginPath(); c.ellipse(px, py, 3, 1.6, 0, 0, 7); c.fill(); }
  } else if (st === 'pest') {
    for (const [px, py] of spots) { stroke2(px, py, px, py - 16); fillPoly([[px, py - 12], [px + 9, py - 18], [px + 3, py - 9]], '#7cc05a', 1.4); }
    beetle(x + 6, y - 24);
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
function dropIcon(x, y) {
  c.beginPath(); c.moveTo(x, y - 10); c.quadraticCurveTo(x + 9, y + 1, x + 7, y + 4); c.arc(x, y + 3, 7, 0.2, Math.PI - 0.2); c.quadraticCurveTo(x - 9, y + 1, x, y - 10);
  c.fillStyle = lin(0, y - 10, 0, y + 10, ['#9ee0ff', '#3a8ad8']); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
}
function basketIcon(x, y) {
  c.lineWidth = 2.4; c.strokeStyle = INK; c.beginPath(); c.arc(x, y - 2, 9, Math.PI, 0); c.stroke();
  fillPoly([[x - 12, y - 2], [x + 12, y - 2], [x + 9, y + 10], [x - 9, y + 10]], '#d09a52', 2);
}
function thirst(x, y, skip) {
  if (skip) return;
  c.beginPath(); c.arc(x, y, 15, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x - 6, y + 12); c.lineTo(x, y + 22); c.lineTo(x + 5, y + 13); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.beginPath(); c.arc(x, y, 13, 0, 7); c.fillStyle = '#fff'; c.fill();
  c.beginPath(); c.moveTo(x, y - 9); c.quadraticCurveTo(x + 8, y + 1, x + 6, y + 4); c.arc(x, y + 3, 6, 0.2, Math.PI - 0.2); c.quadraticCurveTo(x - 8, y + 1, x, y - 9);
  c.fillStyle = lin(0, y - 9, 0, y + 9, ['#9ee0ff', '#3a8ad8']); c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
}
function beetle(x, y) {
  c.save(); c.translate(x, y); c.rotate(0.3);
  c.beginPath(); c.ellipse(0, 0, 9, 7, 0, 0, 7); c.fillStyle = lin(-9, 0, 9, 0, ['#b06ad0', '#6a2f88']); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(0, -7); c.lineTo(0, 7); c.stroke();
  disc(9, 0, 4, 0x3e2512, 0);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-3, -3, 3, 1.6, 0, 0, 7); c.fill();
  c.restore();
}

/* ---------------- зверята ---------------- */
const tex = new TextureCache();
makeCritterTextures(tex);
function drawTex(key, x, y, rot = 0) {
  const t = tex.get(key);
  c.save(); c.translate(x, y); c.rotate(rot * Math.PI / 180); c.drawImage(t.canvas, -t.ox, -t.oy, t.w, t.h); c.restore();
}
function critter(skin, x, y, { eyes = 'open', flip = false, s = 0.8 } = {}) {
  groundShadow(x, y, 44 * s, 14 * s, 0.3);
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
  drawTex(skin + '_leg', -8, -17); drawTex(skin + '_leg', 8, -17);
  drawTex(skin + '_arm', -16, -44, 18); drawTex(skin + '_body', 0, -14);
  drawTex(skin + '_head', 0, -48); drawTex('eyes_' + eyes, 0, -52);
  drawTex(skin + '_arm', 16, -44, -18);
  c.restore();
}
function orderBubble(x, y, kinds, patience) {
  const w = 22 + kinds.length * 24, h = 34;
  c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, 12); c.fillStyle = '#fffaf0'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x - 6, y - 1); c.lineTo(x, y + 8); c.lineTo(x + 6, y - 1); c.fillStyle = '#fffaf0'; c.fill(); c.stroke();
  c.fillStyle = '#fffaf0'; c.fillRect(x - 5, y - 3, 10, 4);
  kinds.forEach((k, i) => flowerHead(g, k, x - (kinds.length - 1) * 12 + i * 24, y - h / 2, 0.55));
  // полоска терпения
  c.beginPath(); c.roundRect(x - w / 2 + 6, y - h - 9, w - 12, 6, 3); c.fillStyle = '#e6d6b4'; c.fill(); c.lineWidth = 1.6; c.stroke();
  c.beginPath(); c.roundRect(x - w / 2 + 7, y - h - 8, (w - 14) * patience, 4, 2); c.fillStyle = patience > 0.4 ? '#6fc04a' : '#f0a030'; c.fill();
}

/* ---------------- интерфейс (как сейчас в игре, для масштаба) ---------------- */
function pill(x, y, w, h) {
  c.beginPath(); c.roundRect(x, y + 3, w, h, h / 2); c.fillStyle = 'rgba(62,37,18,0.35)'; c.fill();
  c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fillStyle = '#fff4dc'; c.fill(); c.lineWidth = 2.3; c.strokeStyle = INK; c.stroke();
}
function hud() {
  c.font = '700 13px "Arial Black", system-ui, sans-serif'; c.textBaseline = 'middle';
  pill(12, 10, 240, 40); disc(32, 30, 12, 0xffc93a, 2);
  c.fillStyle = INK; c.fillText('34 / 120', 52, 24);
  c.beginPath(); c.roundRect(52, 35, 180, 8, 4); c.fillStyle = '#e6d6b4'; c.fill(); c.beginPath(); c.roundRect(52, 35, 52, 8, 4); c.fillStyle = '#6fc04a'; c.fill();
  pill(260, 10, 76, 40); disc(276, 30, 9, 0xfff4dc, 2); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(276, 30); c.lineTo(276, 24); c.moveTo(276, 30); c.lineTo(280, 32); c.stroke(); c.fillStyle = INK; c.fillText('1:42', 292, 30);
  pill(344, 10, 36, 40); c.fillStyle = INK; c.fillRect(356, 22, 4, 16); c.fillRect(364, 22, 4, 16);
  pill(12, 58, 120, 38); thirst(0, 0, true); dropIcon(32, 77); c.fillStyle = INK; c.fillText('2/3', 48, 77);
  pill(232, 58, 146, 38); basketIcon(252, 78);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(282 + i * 32, 77, 12, 0, 7); c.fillStyle = '#efe4cc'; c.fill(); c.lineWidth = 1.6; c.stroke(); }
  flowerHead(g, 'rose', 282, 77, 0.6);
  // семена снизу
  c.beginPath(); c.roundRect(10, H - 76, W - 20, 66, 22); c.fillStyle = 'rgba(255,244,220,0.92)'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  ['daisy', 'tulip', 'rose', 'sunflower'].forEach((k, i) => {
    const x = 52 + i * 96 - (i ? 0 : 0);
    c.beginPath(); c.roundRect(x - 34, H - 68, 68, 50, 14); c.fillStyle = i === 0 ? '#ffe08a' : '#fffaf0'; c.fill(); c.lineWidth = 2; c.stroke();
    flowerHead(g, k, x - 10, H - 43, 0.6);
    c.fillStyle = INK; c.font = '700 11px "Arial Black", system-ui'; c.fillText('5', x + 10, H - 43);
  });
}

/* ---------------- сборка кадра ---------------- */
ground();
stonePath([[250, 352, 0.9], [226, 366, 1], [150, 650, 1], [124, 666, 0.9], [262, 660, 0.9], [288, 676, 1]]);

// задний план: деревья, домик, лавка
pine(28, 150, 0.95); tree(370, 168, 0.85);
house(92, 236);
bush(178, 196, 0.8);
stall(290, 262);
clump(196, 236, 'daisy', 5);

// покупатели у прилавка
const customers = [['bunny', 216, 320, ['rose', 'daisy'], 0.8], ['fox', 290, 342, ['tulip'], 0.5], ['bear', 362, 324, ['sunflower', 'rose'], 0.25]];

// огород с забором
gardenSoil();
const gc = gardenCorners();
fenceEdge(gc.W, gc.N, 6); fenceEdge(gc.N, gc.E, 6);
const plan = [['bloom-rose', 'grow', 'seed'], ['dry', 'bloom-daisy', 'grow'], ['pest', 'bloom-tulip', 'dry']];
const PG = iso(GARDEN.x, GARDEN.y);
const beds = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const [x, y] = PG((i - 1) * 1.5, (j - 1) * 1.5); beds.push([x, y, plan[j][i]]); }
beds.sort((a, b) => a[1] - b[1]).forEach(([x, y, st]) => bed(x, y, st));
fenceEdge(gc.W, [gc.W[0] + (gc.S[0] - gc.W[0]) * 0.38, gc.W[1] + (gc.S[1] - gc.W[1]) * 0.38], 2);
fenceEdge([gc.W[0] + (gc.S[0] - gc.W[0]) * 0.62, gc.W[1] + (gc.S[1] - gc.W[1]) * 0.62], gc.S, 2);
fenceEdge(gc.S, gc.E, 6);

for (const [skin, x, y, order, p] of customers) critter(skin, x, y, { s: 0.72, eyes: p < 0.3 ? 'sad' : 'open' });
for (const [, x, y, order, p] of customers) orderBubble(x, y - 66, order, p);

// передний план
clump(20, 420, 'tulip', 4); clump(372, 470, 'cornflower', 5);
bush(372, 560, 0.75, 0xffd84a);
well(78, 712);
workbench(318, 724);
pond(196, 750);
critter('tisha', 292, 612, { s: 0.82, eyes: 'happy' });
clump(26, 780, 'daisy', 5); clump(372, 790, 'rose', 4);
tree(-6, 820, 0.8);

// бабочки
for (const [x, y, col] of [[150, 160, 0xffd84a], [340, 420, 0x9fd0ff], [60, 470, 0xff9ab8]]) {
  c.save(); c.translate(x, y); c.rotate(-0.3);
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 5, -2, 5, 7, s * 0.5, 0, 7); c.fillStyle = hex(col); c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); }
  c.fillStyle = INK; c.fillRect(-1, -6, 2, 10); c.restore();
}

// мягкий свет: солнце слева сверху и затемнение по краям
let gr = c.createRadialGradient(80, 80, 20, 80, 80, 420);
gr.addColorStop(0, 'rgba(255,240,190,0.28)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
c.fillStyle = gr; c.fillRect(0, 0, W, H);
gr = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.7);
gr.addColorStop(0, 'rgba(30,40,10,0)'); gr.addColorStop(1, 'rgba(30,40,10,0.28)');
c.fillStyle = gr; c.fillRect(0, 0, W, H);

if (!location.hash.includes('nohud')) hud();
document.title = 'ready';
