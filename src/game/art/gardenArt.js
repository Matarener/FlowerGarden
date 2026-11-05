import { rng } from '../util/rng.js';
import { bakeBackground, countFor, grassTuft, hashRandom } from './background.js';
import { INK, oval, disc, box, poly, shadow, shine, curve } from './paint.js';
import { flowerHead } from './flowers.js';
import { BED_W, BED_H } from '../level/layout.js';
import { isoGladeBackground, makeIsoTextures } from './isoArt.js';

/**
 * Графика уровня: поляна с прилавком (фон под ширину экрана), грядки, колодец,
 * столик для букетов, прилавок, облачка заказов, полоски, жук, монетка.
 */

/** Палитры мест. */
const PALETTES = {
  home:  { sky: [0xbfe3f2, 0xeaf4e0], hills: 0x9cc58a, trees: 0x5f9a55, grass: [0x8cc063, 0x669c48], dot: [0x79a956, 0xa4d07a], wall: 0xc89a62, stripe: 0xe05a48 },
  brook: { sky: [0xb6dcf0, 0xe4f2ee], hills: 0x8fbfa8, trees: 0x4f8a70, grass: [0x7fba72, 0x5a9858], dot: [0x6aa860, 0x9ccc86], wall: 0xb8946a, stripe: 0x4f8ad0 },
  hill:  { sky: [0xf6d9b0, 0xf6ecd0], hills: 0xc8c27a, trees: 0x8a9a4a, grass: [0xb0c25e, 0x8aa244], dot: [0x9fb050, 0xc8d47a], wall: 0xd0a060, stripe: 0xe0a030 },
};

function drawGlade(pal) {
  return (g, label, { left, right }) => {
    const r = rng(11);
    const h = hashRandom;
    const from = (step) => Math.floor((left - 40) / step) * step;
    const W = right - left;

    // небо, холмы и деревья на горизонте
    g.verticalGradient(pal.sky[0], pal.sky[1]);
    g.fillRect(left, -160, W, 320);
    g.fillStyle(0xffffff, 0.7);
    for (let x = from(140); x < right + 60; x += 140) {
      const y = -10 + h(x, 1) * 40;
      g.fillEllipse(x, y, 70, 22); g.fillEllipse(x + 22, y - 8, 46, 24); g.fillEllipse(x - 20, y - 4, 40, 18);
    }
    g.fillStyle(pal.hills, 1);
    for (let x = from(90); x < right + 90; x += 90) g.fillEllipse(x, 120 + h(x, 2) * 16, 170, 90 + h(x, 3) * 40);
    for (let x = from(38); x < right + 40; x += 38) {
      g.fillStyle(pal.trees, 1); g.fillEllipse(x + h(x, 4) * 8, 112 + h(x, 5) * 10, 46, 66 + h(x, 6) * 20);
    }

    // земля
    g.verticalGradient(pal.grass[0], pal.grass[1]);
    g.fillRect(left, 140, W, 900);

    // задняя стенка лавки и навес
    shadow(g, 195, 252, 380, 20, 0.2);
    box(g, 16, 150, 358, 104, 10, pal.wall);
    g.lineStyle(2, 0x8a5a33, 0.6);
    for (let y = 172; y < 250; y += 22) g.line(20, y, 370, y);
    // полки с горшками
    for (const x of [44, 346]) {
      box(g, x - 18, 176, 36, 22, 4, 0xd07a4a, 2);
      flowerHead(g, x === 44 ? 'tulip' : 'daisy', x - 6, 170, 0.55);
      flowerHead(g, x === 44 ? 'rose' : 'cornflower', x + 7, 168, 0.55);
    }
    // столбы навеса
    for (const x of [22, 368]) box(g, x - 5, 112, 10, 140, 3, 0x8a5a33, 2);
    // полосатый навес с фестонами
    g.fillStyle(INK, 1); g.fillRoundedRect(6, 92, 378, 44, 8);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 ? 0xfff4dc : pal.stripe, 1);
      g.fillRect(9 + i * 41.3, 95, 41.3, 38);
    }
    for (let i = 0; i < 9; i++) {
      const cx = 9 + i * 41.3 + 20.6;
      g.fillStyle(INK, 1); g.fillEllipse(cx, 134, 45, 22);
      g.fillStyle(i % 2 ? 0xfff4dc : pal.stripe, 1); g.fillEllipse(cx, 133, 40, 18);
    }
    g.fillStyle(0xffffff, 0.25); g.fillRect(9, 97, 372, 8);

    // фактура травы
    for (let i = 0; i < 260; i++) {
      const x = -120 + r() * 630, y = 320 + r() * 720;
      g.fillStyle(r() < 0.5 ? pal.dot[0] : pal.dot[1], 0.5);
      g.fillEllipse(x, y, 4 + r() * 8, 2 + r() * 4);
    }

    // тропинка от прилавка вниз и поперёк у колодца
    const path = (c, w) => {
      g.fillStyle(c, 1);
      g.fillRoundedRect(195 - w / 2, 300, w, 470, w / 2);
      g.fillRoundedRect(30, 700 - w / 2 + 30, 330, w, w / 2);
      g.fillRoundedRect(20, 330 - w / 2, 350, w, w / 2);
    };
    path(0xb39a6c, 52);
    path(0xd8c294, 44);
    for (let i = 0; i < 30; i++) {
      const y = 320 + r() * 440, x = 195 + (r() - 0.5) * 34;
      g.fillStyle(0xbca476, 1); g.fillEllipse(x, y, 6, 3.5);
    }

    // кустики и цветочки
    for (let i = 0; i < 70; i++) {
      const x = -120 + r() * 630, y = 330 + r() * 700;
      grassTuft(g, x, y, r() < 0.5 ? 0x4f7d3c : 0x5e9346);
    }
    for (let i = 0; i < 30; i++) {
      const x = -120 + r() * 630, y = 340 + r() * 680;
      g.fillStyle(r() < 0.5 ? 0xfff8ec : 0xffe27a, 1);
      [[0, -3], [3, 0], [0, 3], [-3, 0]].forEach(([dx, dy]) => g.fillCircle(x + dx, y + dy, 2.2));
      g.fillStyle(0xe0a03a, 1); g.fillCircle(x, y, 1.6);
    }
    // забор внизу
    for (let x = from(26); x < right + 30; x += 26) {
      box(g, x - 5, 800, 10, 40, 3, 0xc8945c, 2);
    }
    g.fillStyle(INK, 1); g.fillRect(left, 812, W, 6);
    g.fillStyle(0xa77446, 1); g.fillRect(left, 813.5, W, 3);
  };
}

