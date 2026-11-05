import { TEXTURE_SCALE } from './TextureCache.js';
import { normalizeTextStyle, applyTextStyle, measureText } from './text.js';

/**
 * Базовый объект сцены: положение, масштаб, поворот, прозрачность, глубина.
 * Глубина определяет порядок отрисовки; при её смене сцена пересортирует список.
 */
export class DisplayObject {
  constructor(x = 0, y = 0) {
    this.scene = null;
    this.x = x;
    this.y = y;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
    this.alpha = 1;
    this.visible = true;
    this._depth = 0;
    /** Статичные объекты рисуются в фоновый слой один раз. */
    this.isStatic = false;
  }

  get depth() { return this._depth; }
  set depth(v) {
    if (v === this._depth) return;
    this._depth = v;
    if (this.scene) this.scene.markSortDirty();
  }

  /** Равномерный масштаб: удобно для твинов `{ scale: 1.2 }`. */
  get scale() { return this.scaleX; }
  set scale(v) { this.scaleX = v; this.scaleY = v; }

  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(sx, sy = sx) { this.scaleX = sx; this.scaleY = sy; return this; }
  setAlpha(a) { this.alpha = a; return this; }
  setVisible(v) { this.visible = v; return this; }
  setDepth(d) { this.depth = d; return this; }
  setRotation(r) { this.rotation = r; return this; }
  setStatic(v = true) { this.isStatic = v; return this; }

  /** Матрица объекта без камеры. */
  applyTransform(renderer, ctx, shake) {
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    renderer.setTransform(ctx, cos * this.scaleX, sin * this.scaleX, -sin * this.scaleY, cos * this.scaleY, this.x, this.y, shake);
  }

  /** Переопределяется наследниками. */
  render(renderer, ctx, shake) {}

  destroy() {
    if (this.scene) this.scene.remove(this);
  }
}

/** Готовая текстура из кэша. Масштаб 1 означает «логический размер текстуры». */
export class Sprite extends DisplayObject {
  constructor(textures, key, x, y) {
    super(x, y);
    this.textures = textures;
    this.flipX = false;
    /** Если задано, рисуется только левая часть шириной cropWidth (игровых единиц). */
    this.cropWidth = null;
    this.tint = null;
    this.setTexture(key);
  }

  setTexture(key) {
    this.key = key;
    this.texture = this.textures.get(key);
    return this;
  }

  setFlipX(v) { this.flipX = v; return this; }
  setCrop(w) { this.cropWidth = w; return this; }
  setTint(color) { this.tint = color; return this; }

  render(renderer, ctx, shake) {
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    const fx = this.flipX ? -1 : 1;
    renderer.setTransform(ctx, cos * this.scaleX * fx, sin * this.scaleX * fx, -sin * this.scaleY, cos * this.scaleY, this.x, this.y, shake);
    ctx.globalAlpha = this.alpha;
    const tex = this.tint != null ? this.textures.tinted(this.key, this.tint, 0.85) : this.texture;
    if (this.cropWidth != null) renderer.drawTextureCropped(ctx, tex, this.cropWidth);
    else renderer.drawTexture(ctx, tex);
  }
}

/**
 * Текстовая надпись. Рисуется в собственный холст только при смене текста,
 * каждый кадр выводится готовой картинкой.
 */
export class Label extends DisplayObject {
  constructor(text, style, x, y) {
    super(x, y);
    this.style = normalizeTextStyle(style);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.text = null;
    this.w = 0;
    this.h = 0;
    this.setText(text);
  }

  setText(text) {
    text = String(text);
    if (text === this.text) return this;
    this.text = text;
    const S = TEXTURE_SCALE, s = this.style;
    const w = Math.ceil(measureText(text, s)) + 4;
    const h = Math.ceil(s.size * 1.5 + s.strokeWidth);
    // холст растёт только при необходимости, чтобы не пересоздавать память
    if (this.canvas.width < w * S || this.canvas.height < h * S) {
      this.canvas.width = Math.max(this.canvas.width, w * S);
      this.canvas.height = Math.max(this.canvas.height, h * S);
    }
    this.w = w;
    this.h = h;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    applyTextStyle(ctx, s);
    if (s.stroke && s.strokeWidth > 0) {
      ctx.lineWidth = s.strokeWidth;
      ctx.strokeStyle = s.stroke;
      ctx.strokeText(text, w / 2, h / 2 + 0.5);
    }
    ctx.fillStyle = this._color || s.color;
    ctx.fillText(text, w / 2, h / 2 + 0.5);
    return this;
  }

  /** Меняет цвет заливки (перерисовка только при изменении). */
  setColor(color) {
    if (color === (this._color || this.style.color)) return this;
    this._color = color;
    const t = this.text;
    this.text = null;
    return this.setText(t);
  }

  render(renderer, ctx, shake) {
    this.applyTransform(renderer, ctx, shake);
    ctx.globalAlpha = this.alpha;
    const S = TEXTURE_SCALE;
    ctx.drawImage(this.canvas, 0, 0, this.w * S, this.h * S, -this.w / 2, -this.h / 2, this.w, this.h);
  }
}
