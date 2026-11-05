/**
 * Минимальная система событий: on / once / off / emit.
 */
export class Emitter {
  constructor() {
    this._handlers = new Map();
  }

  on(name, fn) {
    if (!this._handlers.has(name)) this._handlers.set(name, []);
    this._handlers.get(name).push(fn);
    return this;
  }

  once(name, fn) {
    const wrapper = (...args) => {
      this.off(name, wrapper);
      fn(...args);
    };
    return this.on(name, wrapper);
  }

  off(name, fn) {
    const list = this._handlers.get(name);
    if (!list) return this;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
    return this;
  }

  emit(name, ...args) {
    const list = this._handlers.get(name);
    if (!list || !list.length) return;
    // копия: обработчик может отписаться прямо во время вызова
    for (const fn of list.slice()) fn(...args);
  }

  removeAll() {
    this._handlers.clear();
  }
}