function drawGladeSides(pal) {
  return (g, sides, r) => {
    for (const side of sides) {
      const [a, b] = side;
      const x = () => a + r() * (b - a);
      for (let i = countFor(side, 260); i > 0; i--) {
        g.fillStyle(r() < 0.5 ? pal.dot[0] : pal.dot[1], 0.5);
        g.fillEllipse(x(), 320 + r() * 720, 4 + r() * 8, 2 + r() * 4);
      }
      for (let i = countFor(side, 70); i > 0; i--) grassTuft(g, x(), 330 + r() * 700, r() < 0.5 ? 0x4f7d3c : 0x5e9346);
      for (let i = countFor(side, 8); i > 0; i--) {
        const bx = x(), by = 320 + r() * 460, s = 0.8 + r() * 0.6;
        shadow(g, bx, by + 10 * s, 60 * s, 12 * s, 0.14);
        g.fillStyle(0x3f6a34, 1); g.fillEllipse(bx - 14 * s, by, 34 * s, 26 * s); g.fillEllipse(bx + 14 * s, by, 34 * s, 26 * s);
        g.fillStyle(0x4f8040, 1); g.fillEllipse(bx, by - 8 * s, 40 * s, 30 * s);
        for (let k = 0; k < 3; k++) { g.fillStyle(0xf06c9b, 1); g.fillCircle(bx + (r() - 0.5) * 40 * s, by - 8 * s + (r() - 0.5) * 20 * s, 2.6); }
      }
    }
  };
}

/** Фон поляны для места (home, brook, hill) под ширину экрана. */
export function gladeBackground(textures, renderer, place) {
  // версия в изометрии: плоский фон drawGlade оставлен для сравнения, но не используется
  return isoGladeBackground(textures, renderer, place);
}

