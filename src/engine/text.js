/**
 * Рисование текста с обводкой. Текст в игре никогда не рисуется заново каждый кадр:
 * он запекается в текстуру (TextureCache.bake) или в холст Label при смене строки.
 */
export const DEFAULT_FONT = 'Unbounded, "Arial Black", system-ui, sans-serif';

/**
 * @param {object} style
 * @param {number} style.size        размер шрифта в игровых единицах
 * @param {string} [style.color]     цвет заливки
 * @param {string} [style.stroke]    цвет обводки, null — без обводки
 * @param {number} [style.strokeWidth]
 * @param {number} [style.weight]
 * @param {string} [style.font]
 */
export function normalizeTextStyle(style) {
  const size = style.size || 12;
  return {
    size,
    color: style.color || '#fff8ec',
    stroke: style.stroke === undefined ? '#3e2512' : style.stroke,
    strokeWidth: style.strokeWidth !== undefined ? style.strokeWidth : Math.max(3, size / 3.2),
    weight: style.weight || 700,
    font: style.font || DEFAULT_FONT,
  };
}

export function applyTextStyle(ctx, s) {
  ctx.font = s.weight + ' ' + s.size + 'px ' + s.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
}

export function drawText(ctx, str, x, y, style) {
  const s = normalizeTextStyle(style);
  ctx.save();
  applyTextStyle(ctx, s);
  if (s.stroke && s.strokeWidth > 0) {
    ctx.lineWidth = s.strokeWidth;
    ctx.strokeStyle = s.stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = s.color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

let measureCtx = null;
export function measureText(str, style) {
  const s = normalizeTextStyle(style);
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  applyTextStyle(measureCtx, s);
  return measureCtx.measureText(str).width + s.strokeWidth;
}
