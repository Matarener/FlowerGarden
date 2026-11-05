import { INK, oval, disc, box, poly, shadow, shine, stroke } from './paint.js';
import { flowerHead } from './flowers.js';
import { grassTuft } from './background.js';

/**
 * Картинки для карты уровней: баннер над каждой поляной, узор с цветочками для фона
 * и мордочка Тиши над текущим уровнем. Всё запекается один раз и идёт в HTML через iconUrl.
 */
export const BANNER_W = 344, BANNER_H = 84;

function sky(g, top, bottom) {
  g.verticalGradient(top, bottom); g.fillRect(0, 0, BANNER_W, BANNER_H);
}
function cloud(g, x, y, s = 1) {
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(x, y, 40 * s, 14 * s); g.fillEllipse(x + 12 * s, y - 5 * s, 26 * s, 14 * s); g.fillEllipse(x - 10 * s, y - 3 * s, 22 * s, 11 * s);
}
function stem(g, x, y, h) {
  stroke(g, [[x, y], [x + 1, y - h]], 4.5);
  stroke(g, [[x, y], [x + 1, y - h]], 2.2, 0x5f9c3e);
}
function meadow(g, y, color, tuft) {
  g.fillStyle(color, 1);
  g.fillPoints([{ x: 0, y: BANNER_H }, { x: 0, y }, { x: 90, y: y - 6 }, { x: 200, y: y + 2 }, { x: BANNER_W, y: y - 5 }, { x: BANNER_W, y: BANNER_H }]);
  for (let x = 8; x < BANNER_W; x += 23) grassTuft(g, x, BANNER_H - 3 - (x % 3) * 3, tuft);
}

const BANNERS = {
  home(g) {
    sky(g, 0xbfe6f7, 0xe8f6e0);
    cloud(g, 150, 18); cloud(g, 262, 26, 0.8);
    // дальние кусты
    g.fillStyle(0x9fd07a, 1);
    for (let x = 0; x < BANNER_W + 30; x += 34) g.fillEllipse(x, 58, 46, 30);
    // домик Тиши
    shadow(g, 62, 76, 90, 8);
    box(g, 26, 34, 70, 40, 4, 0xfff0d0, 2.4);
    poly(g, [[18, 38], [61, 8], [104, 38]], 0xe0583e, 2.6);
    g.fillStyle(0xc4402c, 1); g.fillPoints([{ x: 61, y: 12 }, { x: 98, y: 36 }, { x: 61, y: 36 }]);
    box(g, 76, 14, 9, 16, 1.5, 0x9a6a3e, 2);
    box(g, 52, 48, 18, 26, 8, 0x9a6a3e, 2.2);
    g.fillStyle(0xffd84a, 1); g.fillCircle(66, 62, 1.8);
    box(g, 32, 44, 14, 13, 2, 0x8fd0f0, 2); g.lineStyle(1.6, INK, 1); g.line(39, 44, 39, 57); g.line(32, 50.5, 46, 50.5);
    // дымок
    g.fillStyle(0xffffff, 0.7); g.fillCircle(82, 7, 4); g.fillCircle(87, 2, 3);
    meadow(g, 70, 0x7cc05a, 0x5f9c3e);
    // заборчик
    for (let x = 116; x < 236; x += 13) {
      poly(g, [[x, 74], [x, 52], [x + 4.5, 47], [x + 9, 52], [x + 9, 74]], 0xf3e2c0, 2);
    }
    box(g, 112, 56, 128, 5, 2, 0xe0c898, 1.8); box(g, 112, 66, 128, 5, 2, 0xe0c898, 1.8);
    // цветы у забора
    for (const [x, k, h] of [[124, 'daisy', 16], [150, 'tulip', 20], [178, 'daisy', 14], [204, 'tulip', 18], [228, 'daisy', 17]]) {
      stem(g, x, 82, h); flowerHead(g, k, x + 1, 82 - h, 0.42);
    }
    // яблонька
    shadow(g, 296, 78, 60, 8);
    box(g, 290, 44, 11, 34, 3, 0x8a5a33, 2.2);
    disc(g, 296, 34, 26, 0x6fb04a, 2.6);
    g.fillStyle(0x86c862, 1); g.fillCircle(288, 26, 12);
    for (const [x, y] of [[282, 38], [304, 26], [310, 42], [292, 18]]) disc(g, x, y, 4, 0xe8483a, 1.6);
  },

  brook(g) {
    sky(g, 0xb4e2f5, 0xe2f4ef);
    cloud(g, 70, 16, 0.9); cloud(g, 236, 14);
    g.fillStyle(0x8fcf86, 1);
    for (let x = 0; x < BANNER_W + 40; x += 50) g.fillEllipse(x + 10, 54, 80, 30);
    meadow(g, 52, 0x7cc05a, 0x5f9c3e);
    // ручей змейкой
    const water = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24; water.push([t * BANNER_W, 66 + Math.sin(t * 7) * 5]); }
    stroke(g, water, 26);
    stroke(g, water, 21, 0x5cb0e8);
    stroke(g, water.map(([x, y]) => [x, y - 3]), 6, 0x8fd0f5);
    g.lineStyle(2, 0xffffff, 0.85);
    for (const x of [40, 120, 210, 300]) { const y = 66 + Math.sin((x / BANNER_W) * 7) * 5; g.line(x, y + 2, x + 12, y + 2); }
    // камушки и кувшинка
    for (const [x, y, w] of [[96, 72, 18], [170, 60, 14], [258, 74, 16]]) oval(g, x, y, w, w * 0.6, 0xb8b0a4, 2);
    oval(g, 214, 70, 20, 8, 0x6fb04a, 1.8); flowerHead(g, 'rose', 214, 66, 0.3);
    // мостик
    shadow(g, 140, 80, 70, 6);
    g.lineStyle(6, INK, 1); g.strokeArc(140, 98, 44, Math.PI * 1.15, Math.PI * 1.85);
    g.lineStyle(3.6, 0xc89058, 1); g.strokeArc(140, 98, 44, Math.PI * 1.15, Math.PI * 1.85);
    for (let i = 0; i < 5; i++) { const a = Math.PI * (1.25 + i * 0.125); box(g, 140 + Math.cos(a) * 44 - 1.5, 98 + Math.sin(a) * 44 - 12, 3, 12, 1, 0xa87040, 1.4); }
    // камыши
    for (const x of [16, 28, 316, 328]) {
      stroke(g, [[x, 60], [x + 1, 26]], 4); stroke(g, [[x, 60], [x + 1, 26]], 2, 0x5f9c3e);
      box(g, x - 3, 24, 7, 14, 3.5, 0x8a5a33, 1.8);
    }
    // васильки на берегу
    for (const [x, h] of [[54, 14], [70, 18], [282, 16], [298, 12]]) { stem(g, x, 56, h); flowerHead(g, 'cornflower', x + 1, 56 - h, 0.4); }
  },

  hill(g) {
    sky(g, 0xffe2a8, 0xfff3d6);
    // солнце
    g.fillStyle(0xffd84a, 0.6);
    for (let i = 0; i < 12; i++) g.local(282, 22, (i / 12) * Math.PI * 2, () => g.fillTriangle(-4, -20, 4, -20, 0, -30));
    disc(g, 282, 22, 15, 0xffc93a, 2.4); shine(g, 277, 17, 6, 4, 0.6);
    cloud(g, 90, 20, 0.8);
    // холмы в два слоя
    g.fillStyle(0xb8d888, 1); g.fillEllipse(70, 74, 220, 70); g.fillEllipse(250, 80, 260, 64);
    g.fillStyle(0x8cc464, 1); g.fillEllipse(170, 92, 320, 60);
    g.lineStyle(2.4, 0x6fa84a, 0.6); g.strokeArc(170, 92, 150, Math.PI * 1.15, Math.PI * 1.4);
    // мельница
    shadow(g, 70, 56, 30, 6);
    poly(g, [[60, 56], [64, 26], [76, 26], [80, 56]], 0xfff0d0, 2.2);
    poly(g, [[60, 28], [70, 16], [80, 28]], 0xe0583e, 2);
    g.local(70, 24, 0.35, () => {
      for (let i = 0; i < 4; i++) g.local(0, 0, (i / 4) * Math.PI * 2, () => box(g, -2.5, -22, 5, 20, 1.5, 0xf3e2c0, 1.8));
    });
    disc(g, 70, 24, 3, 0x8a5a33, 1.6);
    // подсолнухи
    for (const [x, h, s] of [[150, 30, 0.6], [176, 38, 0.66], [204, 28, 0.58], [314, 26, 0.55]]) {
      stem(g, x, 84, h);
      poly(g, [[x + 1, 84 - h * 0.5], [x + 11, 84 - h * 0.6], [x + 2, 84 - h * 0.35]], 0x7cc05a, 1.6);
      flowerHead(g, 'sunflower', x + 1, 84 - h, s);
    }
    for (let x = 6; x < BANNER_W; x += 26) grassTuft(g, x, BANNER_H - 2, 0x5f9c3e);
  },
};

