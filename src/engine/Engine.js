import { Renderer } from './Renderer.js';
import { TextureCache } from './TextureCache.js';
import { Emitter } from './Emitter.js';

/** Ступени разрешения холста относительно CSS-пикселей. */
const QUALITY_STEPS = [2, 1.5, 1.25, 1];
const MAX_DT = 100;

/**
 * Движок: игровой цикл, сцены, ввод, подстройка размера и качества.
 *
 * События (engine.events):
 *  - 'frame'  (workMs, intervalMs) после каждого нарисованного кадра;
 *  - 'resize' после смены размера холста.
 */
export class Engine {
  constructor({ container, designWidth, designHeight, background }) {
    this.container = container;
    this.events = new Emitter();
    this.textures = new TextureCache();
    this.renderer = new Renderer(container, { designWidth, designHeight, background });

    this._sceneClasses = new Map();
    this._scenes = new Map();
    this.scene = null;

    this.quality = 0;
    this.fixedRatio = null;  // если задано — разрешение выбрано вручную, автоподстройка не трогает
    this.fpsLimit = 0;       // 0 — без ограничения
    this.effectsEnabled = true;  // частицы
    this.shakeEnabled = true;    // тряска камеры
    this.paused = false;
    this._running = false;
    this._lastTime = 0;
    this._lastFrameTime = 0;
    this._raf = 0;

    this._bindInput();
    this._bindResize();
  }

  /* ---------- сцены ---------- */
  register(key, SceneClass) {
    this._sceneClasses.set(key, SceneClass);
    return this;
  }

  getScene(key) {
    return this._scenes.get(key) || null;
  }

  /**
   * Показать сцену. Если она уже создавалась, просыпается с прежним состоянием.
   * @param {boolean} restart  пересоздать сцену с нуля (для боя: каждый бой — новый объект)
   */
  show(key, data = {}, { restart = false } = {}) {
    if (this.scene) this.scene.sleep();
    let scene = this._scenes.get(key);
    if (scene && restart) {
      scene.destroy();
      this._scenes.delete(key);
      scene = null;
    }
    if (!scene) {
      const SceneClass = this._sceneClasses.get(key);
      if (!SceneClass) throw new Error('Сцена "' + key + '" не зарегистрирована');
      scene = new SceneClass(this);
      scene.key = key;
      this._scenes.set(key, scene);
      this.scene = scene;
      scene.create(data);
    } else {
      this.scene = scene;
    }
    scene.invalidateStatic();
    scene.resize();
    scene.wake(data);
    this._lastTime = 0; // время сна не считается игровым
    return scene;
  }

  /** Уничтожить сцену (например бой при выходе). */
  stopScene(key) {
    const scene = this._scenes.get(key);
    if (!scene) return;
    scene.destroy();
    this._scenes.delete(key);
    if (this.scene === scene) this.scene = null;
  }

  /* ---------- цикл ---------- */
  start() {
    if (this._running) return;
    this._running = true;
    this.resize();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  /** Пауза: цикл не считает и не рисует, на экране остаётся последний кадр. */
  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._lastTime = 0;
  }

  setFpsLimit(fps) {
    this.fpsLimit = fps || 0;
  }

  _loop(t) {
    this._raf = requestAnimationFrame((tt) => this._loop(tt));
    if (this.paused || !this.scene || document.hidden) {
      this._lastTime = 0;
      return;
    }
    // ограничение частоты: пропускаем вызовы, пришедшие раньше времени
    if (this.fpsLimit && this._lastTime && t - this._lastTime < 1000 / this.fpsLimit - 2) return;

    const dt = this._lastTime ? Math.min(MAX_DT, t - this._lastTime) : 1000 / 60;
    const interval = this._lastFrameTime ? t - this._lastFrameTime : 0;
    this._lastTime = t;
    this._lastFrameTime = t;

    const start = performance.now();
    this.scene.step(dt);
    this.scene.render(this.renderer);
    this.events.emit('frame', performance.now() - start, interval);
  }

  /* ---------- размер и качество ---------- */
  get pixelRatio() {
    const ratio = this.fixedRatio ?? QUALITY_STEPS[this.quality];
    return Math.min(ratio, window.devicePixelRatio || 1);
  }

  /** Задать разрешение вручную (null — вернуть автоматическую подстройку с максимума). */
  setFixedPixelRatio(ratio) {
    this.fixedRatio = ratio;
    if (ratio == null) this.quality = 0;
    this.resize();
  }

  /** Есть ли ступень ниже, которая реально уменьшит разрешение на этом экране. */
  canLowerQuality() {
    if (this.fixedRatio != null) return false;
    const current = this.pixelRatio;
    return QUALITY_STEPS.slice(this.quality + 1).some((q) => q < current - 0.01);
  }

  lowerQuality() {
    const current = this.pixelRatio;
    while (this.quality < QUALITY_STEPS.length - 1) {
      this.quality++;
      if (this.pixelRatio < current - 0.01) break;
    }
    this.resize();
    return this.pixelRatio < current;
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    if (this.renderer.resize(w, h, this.pixelRatio)) {
      if (this.scene) {
        this.scene.resize();
        this.scene.invalidateStatic();
        // смена размера стирает холст: на паузе перерисуем последний кадр сами
        if (this.paused) this.scene.render(this.renderer);
      }
      this.events.emit('resize', this.renderer);
    }
  }

  _bindResize() {
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.container);
    window.addEventListener('resize', () => this.resize());
  }

  /* ---------- ввод ---------- */
  _bindInput() {
    const canvas = this.renderer.dynamicCanvas;
    const toWorld = (e) => {
      const rect = canvas.getBoundingClientRect();
      return this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.scene || this.paused) return;
      const p = toWorld(e);
      this.scene.handlePress(p.x, p.y);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.scene || this.paused) return;
      const p = toWorld(e);
      this.scene.handleTap(p.x, p.y);
    });
  }
}