/* ---------- предметы ---------- */
function drawBed(g) {
  const w = BED_W, h = BED_H, x0 = -w / 2, y0 = -h / 2;
  shadow(g, 0, h / 2 + 2, w + 10, 16);
  box(g, x0, y0, w, h, 14, 0x9a6a3e);
  g.fillStyle(0xb4824f, 1); g.fillRoundedRect(x0 + 4, y0 + 3, w - 8, 4, 2);
  g.fillStyle(INK, 1); g.fillRoundedRect(x0 + 8, y0 + 8, w - 16, h - 16, 9);
  g.fillStyle(0x5a3c26, 1); g.fillRoundedRect(x0 + 10, y0 + 10, w - 20, h - 20, 8);
  g.lineStyle(2, 0x47301e, 0.8);
  for (let i = 1; i <= 2; i++) { const y = y0 + 10 + (h - 20) * (i / 3); g.line(x0 + 16, y, x0 + w - 16, y); }
  const r = rng(5);
  for (let i = 0; i < 24; i++) { g.fillStyle(r() < 0.5 ? 0x6e4a30 : 0x3e2818, 1); g.fillEllipse(x0 + 14 + r() * (w - 28), y0 + 14 + r() * (h - 28), 3, 2); }
}

function drawLockedBed(g) {
  const w = BED_W, h = BED_H;
  g.fillStyle(0x000000, 0.08); g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(2.5, 0xffffff, 0.35); g.ctx.setLineDash([6, 6]); g.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 12); g.ctx.setLineDash([]);
  for (const [x, y] of [[-24, -10], [18, 12], [26, -16], [-14, 18]]) grassTuft(g, x, y, 0x4f7d3c);
}

function drawWell(g) {
  shadow(g, 0, 30, 92, 18);
  // крыша на столбиках
  box(g, -36, -58, 7, 64, 2, 0x8a5a33, 2); box(g, 29, -58, 7, 64, 2, 0x8a5a33, 2);
  poly(g, [[-46, -52], [0, -80], [46, -52], [40, -46], [-40, -46]], 0xd2392a);
  g.fillStyle(0xa82a1e, 1); g.fillPoints([{ x: 0, y: -77 }, { x: 40, y: -50 }, { x: 0, y: -50 }]);
  // вал ворота (верёвка и ведро — отдельные текстуры, они двигаются)
  box(g, -30, -39, 64, 6, 3, 0xa86e3e, 1.8);
  disc(g, 38, -36, 4, 0x8a5a33, 1.8);
  // каменный сруб
  box(g, -38, -6, 76, 34, 10, 0x9aa4a8);
  g.fillStyle(0x3a5a78, 1); g.fillEllipse(0, -6, 66, 14);
  g.fillStyle(0x6fa8d0, 1); g.fillEllipse(0, -4, 56, 9);
  shine(g, -10, -5, 14, 3, 0.5);
  const r = rng(8);
  for (let i = 0; i < 9; i++) { g.lineStyle(1.6, 0x6e787c, 1); const x = -30 + (i % 5) * 15 + (i > 4 ? 7 : 0), y = i > 4 ? 18 : 8; g.strokeRoundedRect(x - 6, y - 4, 13 + r() * 2, 8, 3); }
}

/** Ведро: точка (0, 0) — верх дужки, за неё ведро висит на верёвке. */
function drawBucket(g, full) {
  g.lineStyle(2, INK, 1); g.strokeArc(0, 9, 8, Math.PI * 1.05, Math.PI * 1.95);
  poly(g, [[-9, 6], [9, 6], [7, 20], [-7, 20]], 0x8a5a33, 2);
  g.fillStyle(0x6e4626, 1); g.fillRect(-8, 11, 16, 2.5);
  g.fillStyle(INK, 1); g.fillEllipse(0, 6, 19, 6);
  g.fillStyle(full ? 0x5cb0ff : 0x4a3424, 1); g.fillEllipse(0, 6, 15.5, 4);
  if (full) shine(g, -3, 5.5, 5, 1.5, 0.7);
}