/** Узор для фона карты: редкие цветочки и травинки на прозрачном. */
function pattern(g) {
  const items = [[20, 22, 'daisy'], [86, 64, 'tulip'], [40, 104, 'cornflower'], [110, 14, 'rose']];
  for (const [x, y, k] of items) { g.ctx.globalAlpha = 0.35; flowerHead(g, k, x, y, 0.3); }
  g.ctx.globalAlpha = 1;
  for (const [x, y] of [[66, 30], [14, 70], [98, 108], [124, 80]]) { g.ctx.globalAlpha = 0.5; grassTuft(g, x, y, 0x8cc066); }
  g.ctx.globalAlpha = 1; g.fillStyle(0xffffff, 0.5); for (const [x, y] of [[50, 60], [118, 46], [76, 118], [8, 120]]) g.fillCircle(x, y, 2);
}

/** Мордочка Тиши из готовых текстур головы и глаз. */
function portrait(textures) {
  const head = textures.get('tisha_head'), eyes = textures.get('eyes_happy');
  textures.bake('map_tisha', 84, 72, 42, 52, (g) => {
    g.ctx.drawImage(head.canvas, -head.ox, -head.oy, head.w, head.h);
    g.ctx.drawImage(eyes.canvas, -eyes.ox, -4 - eyes.oy, eyes.w, eyes.h);
  });
}

export const MAP_ICON_KEYS = [...Object.keys(BANNERS).map((k) => 'map_' + k), 'map_pattern', 'map_tisha'];

/** Вызывать после makeCritterTextures и makeFlowerTextures. */
export function makeMapTextures(textures) {
  for (const [k, draw] of Object.entries(BANNERS)) textures.bake('map_' + k, BANNER_W, BANNER_H, 0, 0, draw);
  textures.bake('map_pattern', 136, 136, 0, 0, pattern);
  portrait(textures);
}
