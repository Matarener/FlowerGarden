/**
 * Обёртка над CanvasRenderingContext2D с короткими командами рисования.
 * Цвета задаются числом 0xRRGGBB и прозрачностью отдельно.
 * Используется только при «запекании» текстур, не в каждом кадре.
 */
export const rgba = (color, alpha = 1) =>
  'rgba(' + ((color >> 16) & 255) + ',' + ((color >> 8) & 255) + ',' + (color & 255) + ',' + alpha + ')';

export const cssColor = (color) => '#' + color.toString(16).padStart(6, '0');

export class Painter {
  constructor(ctx) {
    this.ctx = ctx;
    this._gradient = null;
  }

  fillStyle(color, alpha = 1) {
    this._gradient = null;
    this.ctx.fillStyle = rgba(color, alpha);
    return this;
  }

  lineStyle(width, color, alpha = 1) {
    this.ctx.lineWidth = width;
    this.ctx.strokeStyle = rgba(color, alpha);
    return this;
  }

  /** Вертикальный градиент для следующего fillRect: верхний цвет → нижний. */
  verticalGradient(top, bottom, alpha = 1) {
    this._gradient = { top, bottom, alpha };
    return this;
  }

  fillRect(x, y, w, h) {
    const ctx = this.ctx;
    if (this._gradient) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, rgba(this._gradient.top, this._gradient.alpha));
      g.addColorStop(1, rgba(this._gradient.bottom, this._gradient.alpha));
      ctx.fillStyle = g;
      this._gradient = null;
    }
    ctx.fillRect(x, y, w, h);
  }

  fillEllipse(x, y, w, h) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  strokeEllipse(x, y, w, h) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  fillCircle(x, y, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _roundedPath(x, y, w, h, r) {
    const ctx = this.ctx;
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  fillRoundedRect(x, y, w, h, r) {
    this._roundedPath(x, y, w, h, r);
    this.ctx.fill();
  }

  strokeRoundedRect(x, y, w, h, r) {
    this._roundedPath(x, y, w, h, r);
    this.ctx.stroke();
  }

  fillTriangle(x1, y1, x2, y2, x3, y3) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
  }

  fillPoints(points) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }

  line(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /** Дуга только обводкой. Углы в радианах, по часовой стрелке. */
  strokeArc(x, y, r, from, to) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, from, to, false);
    ctx.stroke();
  }

  strokePolyline(points) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }

  /** Рисование в локальных координатах: translate + rotate на время draw(). */
  local(x, y, rotation, draw) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    draw();
    ctx.restore();
  }
}