/** Ручка ворота: крутится вокруг оси. */
function drawCrank(g) {
  g.lineStyle(5, INK, 1); g.line(0, 0, 0, 12);
  g.lineStyle(2.6, 0xc8945c, 1); g.line(0, 0, 0, 12);
  disc(g, 0, 13, 3.4, 0xd2392a, 1.6);
  disc(g, 0, 0, 2.6, 0x8a5a33, 1.4);
}

function drawTable(g) {
  shadow(g, 0, 30, 84, 14);
  box(g, -30, -2, 6, 30, 2, 0x8a5a33, 2); box(g, 24, -2, 6, 30, 2, 0x8a5a33, 2);
  box(g, -40, -14, 80, 16, 6, 0xc8945c);
  g.fillStyle(0xe0b07a, 1); g.fillRoundedRect(-36, -12, 72, 4, 2);
  // ленты и бумага на столе
  poly(g, [[-30, -16], [-8, -22], [-2, -14], [-24, -10]], 0xfff1d0, 1.8);
  disc(g, 16, -18, 6, 0xe0b04a, 1.8); g.fillStyle(0xb88a2a, 1); g.fillCircle(16, -18, 2);
  // табличка
  box(g, -18, -50, 36, 20, 5, 0xfff4dc, 2);
  curve(g, -9, -40, 0, -46, 9, -40, 2, 0xe05a48);
  g.lineStyle(2, INK, 1); g.line(0, -30, 0, -20);
}

function drawCounter(g) {
  // передняя стенка прилавка: закрывает ноги покупателей
  shadow(g, 195, 66, 380, 18, 0.22);
  box(g, 14, 0, 362, 18, 7, 0xe0b07a);
  box(g, 22, 18, 346, 44, 6, 0xa86e3e);
  g.lineStyle(2, 0x7a4a26, 0.8);
  for (let x = 66; x < 360; x += 44) g.line(x, 22, x, 58);
  g.fillStyle(0xf0c890, 1); g.fillRoundedRect(18, 2, 354, 5, 2.5);
}

function drawBubble(g) {
  const w = 104, h = 50;
  poly(g, [[-8, h / 2 - 2], [0, h / 2 + 10], [8, h / 2 - 2]], 0xffffff, 2.4);
  box(g, -w / 2, -h / 2, w, h, 16, 0xffffff, 2.4);
  g.fillStyle(0xffffff, 1); g.fillRect(-7, h / 2 - 6, 14, 6);
}

function bar(g, w, h, color) {
  g.fillStyle(color, 1); g.fillRoundedRect(0, -h / 2, w, h, h / 2);
  g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(1.5, -h / 2 + 1, w - 3, h * 0.35, h / 4);
}
function barBg(g, w, h) {
  g.fillStyle(INK, 1); g.fillRoundedRect(0, -h / 2, w, h, h / 2);
  g.fillStyle(0x5a4028, 1); g.fillRoundedRect(1.5, -h / 2 + 1.5, w - 3, h - 3, (h - 3) / 2);
}

function drawBeetle(g, wings) {
  shadow(g, 0, 12, 26, 8, 0.2);
  if (wings) {
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(-11, -8, 16, 10); g.fillEllipse(11, -8, 16, 10);
  }
  g.lineStyle(2, INK, 1);
  for (const s of [-1, 1]) { g.line(s * 6, 2, s * 13, 6); g.line(s * 6, 6, s * 12, 11); g.line(s * 4, -2, s * 12, -2); }
  disc(g, 0, -9, 6, 0x3a2a4a, 2);
  g.fillStyle(0xffffff, 1); g.fillCircle(-2.5, -10, 1.8); g.fillCircle(2.5, -10, 1.8);
  g.fillStyle(INK, 1); g.fillCircle(-2.2, -9.6, 0.9); g.fillCircle(2.8, -9.6, 0.9);
  oval(g, 0, 2, 20, 18, 0x8a3fa0, 2.2);
  g.lineStyle(1.8, INK, 1); g.line(0, -6, 0, 11);
  g.fillStyle(0x5e2a70, 1); g.fillCircle(-5, 1, 2.4); g.fillCircle(5, 4, 2.2); g.fillCircle(-3, 7, 1.8);
  shine(g, -5, -3, 5, 3, 0.45);
  curve(g, -2, -14, -4, -20, -7, -21, 1.6); curve(g, 2, -14, 4, -20, 7, -21, 1.6);
}

