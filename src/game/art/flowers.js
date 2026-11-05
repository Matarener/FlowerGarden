import { INK, oval, disc, poly, shine, curve, stroke } from './paint.js';
import { FLOWER_KEYS } from '../data/content.js';

/**
 * Цветы: головки (для заказов и интерфейса), растения на грядке по стадиям, букеты.
 * Растения рисуются от точки на земле (0, 0) вверх.
 */
export const FLOWER_COLORS = {
  daisy: 0xffffff, tulip: 0xe8483a, cornflower: 0x4f7fe0, rose: 0xf06c9b, sunflower: 0xffc93a,
};

/** Головка цветка с центром в (x, y), s — масштаб (1 ≈ 30 единиц в поперечнике). */
export function flowerHead(g, kind, x, y, s = 1) {
  g.local(x, y, 0, () => {
    g.ctx.scale(s, s);
    switch (kind) {
      case 'daisy': {
        for (let i = 0; i < 10; i++) {
          g.local(0, 0, (i / 10) * Math.PI * 2, () => oval(g, 0, -9, 7.5, 13, 0xffffff, 1.8));
        }
        disc(g, 0, 0, 6, 0xffd23a, 1.8);
        shine(g, -2, -2, 3.5, 2.5, 0.7);
        break;
      }
      case 'tulip': {
        poly(g, [[-10, -10], [-5, -3], [0, -12], [5, -3], [10, -10], [11, 3], [6, 10], [-6, 10], [-11, 3]], 0xe8483a, 2.2);
        g.fillStyle(0xc4302a, 1); g.fillPoints([{ x: 0, y: -10 }, { x: 5, y: -2 }, { x: 4, y: 9 }, { x: 0, y: 9 }]);
        shine(g, -5, -2, 3, 6, 0.45);
        break;
      }
      case 'cornflower': {
        for (let i = 0; i < 9; i++) {
          g.local(0, 0, (i / 9) * Math.PI * 2, () => poly(g, [[-3.5, -4], [-5, -13], [-1.5, -10], [0, -14], [1.5, -10], [5, -13], [3.5, -4]], 0x4f7fe0, 1.6));
        }
        disc(g, 0, 0, 5, 0x2a3f8c, 1.6);
        g.fillStyle(0xa8c0ff, 1); g.fillCircle(-1.5, -1.5, 1.5);
        break;
      }
      case 'rose': {
        disc(g, 0, 0, 12, 0xf06c9b, 2.2);
        g.lineStyle(2, 0xb83c6c, 1);
        g.strokeArc(0, 0, 8.5, 3.6, 6.0); g.strokeArc(0, 1, 5.5, 0.4, 3.2); g.strokeArc(-0.5, -0.5, 2.6, 3.3, 6.5);
        shine(g, -5, -5, 4, 3, 0.5);
        break;
      }
      case 'sunflower': {
        for (let i = 0; i < 14; i++) {
          g.local(0, 0, (i / 14) * Math.PI * 2, () => oval(g, 0, -11, 6, 11, 0xffc93a, 1.6));
        }
        disc(g, 0, 0, 8, 0x7a4a22, 1.8);
        g.fillStyle(0x5a3416, 1);
        for (let i = 0; i < 7; i++) g.fillCircle(Math.cos(i * 0.9) * 4, Math.sin(i * 0.9) * 4, 1.1);
        break;
      }
    }
  });
}

function leaf(g, x, y, dir, size = 1) {
  g.local(x, y, dir * 0.9, () => {
    g.ctx.scale(size, size);
    poly(g, [[0, 0], [dir * 6, -6], [dir * 14, -5], [dir * 8, 2]], 0x6fb04a, 1.8);
  });
}

function stem(g, h) {
  stroke(g, [[0, 0], [1, -h * 0.5], [0, -h]], 6, INK);
  stroke(g, [[0, 0], [1, -h * 0.5], [0, -h]], 3, 0x5f9c3e);
}

