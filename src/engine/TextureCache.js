import { Painter, rgba } from './Painter.js';
import { drawText } from './text.js';

/** Текстуры хранятся в двойном разрешении относительно игровых единиц. */
export const TEXTURE_SCALE = 2;

/**
 * Текстура: холст плюс логический размер и точка привязки (origin) в игровых единицах.
 * @typedef {{ canvas: HTMLCanvasElement, w: number, h: number, ox: number, oy: number }} Texture
 */

export class TextureCache {
  constructor() {
    /** @type {Map<string, Texture>} */
    this._map = new Map();
  }

  has(key) {
    return this._map.has(key);
  }

  /** @returns {Texture} */
  get(key) {
    const t = this._map.get(key);
    if (!t) throw new Error('Нет текстуры "' + key + '"');
    return t;
  }

  /**
   * Рисует текстуру один раз и кладёт в кэш. Повторный вызов с тем же ключом ничего не делает.
   * @param {string} key
   * @param {number} w,h      логический размер
   * @param {number} ox,oy    где внутри текстуры её точка привязки
   * @param {(p: Painter, label: Function) => void} draw  рисует в координатах относительно (ox, oy)
   * @param {number} [scale]  разрешение относительно игровых единиц; для больших мягких фонов
   *                          хватает 1.5, это экономит память
   */
  bake(key, w, h, ox, oy, draw, scale = TEXTURE_SCALE) {
    if (this._map.has(key)) return this._map.get(key);
    const S = scale;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * S);
    canvas.height = Math.ceil(h * S);
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    ctx.translate(ox, oy);
    const label = (x, y, str, style) => drawText(ctx, str, x, y, style);
    draw(new Painter(ctx), label);
    const tex = { canvas, w, h, ox, oy };
    this._map.set(key, tex);
    return tex;
  }

  /** Удалить текстуру и её окрашенные копии, чтобы освободить память. */
  delete(key) {
    for (const k of Array.from(this._map.keys())) if (k === key || k.startsWith(key + '#')) this._map.delete(k);
  }

  /** Текстура, нарисованная от левого верхнего угла (как детали грибов). */
  bakeTopLeft(key, w, h, draw) {
    return this.bake(key, w, h, 0, 0, draw);
  }

  /** Окрашенная копия текстуры для вспышек урона. Создаётся один раз на цвет. */
  tinted(key, color, strength = 0.6) {
    const tintKey = key + '#' + color.toString(16);
    if (this._map.has(tintKey)) return this._map.get(tintKey);
    const src = this.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = src.canvas.width;
    canvas.height = src.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rgba(color, strength);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = { canvas, w: src.w, h: src.h, ox: src.ox, oy: src.oy };
    this._map.set(tintKey, tex);
    return tex;
  }

  /**
   * Новая текстура на основе готовой: копия картинки, по желанию окрашенная,
   * плюс дорисовка в тех же координатах, что и у исходной (относительно её origin).
   * @param {string} key     ключ новой текстуры
   * @param {string} srcKey  исходная текстура
   * @param {{ tint?: number, strength?: number }} [opts]
   * @param {(p: Painter) => void} [draw]
   */
  derive(key, srcKey, { tint = null, strength = 0.3 } = {}, draw = null) {
    if (this._map.has(key)) return this._map.get(key);
    const src = this.get(srcKey);
    const canvas = document.createElement('canvas');
    canvas.width = src.canvas.width;
    canvas.height = src.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src.canvas, 0, 0);
    if (tint !== null) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = rgba(tint, strength);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (draw) {
      const S = canvas.width / src.w;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.translate(src.ox, src.oy);
      draw(new Painter(ctx));
    }
    const tex = { canvas, w: src.w, h: src.h, ox: src.ox, oy: src.oy };
    this._map.set(key, tex);
    return tex;
  }

  /** Круглая частица нужного цвета. */
  dot(color) {
    return this.bake('dot:' + color, 12, 12, 6, 6, (p) => {
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, 4.5);
    });
  }
}
