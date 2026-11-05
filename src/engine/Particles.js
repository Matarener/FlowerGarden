import { DisplayObject } from './display.js';

/**
 * Пул частиц: все частицы создаются один раз, потом только переиспользуются.
 * Каждая частица — готовая круглая текстура своего цвета, без перекраски на лету.
 */
export class ParticleSystem extends DisplayObject {
  constructor(textures, capacity = 160) {
    super(0, 0);
    this.textures = textures;
    this._pool = Array.from({ length: capacity }, () => ({ alive: false }));
    this._emitters = [];
    this.enabled = true;
  }

  /** Подготовить текстуры заранее, чтобы первый всплеск не создавал холст посреди анимации. */
  prepare(colors) {
    for (const c of colors) this.textures.dot(c);
    return this;
  }

  get _active() {
    return this.enabled && !(this.scene && this.scene.engine.effectsEnabled === false);
  }

  _spawn(p) {
    for (const slot of this._pool) {
      if (slot.alive) continue;
      Object.assign(slot, p);
      slot.alive = true;
      slot.age = 0;
      slot.tex = this.textures.dot(p.color);
      return;
    }
  }

  /**
   * Мгновенный всплеск.
   * @param {object} o  count, color, speed [min,max], angle [min,max] в градусах, life [min,max] мс,
   *                    gravity, scale [start,end]
   */
  burst(x, y, o) {
    if (!this._active) return;
    const [s0, s1] = o.speed || [50, 150];
    const [a0, a1] = o.angle || [200, 340];
    const [l0, l1] = o.life || [380, 700];
    const [sc0, sc1] = o.scale || [0.8, 0];
    for (let i = 0; i < o.count; i++) {
      const a = ((a0 + Math.random() * (a1 - a0)) * Math.PI) / 180;
      const v = s0 + Math.random() * (s1 - s0);
      this._spawn({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: o.gravity ?? 260,
        life: l0 + Math.random() * (l1 - l0), s0: sc0, s1: sc1, a0: 1, a1: 1, color: o.color,
      });
    }
  }

  /**
   * Постоянный источник (пылинки в воздухе).
   * @param {object} o  area {x,y,w,h}, every мс, colors[], life, speedX, speedY, scale, alpha
   */
  addEmitter(o) {
    const emitter = Object.assign({ acc: 0 }, o);
    this._emitters.push(emitter);
    return emitter; // область (emitter.area) можно менять на лету
  }

  update(dt) {
    if (this._active) {
      for (const e of this._emitters) {
        e.acc += dt;
        while (e.acc >= e.every) {
          e.acc -= e.every;
          const r = (range) => range[0] + Math.random() * (range[1] - range[0]);
          this._spawn({
            x: e.area.x + Math.random() * e.area.w,
            y: e.area.y + Math.random() * e.area.h,
            vx: r(e.speedX), vy: r(e.speedY), gravity: 0,
            life: r(e.life), s0: e.scale[0], s1: e.scale[1], a0: e.alpha[0], a1: e.alpha[1],
            color: e.colors[(Math.random() * e.colors.length) | 0],
          });
        }
      }
    }
    const sec = dt / 1000;
    for (const p of this._pool) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) { p.alive = false; continue; }
      p.vy += p.gravity * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
    }
  }

  render(renderer, ctx, shake) {
    if (!this._active) return;
    for (const p of this._pool) {
      if (!p.alive) continue;
      const k = p.age / p.life;
      const s = p.s0 + (p.s1 - p.s0) * k;
      if (s <= 0.01) continue;
      renderer.setTransform(ctx, s, 0, 0, s, p.x, p.y, shake);
      ctx.globalAlpha = p.a0 + (p.a1 - p.a0) * k;
      renderer.drawTexture(ctx, p.tex);
    }
  }

  clear() {
    for (const p of this._pool) p.alive = false;
  }
}
