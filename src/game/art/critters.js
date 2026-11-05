import { INK, oval, disc, box, poly, shadow, shine, curve } from './paint.js';
import { CRITTER } from '../data/skeleton.js';

/**
 * Зверята на одном скелете (data/skeleton.js): ёжик Тиша и покупатели.
 * У каждого свой скин: голова, туловище, лапки, ножки. Глаза и лейка общие.
 */
export const SKINS = {
  tisha: { fur: 0xc98d5a, belly: 0xf4dcb4, cloth: 0x5fa64a, cloth2: 0x478a36, paw: 0x9a6438 },
  bunny: { fur: 0xeeeae4, belly: 0xffffff, cloth: 0xe07a9a, cloth2: 0xc45f80, paw: 0xd8d2ca },
  bear:  { fur: 0xa8703f, belly: 0xe8c08e, cloth: 0x4f86c6, cloth2: 0x3c6ea8, paw: 0x84552d },
  fox:   { fur: 0xe8823a, belly: 0xfff1de, cloth: 0x8b62c4, cloth2: 0x7049a8, paw: 0x3e2512 },
  frog:  { fur: 0x7cc05a, belly: 0xd8f0a8, cloth: 0xf0b040, cloth2: 0xd09228, paw: 0x5ea044 },
};

/** Запечь деталь так, что точка привязки из скелета совпадает с (0, 0) рисунка. */
function part(textures, key, w, h, origin, draw) {
  textures.bake(key, w, h, w * origin[0], h * origin[1], draw);
}

const att = (name) => CRITTER.attachments[name].origin;

function drawBody(g, c) {
  // туловище с фартуком или курточкой
  oval(g, 0, -20, 38, 40, c.fur);
  g.fillStyle(c.belly, 1); g.fillEllipse(0, -16, 26, 28);
  g.fillStyle(INK, 1); g.fillRoundedRect(-15, -22, 30, 22, 7);
  g.fillStyle(c.cloth, 1); g.fillRoundedRect(-12.5, -19.5, 25, 17, 5);
  g.fillStyle(c.cloth2, 1); g.fillRoundedRect(-6, -13, 12, 7, 2.5);
  g.lineStyle(2, INK, 1); g.line(-9, -22, -12, -34); g.line(9, -22, 12, -34);
  shine(g, -9, -30, 7, 5, 0.35);
}

function drawLeg(g, c) {
  box(g, -5, 0, 10, 13, 4, c.paw);
  oval(g, 1.5, 15, 15, 8, c.paw);
}

function drawArm(g, c) {
  box(g, -4.5, 0, 9, 19, 4.5, c.fur);
  disc(g, 0, 20, 5.2, c.paw === INK ? 0x5a3a22 : c.paw);
}

/* ---------- головы ---------- */
function muzzle(g, color, y = 8) {
  g.fillStyle(color, 1); g.fillEllipse(0, y, 30, 20);
  g.fillStyle(INK, 1); g.fillEllipse(0, y - 3, 8, 6);
  shine(g, -1.5, y - 4.5, 3, 2, 0.7);
  curve(g, -5, y + 4, 0, y + 8, 5, y + 4, 2);
}
function cheeks(g, alpha = 0.45) {
  g.fillStyle(0xff8a8a, alpha); g.fillEllipse(-15, 6, 9, 6); g.fillEllipse(15, 6, 9, 6);
}

