import { getEase } from './easing.js';

const RESERVED = new Set(['targets', 'duration', 'ease', 'delay', 'yoyo', 'repeat', 'onComplete', 'onUpdate']);

/**
 * Плавное изменение числовых свойств объекта.
 * tweens.add({ targets: obj, x: 100, alpha: 0, duration: 300, ease: 'quadOut' })
 */
class Tween {
  constructor(cfg) {
    this.targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
    this.duration = Math.max(1, cfg.duration || 300);
    this.ease = getEase(cfg.ease);
    this.delay = cfg.delay || 0;
    this.yoyo = !!cfg.yoyo;
    this.repeat = cfg.repeat || 0; // -1 — бесконечно
    this.onComplete = cfg.onComplete || null;
    this.onUpdate = cfg.onUpdate || null;
    this.props = Object.keys(cfg).filter((k) => !RESERVED.has(k)).map((k) => ({ key: k, to: cfg[k], from: null }));
    this.elapsed = 0;
    this.started = false;
    this.backward = false;
    this.done = false;
  }

  _start() {
    this.started = true;
    for (const p of this.props) p.from = this.targets.map((t) => t[p.key]);
  }

  /** @returns {boolean} закончился ли твин */
  update(dt) {
    if (this.done) return true;
    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay > 0) return false;
      dt = -this.delay;
      this.delay = 0;
    }
    if (!this.started) this._start();
    this.elapsed += dt;
    let k = Math.min(1, this.elapsed / this.duration);
    const e = this.ease(this.backward ? 1 - k : k);
    for (const p of this.props) {
      for (let i = 0; i < this.targets.length; i++) {
        const from = p.from[i];
        this.targets[i][p.key] = from + (p.to - from) * e;
      }
    }
    if (this.onUpdate) this.onUpdate(e);
    if (k < 1) return false;

    // конец прохода
    this.elapsed = 0;
    if (this.yoyo && !this.backward) { this.backward = true; return false; }
    this.backward = false;
    if (this.repeat === -1 || this.repeat > 0) {
      if (this.repeat > 0) this.repeat--;
      return false;
    }
    this.done = true;
    if (this.onComplete) this.onComplete();
    return true;
  }

  stop() { this.done = true; }
}

export class TweenManager {
  constructor() {
    this._list = [];
    this.timeScale = 1;
  }

  add(cfg) {
    const t = new Tween(cfg);
    this._list.push(t);
    return t;
  }

  /** Останавливает все твины объекта (без вызова onComplete). */
  killTweensOf(target) {
    for (const t of this._list) if (t.targets.includes(target)) t.done = true;
  }

  update(dt) {
    const step = dt * this.timeScale;
    // твины, созданные во время прохода (например в onComplete), попадают в новый список
    // и начнут обновляться со следующего кадра
    const current = this._list;
    this._list = [];
    for (const t of current) if (!t.update(step)) this._list.push(t);
  }

  clear() {
    this._list.length = 0;
  }
}
