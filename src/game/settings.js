import { Emitter } from '../engine/Emitter.js';

const STORAGE_KEY = 'flowerglade-settings';

/** Настройки по умолчанию. */
export const DEFAULT_SETTINGS = {
  quality: 'auto',     // 'auto' | 'high' | 'medium' | 'low'
  fpsLimit: 0,         // 0 — без ограничения, 60, 30
  effects: true,       // частицы: искры, споры, пылинки
  shake: true,         // тряска экрана от ударов
  showFps: false,      // счётчик кадров
  music: 0.6,          // громкость 0..1
  sounds: 0.8,
};

/** Разрешение холста для каждой ступени качества (относительно CSS-пикселя). */
export const QUALITY_RATIO = { high: 2, medium: 1.5, low: 1 };

/**
 * Настройки игрока: хранятся в браузере, при изменении отправляют 'change'.
 * Применяет их к движку и звуку функция applySettings в main.js.
 */
export class Settings extends Emitter {
  constructor() {
    super();
    this.values = { ...DEFAULT_SETTINGS };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in saved) this.values[k] = saved[k];
    } catch (e) { /* хранилище недоступно: работаем с настройками по умолчанию */ }
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values)); } catch (e) { /* не страшно */ }
    this.emit('change', key, value);
  }

  reset() {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) this.set(k, v);
  }
}