const HEADS = {
  tisha(g, c) {
    // колючки веером за головой
    const spikes = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.95 + (i / 12) * 1.1);
      const r1 = 22, r2 = i % 2 ? 31 : 36;
      spikes.push([Math.cos(a) * r2, -4 + Math.sin(a) * r2]);
      const a2 = a + Math.PI / 24;
      spikes.push([Math.cos(a2) * r1, -4 + Math.sin(a2) * r1]);
    }
    spikes.push([24, 6], [-24, 6]);
    poly(g, spikes, 0x6b4426);
    g.fillStyle(0x8a5a33, 1);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.13); g.fillEllipse(Math.cos(a) * 25, -4 + Math.sin(a) * 25, 5, 9); }
    oval(g, 0, 0, 44, 40, c.belly);
    muzzle(g, 0xfff1dc, 9);
    cheeks(g);
    // листик на макушке — примета Тиши
    g.local(4, -36, 0.5, () => {
      poly(g, [[0, 0], [7, -8], [14, -5], [10, 2]], 0x7cc05a, 2);
      g.lineStyle(1.4, 0x3f7a2c, 1); g.line(1, -0.5, 11, -4);
    });
  },
  bunny(g, c) {
    for (const s of [-1, 1]) {
      g.local(s * 9, -16, s * 0.18, () => {
        oval(g, 0, -18, 13, 36, c.fur);
        g.fillStyle(0xffb6c6, 1); g.fillEllipse(0, -16, 6, 26);
      });
    }
    oval(g, 0, 0, 46, 40, c.fur);
    muzzle(g, 0xffffff, 9);
    g.fillStyle(0xff9fb4, 1); g.fillEllipse(0, 6, 7, 5);
    cheeks(g, 0.5);
  },
  bear(g, c) {
    for (const s of [-1, 1]) { disc(g, s * 18, -16, 9, c.fur); g.fillStyle(c.belly, 1); g.fillCircle(s * 18, -16, 5); }
    oval(g, 0, 0, 50, 42, c.fur);
    muzzle(g, c.belly, 9);
    cheeks(g, 0.35);
  },
  fox(g, c) {
    for (const s of [-1, 1]) {
      poly(g, [[s * 8, -14], [s * 22, -34], [s * 24, -8]], c.fur);
      g.fillStyle(0x3e2512, 1); g.fillTriangle(s * 14, -16, s * 21, -29, s * 21, -12);
    }
    poly(g, [[-25, -4], [-18, -18], [0, -22], [18, -18], [25, -4], [16, 14], [0, 20], [-16, 14]], c.fur);
    g.fillStyle(c.belly, 1);
    g.fillPoints([{ x: -22, y: 0 }, { x: -6, y: 6 }, { x: 0, y: 19 }, { x: -14, y: 13 }]);
    g.fillPoints([{ x: 22, y: 0 }, { x: 6, y: 6 }, { x: 0, y: 19 }, { x: 14, y: 13 }]);
    g.fillStyle(INK, 1); g.fillEllipse(0, 13, 7, 5);
    cheeks(g, 0.3);
  },
  frog(g, c) {
    disc(g, -12, -16, 10, c.fur); disc(g, 12, -16, 10, c.fur);
    oval(g, 0, 0, 52, 34, c.fur);
    g.fillStyle(c.belly, 1); g.fillEllipse(0, 7, 34, 14);
    curve(g, -14, 5, 0, 13, 14, 5, 2.2);
    cheeks(g, 0.4);
  },
};

/* ---------- глаза ---------- */
function eyes(g, kind) {
  for (const s of [-1, 1]) {
    const x = s * 9;
    if (kind === 'open') {
      g.fillStyle(INK, 1); g.fillEllipse(x, 0, 6.5, 8.5);
      g.fillStyle(0xffffff, 1); g.fillCircle(x - 1.2, -1.8, 1.6);
    } else if (kind === 'closed') {
      curve(g, x - 3.5, 0, x, 2.5, x + 3.5, 0, 2);
    } else if (kind === 'happy') {
      curve(g, x - 3.8, 1.5, x, -3.5, x + 3.8, 1.5, 2.4);
    } else if (kind === 'sad') {
      g.fillStyle(INK, 1); g.fillEllipse(x, 1, 6, 6.5);
      g.lineStyle(2, INK, 1); g.line(x - s * 4.5, -5, x + s * 3, -3);
    }
  }
}

/** Лейка в лапке Тиши. */
function drawCan(g) {
  poly(g, [[8, -4], [26, -14], [29, -10], [12, 4]], 0x9fb8c8, 2);
  oval(g, 30, -13, 7, 9, 0xc8dde8, 1.8);
  box(g, -6, -8, 20, 18, 5, 0x6fa8d0);
  shine(g, -1, -3, 6, 4);
  curve(g, -2, -8, 4, -18, 10, -8, 2.6);
}

/** Все текстуры зверят. Вызывать до создания SkeletonSprite. */
export function makeCritterTextures(textures) {
  for (const [skin, c] of Object.entries(SKINS)) {
    part(textures, skin + '_body', 52, 50, att('body'), (g) => drawBody(g, c));
    part(textures, skin + '_leg', 26, 28, att('leg'), (g) => drawLeg(g, c));
    part(textures, skin + '_arm', 20, 32, att('arm'), (g) => drawArm(g, c));
    part(textures, skin + '_head', 84, 80, att('head'), (g) => HEADS[skin](g, c));
  }
  for (const k of ['open', 'closed', 'happy', 'sad']) part(textures, 'eyes_' + k, 34, 16, att('eyes_' + k), (g) => eyes(g, k));
  part(textures, 'can', 48, 34, att('can'), drawCan);
  textures.bake('none', 2, 2, 1, 1, () => {});
  // тень под ногами отдельной текстурой: тень не качается вместе с телом
  textures.bake('critter_shadow', 60, 16, 30, 8, (g) => shadow(g, 0, 0, 50, 12, 0.2));
}

export { shadow };
