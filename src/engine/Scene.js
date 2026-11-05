import { TweenManager } from './Tween.js';
import { TimerManager } from './Timer.js';
import { Emitter } from './Emitter.js';
import { Sprite, Label } from './display.js';
import { ParticleSystem } from './Particles.js';

/**
 * Сцена: список объектов, зоны нажатия, свои твины и таймеры.
 * Наследники переопределяют create(data), update(dt) и при необходимости destroy().
 */
export class Scene {
  constructor(engine) {
    this.engine = engine;
    /** Общий контекст игры (состояние, интерфейс), который игра кладёт в engine.app. */
    this.app = engine.app || null;
    this.textures = engine.textures;
    this.tweens = new TweenManager();
    this.timers = new TimerManager();
    this.events = new Emitter();
    this.objects = [];
    this.zones = [];
    this._sortDirty = false;
    this._staticDirty = true;
    this._shake = null;
  }

  /* ---------- жизненный цикл, переопределяется в играх ---------- */
  create(data) {}
  update(dt) {}
  /** Вызывается при показе сцены (в том числе повторном, после сна). */
  wake() {}
  /** Вызывается, когда сцену скрывают, не уничтожая. */
  sleep() {}
  /** Вызывается при показе и при смене размера экрана: можно подстроить фон под видимую область. */
  resize() {}

  destroy() {
    this.tweens.clear();
    this.timers.clear();
    this.events.removeAll();
    this.objects.length = 0;
    this.zones.length = 0;
  }

  /* ---------- объекты ---------- */
  add(obj) {
    obj.scene = this;
    this.objects.push(obj);
    this._sortDirty = true;
    if (obj.isStatic) this._staticDirty = true;
    return obj;
  }

  remove(obj) {
    const i = this.objects.indexOf(obj);
    if (i >= 0) this.objects.splice(i, 1);
    this.tweens.killTweensOf(obj);
    if (obj.isStatic) this._staticDirty = true;
    obj.scene = null;
  }

  sprite(key, x = 0, y = 0) {
    return this.add(new Sprite(this.textures, key, x, y));
  }

  label(text, style, x = 0, y = 0) {
    return this.add(new Label(text, style, x, y));
  }

  particles(capacity) {
    return this.add(new ParticleSystem(this.textures, capacity));
  }

  markSortDirty() { this._sortDirty = true; }
  invalidateStatic() { this._staticDirty = true; }

  /* ---------- ввод ---------- */
  /**
   * Прямоугольная зона нажатия в игровых координатах (центр и размер).
   * Позже добавленные зоны проверяются первыми.
   */
  addZone(x, y, w, h, onTap, onPress) {
    const zone = { x, y, w, h, onTap, onPress, enabled: true };
    this.zones.push(zone);
    return zone;
  }

  _zoneAt(x, y) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (z.enabled && (z.hit ? z.hit(x, y) : Math.abs(x - z.x) <= z.w / 2 && Math.abs(y - z.y) <= z.h / 2)) return z;
    }
    return null;
  }

  handlePress(x, y) {
    const z = this._zoneAt(x, y);
    if (z && z.onPress) z.onPress();
  }

  handleTap(x, y) {
    const z = this._zoneAt(x, y);
    if (z && z.onTap) z.onTap();
  }

  /* ---------- эффекты камеры ---------- */
  shake(duration, intensity) {
    if (this.engine.shakeEnabled === false) return;
    this._shake = { left: duration, intensity };
  }

  /* ---------- вызывается движком ---------- */
  step(dt) {
    this.tweens.update(dt);
    this.timers.update(dt);
    for (const obj of this.objects) if (obj.update) obj.update(dt);
    this.update(dt);

    const r = this.engine.renderer;
    if (this._shake) {
      this._shake.left -= dt;
      if (this._shake.left <= 0) { this._shake = null; r.shakeX = r.shakeY = 0; }
      else {
        const amp = this._shake.intensity * r.designWidth * r.zoom;
        r.shakeX = (Math.random() * 2 - 1) * amp;
        r.shakeY = (Math.random() * 2 - 1) * amp;
      }
    }
  }

  render(renderer) {
    if (this._sortDirty) {
      // стабильная сортировка: при равной глубине сохраняется порядок добавления
      this.objects.sort((a, b) => a.depth - b.depth);
      this._sortDirty = false;
    }
    if (this._staticDirty) {
      renderer.clearStatic();
      const ctx = renderer.staticCtx;
      for (const obj of this.objects) {
        if (obj.isStatic && obj.visible) obj.render(renderer, ctx, false);
      }
      ctx.globalAlpha = 1;
      this._staticDirty = false;
    }
    renderer.clearDynamic();
    const ctx = renderer.dynamicCtx;
    for (const obj of this.objects) {
      if (!obj.isStatic && obj.visible && obj.alpha > 0.003) obj.render(renderer, ctx, true);
    }
    ctx.globalAlpha = 1;
  }
}
