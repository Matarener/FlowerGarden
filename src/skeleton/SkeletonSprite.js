import { DisplayObject } from '../engine/display.js';
import { Skeleton } from './Skeleton.js';

/**
 * Скелет как объект сцены. Каждая картинка слота рисуется одним drawImage
 * в матрице «камера × объект × кость × картинка», без промежуточных объектов.
 *
 *   const hero = scene.add(new SkeletonSprite(textures, data, 'mukhomor', 120, 400));
 *   hero.play('idle');
 *   hero.on('event', (name) => { if (name === 'hit') ... });
 */
export class SkeletonSprite extends DisplayObject {
  constructor(textures, data, skin, x = 0, y = 0) {
    super(x, y);
    this.textures = textures;
    this.skeleton = new Skeleton(data, skin);
    this.showBones = false;
    this._flash = null;       // { color, left }
  }

  /* ---------- проброс к скелету ---------- */
  get skin() { return this.skeleton.skin; }
  get animName() { return this.skeleton.animName; }
  get timeScale() { return this.skeleton.timeScale; }
  set timeScale(v) { this.skeleton.timeScale = v; }
  get time() { return this.skeleton.time; }
  set time(v) { this.skeleton.time = v; }

  play(name, opts) { this.skeleton.play(name, opts); return this; }
  setSkin(name) { this.skeleton.setSkin(name); return this; }
  on(name, fn) { this.skeleton.on(name, fn); return this; }
  once(name, fn) { this.skeleton.once(name, fn); return this; }
  off(name, fn) { this.skeleton.off(name, fn); return this; }
  getBonePose(name) { return this.skeleton.getBonePose(name); }

  /** Кратко окрасить персонажа (получение урона). Окрашенные копии текстур кэшируются. */
  flash(color = 0xff7a6a, ms = 130) {
    this._flash = { color, left: ms };
    return this;
  }

  /** Заранее создать окрашенные текстуры, чтобы первая вспышка не создавала холсты. */
  prepareFlash(color = 0xff7a6a) {
    const sk = this.skeleton;
    const names = new Set();
    for (const s of sk.slots) if (s.attachment) names.add(s.attachment);
    for (const anim of Object.values(sk.data.animations)) {
      for (const keys of Object.values(anim.slots || {})) for (const k of keys) names.add(k[1]);
    }
    for (const n of names) {
      const key = sk.resolveTexture(n);
      if (this.textures.has(key)) this.textures.tinted(key, color);
    }
    return this;
  }

  update(dt) {
    this.skeleton.update(dt / 1000);
    if (this._flash) {
      this._flash.left -= dt;
      if (this._flash.left <= 0) this._flash = null;
    }
  }

  render(renderer, ctx, shake) {
    const sk = this.skeleton;
    const atts = sk.data.attachments || {};
    const sx = this.scaleX, sy = this.scaleY;
    ctx.globalAlpha = this.alpha;

    for (const slot of sk.slots) {
      if (!slot.attachment) continue;
      const key = sk.resolveTexture(slot.attachment);
      const tex = this._flash ? this.textures.tinted(key, this._flash.color) : this.textures.get(key);
      const info = atts[slot.attachment] || {};
      const k = info.scale || 1;
      const m = sk.world[slot.bone];
      // объект (масштаб и сдвиг) × кость × масштаб картинки
      renderer.setTransform(
        ctx,
        sx * m.a * k, sy * m.b * k, sx * m.c * k, sy * m.d * k,
        this.x + sx * m.tx, this.y + sy * m.ty,
        shake,
      );
      const o = info.origin || [0.5, 0.5];
      ctx.drawImage(tex.canvas, -o[0] * tex.w, -o[1] * tex.h, tex.w, tex.h);
    }

    if (this.showBones) this._renderBones(renderer, ctx, shake);
  }

  _renderBones(renderer, ctx, shake) {
    const sk = this.skeleton;
    renderer.setTransform(ctx, 1, 0, 0, 1, 0, 0, shake);
    ctx.globalAlpha = 1;
    const pt = (i) => ({ x: this.x + this.scaleX * sk.world[i].tx, y: this.y + this.scaleY * sk.world[i].ty });
    ctx.lineCap = 'round';
    for (const [width, color] of [[6, 'rgba(11,26,16,.55)'], [2.5, '#5cf2ff']]) {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      sk.bones.forEach((b, i) => {
        if (b.parent < 0) return;
        const a = pt(b.parent), c = pt(i);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      });
    }
    sk.bones.forEach((b, i) => {
      const p = pt(i);
      ctx.fillStyle = b.parent < 0 ? '#ff5cf2' : '#ffe066';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
    });
  }
}
