import { INK, oval, disc, box, poly, shadow, shine, curve, stroke } from './paint.js';
import { flowerHead } from './flowers.js';

/**
 * Картинки улучшений для лавки: лейка, корзинка, сапожки, тёплая земля, колокольчик, пугало.
 * Каждая — на мягком круглом фоне своего цвета, 72×72, центр в (0, 0).
 */
const BACK = {
  can: 0xcfe8f7, basket: 0xf6e2b8, boots: 0xf8d3cc, soil: 0xffe6a8, bell: 0xfff0b8, scarecrow: 0xdcefc4,
};

function backdrop(g, color) {
  g.fillStyle(color, 1); g.fillCircle(0, 0, 33);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(-8, -14, 40, 22);
}

const DRAW = {
  can(g) {
    shadow(g, 2, 22, 44, 8);
    poly(g, [[6, -2], [24, -16], [28, -12], [12, 8]], 0x9fb8c8, 2.2);
    oval(g, 28, -15, 8, 11, 0xc8dde8, 2);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(27, -18, 1.5); g.fillCircle(30, -14, 1.5);
    box(g, -20, -8, 30, 28, 7, 0x6fa8d0);
    g.fillStyle(0x5590ba, 1); g.fillRoundedRect(-20, 10, 30, 10, 6);
    shine(g, -12, -1, 8, 6);
    curve(g, -14, -8, -5, -24, 4, -8, 3.2);
    // капли
    for (const [x, y] of [[32, -2], [36, 6], [30, 10]]) { g.fillStyle(0x5cb0ff, 1); g.fillEllipse(x, y, 4, 6); }
  },
  basket(g) {
    shadow(g, 0, 22, 50, 8);
    flowerHead(g, 'tulip', -10, -12, 0.65); flowerHead(g, 'daisy', 9, -14, 0.65); flowerHead(g, 'rose', 0, -6, 0.6);
    curve(g, -16, -2, 0, -32, 16, -2, 3.4);
    curve(g, -16, -2, 0, -32, 16, -2, 1.4, 0xd09a52);
    poly(g, [[-22, -2], [22, -2], [17, 20], [-17, 20]], 0xd09a52, 2.4);
    g.lineStyle(1.8, 0x8a5a33, 1);
    g.line(-20, 5, 20, 5); g.line(-18, 12, 18, 12);
    for (let x = -12; x <= 12; x += 8) g.line(x, -1, x * 0.8, 19);
    box(g, -23, -5, 46, 6, 3, 0xe0b070, 2);
  },
  boots(g) {
    shadow(g, 0, 23, 54, 8);
    for (const [dx, c] of [[-9, 0xc4302a], [9, 0xe8483a]]) {
      g.local(dx, 0, dx < 0 ? -0.08 : 0.06, () => {
        poly(g, [[-8, -20], [6, -20], [6, 10], [16, 12], [17, 20], [-9, 20]], c, 2.4);
        g.fillStyle(0xffffff, 0.9); g.fillRect(-7, -19, 12, 4);
        g.fillStyle(INK, 1); g.fillRect(-9, 17, 26, 3);
        shine(g, -3, -6, 3, 10, 0.4);
      });
    }
    // линии скорости
    g.lineStyle(2.4, 0xffffff, 0.9); g.line(-30, -6, -22, -6); g.line(-32, 2, -24, 2); g.line(-29, 10, -23, 10);
  },
  soil(g) {
    // солнышко над грядкой с ростком
    g.fillStyle(0xffc93a, 1);
    for (let i = 0; i < 8; i++) g.local(-14, -14, (i / 8) * Math.PI * 2, () => g.fillTriangle(-2.5, -10, 2.5, -10, 0, -15));
    disc(g, -14, -14, 8, 0xffd84a, 2);
    shadow(g, 0, 22, 54, 8);
    oval(g, 2, 14, 46, 16, 0x7a5232, 2.4);
    g.fillStyle(0x9a6a3e, 1); g.fillEllipse(-4, 10, 22, 6);
    stroke(g, [[4, 10], [5, -2], [4, -10]], 6);
    stroke(g, [[4, 10], [5, -2], [4, -10]], 3, 0x5f9c3e);
    poly(g, [[4, -6], [16, -14], [22, -10], [12, -2]], 0x7cc05a, 2);
    poly(g, [[4, -2], [-8, -8], [-12, -3], [-2, 2]], 0x6fb04a, 2);
    // тёплый пар
    g.lineStyle(2, 0xff9a5a, 0.8); curve(g, 18, 6, 22, 0, 18, -4, 2, 0xff9a5a); curve(g, 26, 8, 30, 2, 26, -2, 2, 0xff9a5a);
  },
  bell(g) {
    shadow(g, 0, 23, 40, 7);
    curve(g, -6, -24, 0, -30, 6, -24, 3);
    poly(g, [[-4, -22], [4, -22], [12, -12], [14, 6], [20, 13], [-20, 13], [-14, 6], [-12, -12]], 0xffc93a, 2.4);
    g.fillStyle(0xe8a020, 1); g.fillPoints([{ x: 4, y: -21 }, { x: 12, y: -12 }, { x: 14, y: 6 }, { x: 19, y: 12 }, { x: 8, y: 12 }, { x: 6, y: -12 }]);
    shine(g, -6, -8, 4, 10, 0.55);
    disc(g, 0, 18, 4.5, 0xb87a1a, 2);
    // ленточка и звон
    poly(g, [[-4, -24], [-16, -30], [-14, -20]], 0xe05a8a, 1.8); poly(g, [[4, -24], [16, -30], [14, -20]], 0xe05a8a, 1.8);
    g.lineStyle(2.4, INK, 1); g.strokeArc(0, 2, 26, -0.5, 0.2); g.strokeArc(0, 2, 26, Math.PI - 0.2, Math.PI + 0.5);
  },
  scarecrow(g) {
    shadow(g, 0, 24, 40, 7);
    box(g, -2.5, -6, 5, 30, 2, 0x8a5a33, 2);
    box(g, -24, -4, 48, 5, 2, 0x8a5a33, 2);
    // рубашка
    poly(g, [[-13, -6], [13, -6], [10, 14], [-10, 14]], 0x6fa8d0, 2.2);
    g.fillStyle(0xe05a48, 1); g.fillRect(-4, -2, 8, 8);
    // солома из рукавов
    g.fillStyle(0xf0c860, 1);
    for (const s of [-1, 1]) { g.fillTriangle(s * 22, -5, s * 30, -9, s * 28, 0); g.fillTriangle(s * 22, -1, s * 30, 2, s * 26, 4); }
    // голова и шляпа
    disc(g, 0, -15, 9, 0xf3dcae, 2);
    g.fillStyle(INK, 1); g.fillCircle(-3.5, -16, 1.6); g.fillCircle(3.5, -16, 1.6);
    curve(g, -4, -11, 0, -8, 4, -11, 1.8);
    poly(g, [[-16, -21], [16, -21], [8, -24], [4, -33], [-5, -33], [-8, -24]], 0xe0b04a, 2);
    g.fillStyle(0xc0662f, 1); g.fillRect(-8, -25, 16, 3);
    // убегающий жук
    g.local(24, -24, 0.4, () => { disc(g, 0, 0, 4.5, 0x8a3fa0, 1.6); g.fillStyle(0xffffff, 0.8); g.fillEllipse(-4, -3, 6, 4); });
  },
};

export const UPGRADE_ICON_KEYS = Object.keys(DRAW).map((k) => 'up_' + k);

export function makeUpgradeTextures(textures) {
  for (const [k, draw] of Object.entries(DRAW)) {
    textures.bake('up_' + k, 72, 72, 36, 36, (g) => { backdrop(g, BACK[k]); draw(g); });
  }
}
