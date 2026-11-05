import { Emitter } from './Emitter.js';

const STANDARD_HZ = [30, 48, 60, 72, 90, 120, 144, 165];

/**
 * Следит за производительностью: FPS, время работы кадра, самый долгий кадр (пик),
 * частота экрана. Если кадры стабильно не успевают, снижает разрешение холста.
 *
 * Раз в полсекунды отправляет событие 'stats' с объектом
 * { fps, workMs, peakMs, screenHz, limited, pixelRatio, paused }.
 */
export class PerfMonitor {
  constructor(engine, { adaptive = true } = {}) {
    this.engine = engine;
    this.events = new Emitter();
    this.adaptive = adaptive;
    this.screenHz = 0;
    this.limit = 0;          // 0, 60 или 30 кадров
    this._holdUntil = 0;
    this._blocked = false;   // запрет менять качество (например во время боя)
    this._pendingLower = false;

    this._frames = 0;
    this._work = 0;
    this._peak = 0;
    this._slow = 0;
    this._spiky = 0;
    this._warm = 0;
    this._last = performance.now();

    engine.events.on('frame', (work, interval) => {
      this._frames++;
      this._work += work;
      if (interval > this._peak) this._peak = interval;
    });
    setInterval(() => this._tick(), 500);
  }

  /** Не менять качество ms миллисекунд (после смены экрана бывают разовые провалы). */
  hold(ms) {
    this._holdUntil = Math.max(this._holdUntil, performance.now() + ms);
  }

  /** Во время боя размер холста не меняется: снижение откладывается до выхода. */
  setBlocked(blocked) {
    this._blocked = blocked;
    if (!blocked && this._pendingLower) {
      this._pendingLower = false;
      this.engine.lowerQuality();
    }
  }

  /** Ограничение кадров: 0 — без ограничения. Лимит выше частоты экрана не нужен и не включается. */
  setLimit(fps) {
    this.limit = fps || 0;
    this._applyLimit();
  }

  get effectiveLimit() {
    const hz = this.screenHz || 60;
    return this.limit && this.limit < hz - 5 ? this.limit : 0;
  }

  _applyLimit() {
    this.engine.setFpsLimit(this.effectiveLimit);
  }

  get targetFps() {
    return this.effectiveLimit || this.screenHz || 60;
  }

  /** Частота экрана по самым коротким интервалам между кадрами браузера. */
  measureScreenHz() {
    return new Promise((resolve) => {
      const d = [];
      let prev = 0;
      const step = (t) => {
        if (prev) d.push(t - prev);
        prev = t;
        if (d.length < 120) { requestAnimationFrame(step); return; }
        d.sort((a, b) => a - b);
        const hz = 1000 / d[Math.floor(d.length * 0.15)];
        this.screenHz = STANDARD_HZ.reduce((m, x) => (Math.abs(x - hz) < Math.abs(m - hz) ? x : m), 60);
        this._applyLimit();
        resolve(this.screenHz);
      };
      requestAnimationFrame(step);
    });
  }

  _tick() {
    const now = performance.now();
    const engine = this.engine;
    const paused = engine.paused || document.hidden;
    const fps = Math.round((this._frames * 1000) / (now - this._last));
    const stats = {
      fps,
      workMs: this._frames ? this._work / this._frames : 0,
      peakMs: this._peak,
      screenHz: this.screenHz,
      limited: this.effectiveLimit,
      pixelRatio: engine.pixelRatio,
      paused,
    };
    this._frames = 0;
    this._work = 0;
    this._peak = 0;
    this._last = now;
    this.events.emit('stats', stats);

    if (paused || !this.adaptive || ++this._warm < 4 || now < this._holdUntil) {
      this._slow = 0;
      this._spiky = 0;
      return;
    }
    this._slow = fps < this.targetFps * 0.95 ? this._slow + 1 : 0;
    this._spiky = stats.peakMs > 40 ? this._spiky + 1 : Math.max(0, this._spiky - 1);
    if ((this._slow >= 3 || this._spiky >= 4) && engine.canLowerQuality()) {
      this._slow = 0;
      this._spiky = 0;
      this._warm = 0;
      if (this._blocked) this._pendingLower = true;
      else engine.lowerQuality();
    }
  }
}