function drawCoin(g) {
  disc(g, 0, 0, 8, 0xffc93a, 2.2);
  g.fillStyle(0xe8a020, 1); g.fillCircle(0, 0, 5);
  g.fillStyle(0xffe48a, 1); g.fillEllipse(-1, -1.5, 5, 3);
  shine(g, -3.5, -3.5, 3, 2, 0.8);
}

function drawDrop(g) {
  poly(g, [[0, -10], [6, -1], [6, 3], [3, 7], [-3, 7], [-6, 3], [-6, -1]], 0x5cb0ff, 2);
  shine(g, -2, 1, 3, 4, 0.7);
}

/** Пузырь «хочу пить» над ростком. */
function drawThirst(g) {
  box(g, -15, -15, 30, 30, 15, 0xffffff, 2.2);
  g.local(0, 1, 0, () => drawDrop(g));
}

export function makeGardenTextures(textures, label) {
  textures.bake('bed', BED_W + 14, BED_H + 22, BED_W / 2 + 7, BED_H / 2 + 6, drawBed);
  textures.bake('bed_locked', BED_W + 4, BED_H + 4, BED_W / 2 + 2, BED_H / 2 + 2, drawLockedBed);
  textures.bake('well', 104, 124, 52, 86, drawWell);
  textures.bake('table', 96, 90, 48, 56, drawTable);
  textures.bake('bucket', 26, 26, 13, 2, (g) => drawBucket(g, false));
  textures.bake('bucket_full', 26, 26, 13, 2, (g) => drawBucket(g, true));
  textures.bake('rope', 4, 10, 2, 0, (g) => { g.fillStyle(0x7a5a3a, 1); g.fillRect(-1.2, 0, 2.4, 10); });
  textures.bake('crank', 14, 24, 7, 5, drawCrank);
  textures.bake('counter', 390, 80, 0, 4, drawCounter);
  textures.bake('bubble', 112, 74, 56, 30, drawBubble);
  textures.bake('pbar_bg', 64, 10, 0, 5, (g) => barBg(g, 64, 10));
  textures.bake('pbar_good', 60, 6, 0, 3, (g) => bar(g, 60, 6, 0x6fcf4a));
  textures.bake('pbar_mid', 60, 6, 0, 3, (g) => bar(g, 60, 6, 0xffc93a));
  textures.bake('pbar_bad', 60, 6, 0, 3, (g) => bar(g, 60, 6, 0xf0564c));
  textures.bake('bbar_bg', 58, 10, 0, 5, (g) => barBg(g, 58, 10));
  textures.bake('bbar_grow', 54, 6, 0, 3, (g) => bar(g, 54, 6, 0x8ad45a));
  textures.bake('bbar_dry', 54, 6, 0, 3, (g) => bar(g, 54, 6, 0x5cb0ff));
  textures.bake('bbar_bloom', 54, 6, 0, 3, (g) => bar(g, 54, 6, 0xf06c9b));
  textures.bake('beetle_a', 44, 44, 22, 24, (g) => drawBeetle(g, false));
  textures.bake('beetle_b', 44, 44, 22, 24, (g) => drawBeetle(g, true));
  textures.bake('coin', 22, 22, 11, 11, drawCoin);
  textures.bake('drop', 18, 22, 9, 12, drawDrop);
  textures.bake('thirst', 38, 38, 19, 19, drawThirst);
  textures.bake('glint', 30, 30, 15, 15, (g) => {
    g.fillStyle(0xffffff, 0.95);
    g.fillPoints([{ x: 0, y: -13 }, { x: 3, y: -3 }, { x: 13, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 13 }, { x: -3, y: 3 }, { x: -13, y: 0 }, { x: -3, y: -3 }]);
  });
  // номера дел в очереди
  for (let i = 1; i <= 6; i++) {
    textures.bake('q' + i, 26, 26, 13, 13, (g, lb) => {
      disc(g, 0, 0, 9.5, 0xffd45c, 2.2);
      lb(0, 0.5, String(i), { size: 11, color: '#3e2512', stroke: null });
    });
  }
  makeIsoTextures(textures);
}