/** Холмик земли с семенем. */
function mound(g) {
  oval(g, 0, -3, 30, 12, 0x6b4a30, 2);
  g.fillStyle(0x86603e, 1); g.fillEllipse(-3, -6, 14, 4);
  g.fillStyle(0xe8d29a, 1); g.fillEllipse(2, -7, 5, 3.5);
}

function sprout(g) {
  mound(g);
  stem(g, 14);
  leaf(g, 0, -12, -1, 0.8); leaf(g, 0, -14, 1, 0.8);
}

function bud(g, kind) {
  stem(g, 30);
  leaf(g, 0, -10, -1); leaf(g, 0, -16, 1);
  const c = FLOWER_COLORS[kind] === 0xffffff ? 0xf6f0d8 : FLOWER_COLORS[kind];
  poly(g, [[-5, -30], [0, -44], [5, -30], [0, -26]], c, 2);
  g.fillStyle(0x6fb04a, 1); g.fillTriangle(-5, -30, 0, -26, -1, -34); g.fillTriangle(5, -30, 0, -26, 1, -34);
}

function bloom(g, kind) {
  const h = kind === 'sunflower' ? 46 : 38;
  stem(g, h);
  leaf(g, 0, -10, -1, 1.1); leaf(g, 0, -18, 1, 1.1);
  flowerHead(g, kind, 0, -h - 4, kind === 'sunflower' ? 1.15 : 1);
}

function wilted(g) {
  stroke(g, [[0, 0], [2, -14], [10, -20], [14, -14]], 6, INK);
  stroke(g, [[0, 0], [2, -14], [10, -20], [14, -14]], 3, 0x9a8a48);
  poly(g, [[0, -2], [-12, -6], [-6, 0]], 0xa89a50, 1.6);
  oval(g, 15, -11, 10, 8, 0x8a6a3a, 1.8);
  g.fillStyle(0x6b4a30, 1); g.fillEllipse(0, -1, 26, 6);
}

/** Букет: три головки, обёртка и бантик. */
export function bouquet(g, kind, x = 0, y = 0, s = 1) {
  g.local(x, y, 0, () => {
    g.ctx.scale(s, s);
    for (const [dx, dy] of [[-8, -8], [8, -8], [0, -15]]) {
      stroke(g, [[0, 6], [dx * 0.6, dy + 4]], 4, INK);
      stroke(g, [[0, 6], [dx * 0.6, dy + 4]], 2, 0x5f9c3e);
    }
    poly(g, [[-13, -2], [13, -2], [4, 16], [-4, 16]], 0xfff1d0, 2);
    g.fillStyle(0xf3dcae, 1); g.fillTriangle(0, -2, 13, -2, 4, 16);
    flowerHead(g, kind, -8, -9, 0.6); flowerHead(g, kind, 8, -9, 0.6); flowerHead(g, kind, 0, -16, 0.6);
    disc(g, 0, 6, 3, 0xe0b04a, 1.6);
    poly(g, [[0, 6], [-8, 2], [-7, 10]], 0xe0b04a, 1.4); poly(g, [[0, 6], [8, 2], [7, 10]], 0xe0b04a, 1.4);
  });
}

/** Ключ текстуры предмета из корзинки (цветок или букет) для иконок. */
export const itemIconKey = (item) => (item.startsWith('b:') ? 'bq_' + item.slice(2) : 'fl_' + item);

export function makeFlowerTextures(textures) {
  textures.bake('plant_mound', 40, 20, 20, 14, mound);
  textures.bake('plant_sprout', 44, 40, 22, 34, sprout);
  textures.bake('plant_wilted', 50, 40, 22, 34, wilted);
  for (const k of FLOWER_KEYS) {
    textures.bake('fl_' + k, 36, 36, 18, 18, (g) => flowerHead(g, k, 0, 0, 1));
    textures.bake('bq_' + k, 40, 44, 20, 24, (g) => bouquet(g, k));
    textures.bake('plant_bud_' + k, 40, 56, 20, 50, (g) => bud(g, k));
    textures.bake('plant_bloom_' + k, 52, 76, 26, 68, (g) => bloom(g, k));
  }
}

export { curve };
