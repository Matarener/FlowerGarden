/**
 * Рендер на Canvas 2D в два слоя:
 *  - static: фон и всё неподвижное, перерисовывается только при смене сцены или размера;
 *  - dynamic: всё, что двигается, очищается и рисуется каждый кадр.
 *
 * Камера вписывает «дизайнерский» прямоугольник (например 390×844) в экран целиком
 * и центрирует его; на вытянутых экранах по краям видна часть мира за его пределами.
 */
export class Renderer {
  constructor(container, { designWidth, designHeight, background = '#000' }) {
    this.designWidth = designWidth;
    this.designHeight = designHeight;
    this.background = background;

    this.staticCanvas = this._makeCanvas(container, false);
    this.dynamicCanvas = this._makeCanvas(container, true);
    this.staticCtx = this.staticCanvas.getContext('2d', { alpha: false });
    this.dynamicCtx = this.dynamicCanvas.getContext('2d');

    this.width = 0;   // размер холста в пикселях устройства
    this.height = 0;
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.pixelRatio = 1;
    this.zoom = 1;    // пикселей устройства на игровую единицу
    this.offsetX = 0;
    this.offsetY = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  _makeCanvas(container, transparent) {
    const c = document.createElement('canvas');
    c.style.position = 'absolute';
    c.style.inset = '0';
    c.style.display = 'block';
    if (transparent) c.style.touchAction = 'manipulation';
    container.appendChild(c);
    return c;
  }

  /** @returns {boolean} изменился ли размер */
  resize(cssWidth, cssHeight, pixelRatio) {
    const w = Math.max(1, Math.round(cssWidth * pixelRatio));
    const h = Math.max(1, Math.round(cssHeight * pixelRatio));
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.pixelRatio = pixelRatio;
    for (const c of [this.staticCanvas, this.dynamicCanvas]) {
      c.width = w;
      c.height = h;
      c.style.width = cssWidth + 'px';
      c.style.height = cssHeight + 'px';
    }
    this.zoom = Math.min(w / this.designWidth, h / this.designHeight);
    this.offsetX = w / 2 - (this.designWidth / 2) * this.zoom;
    this.offsetY = h / 2 - (this.designHeight / 2) * this.zoom;
    return true;
  }

  /** Какая часть мира сейчас видна на экране (в игровых единицах). */
  visibleWorld() {
    return {
      left: -this.offsetX / this.zoom,
      right: (this.width - this.offsetX) / this.zoom,
      top: -this.offsetY / this.zoom,
      bottom: (this.height - this.offsetY) / this.zoom,
    };
  }

  /** CSS-координаты внутри холста → игровые. */
  screenToWorld(cssX, cssY) {
    return {
      x: (cssX * this.pixelRatio - this.offsetX) / this.zoom,
      y: (cssY * this.pixelRatio - this.offsetY) / this.zoom,
    };
  }

  /** Игровые координаты → CSS-координаты внутри холста. */
  worldToScreen(x, y) {
    return {
      x: (x * this.zoom + this.offsetX) / this.pixelRatio,
      y: (y * this.zoom + this.offsetY) / this.pixelRatio,
    };
  }

  clearStatic() {
    const ctx = this.staticCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  clearDynamic() {
    const ctx = this.dynamicCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Устанавливает мировую матрицу (x' = a·x + c·y + e, y' = b·x + d·y + f) с учётом камеры.
   * @param {boolean} shake  учитывать ли тряску камеры (у статичного слоя её нет)
   */
  setTransform(ctx, a, b, c, d, e, f, shake = true) {
    const z = this.zoom;
    const ox = this.offsetX + (shake ? this.shakeX : 0);
    const oy = this.offsetY + (shake ? this.shakeY : 0);
    ctx.setTransform(a * z, b * z, c * z, d * z, e * z + ox, f * z + oy);
  }

  /** Рисует текстуру в текущей матрице так, что её точка привязки оказывается в (0, 0). */
  drawTexture(ctx, tex) {
    ctx.drawImage(tex.canvas, -tex.ox, -tex.oy, tex.w, tex.h);
  }

  /** То же, но только левая часть текстуры шириной cropW игровых единиц (полоски здоровья). */
  drawTextureCropped(ctx, tex, cropW) {
    const k = tex.canvas.width / tex.w;
    const w = Math.max(0, Math.min(tex.w, cropW));
    if (w <= 0) return;
    ctx.drawImage(tex.canvas, 0, 0, w * k, tex.canvas.height, -tex.ox, -tex.oy, w, tex.h);
  }
}
