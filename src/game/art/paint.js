/**
 * Общие приёмы рисования в мультяшном стиле: заливка с толстым тёмным контуром,
 * мягкая тень под предметом, блик. Используются только при запекании текстур.
 */
export const INK = 0x3e2512;
export const INK_DARK = 0x24170f;
const OUT = 2.6;

/** Овал с контуром. */
export function oval(g, x, y, w, h, color, out = OUT) {
  g.fillStyle(INK, 1); g.fillEllipse(x, y, w + out * 2, h + out * 2);
  g.fillStyle(color, 1); g.fillEllipse(x, y, w, h);
}

/** Круг с контуром. */
export function disc(g, x, y, r, color, out = OUT) {
  g.fillStyle(INK, 1); g.fillCircle(x, y, r + out);
  g.fillStyle(color, 1); g.fillCircle(x, y, r);
}

/** Скруглённый прямоугольник с контуром (координаты — левый верхний угол). */
export function box(g, x, y, w, h, r, color, out = OUT) {
  g.fillStyle(INK, 1); g.fillRoundedRect(x - out, y - out, w + out * 2, h + out * 2, r + out);
  g.fillStyle(color, 1); g.fillRoundedRect(x, y, w, h, r);
}

/** Многоугольник с контуром: сначала толстая обводка, потом заливка. */
export function poly(g, points, color, out = OUT) {
  const ctx = g.ctx;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = out * 2;
  ctx.strokeStyle = '#3e2512';
  ctx.stroke();
  g.fillStyle(color, 1);
  ctx.fill();
}

/** Мягкая тень на земле. */
export function shadow(g, x, y, w, h, alpha = 0.18) {
  g.fillStyle(0x000000, alpha); g.fillEllipse(x, y, w, h);
}

/** Светлый блик. */
export function shine(g, x, y, w, h, alpha = 0.55) {
  g.fillStyle(0xffffff, alpha); g.fillEllipse(x, y, w, h);
}

/** Плавная линия-штрих (стебель, улыбка). */
export function stroke(g, points, width, color = INK) {
  const ctx = g.ctx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  g.lineStyle(width, color, 1);
  g.strokePolyline(points.map(([x, y]) => ({ x, y })));
}

/** Квадратичная кривая обводкой. */
export function curve(g, x1, y1, cx, cy, x2, y2, width, color = INK) {
  const ctx = g.ctx;
  ctx.lineCap = 'round';
  g.lineStyle(width, color, 1);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
}
