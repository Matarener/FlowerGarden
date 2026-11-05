/**
 * Отложенные и повторяющиеся вызовы, которые идут по игровому времени сцены:
 * ставятся на паузу вместе со сценой и ускоряются через timeScale.
 */
export class TimerManager {
  constructor() {
    this._list = [];
    this.timeScale = 1;
  }

  /** Вызов fn через ms миллисекунд. */
  delay(ms, fn) {
    const t = { left: ms, every: 0, fn, cancelled: false, cancel() { this.cancelled = true; } };
    this._list.push(t);
    return t;
  }

  /** Вызов fn каждые ms миллисекунд. */
  every(ms, fn) {
    const t = { left: ms, every: ms, fn, cancelled: false, cancel() { this.cancelled = true; } };
    this._list.push(t);
    return t;
  }

  update(dt) {
    const step = dt * this.timeScale;
    const current = this._list;
    this._list = [];
    for (const t of current) {
      if (t.cancelled) continue;
      t.left -= step;
      if (t.left > 0) { this._list.push(t); continue; }
      t.fn();
      if (t.every > 0 && !t.cancelled) {
        t.left += t.every;
        this._list.push(t);
      }
    }
  }

  clear() {
    this._list.length = 0;
  }
}
