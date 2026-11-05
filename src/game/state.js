import { Emitter } from '../engine/Emitter.js';
import { UPGRADES, UPGRADE_KEYS, LEVEL_COUNT, starsFor, levelReward } from './data/content.js';

/** Версия снимка сохранения: поднимать при несовместимой смене полей. */
const SAVE_VERSION = 1;

/**
 * Всё состояние игрока между уровнями: кошелёк, звёзды за уровни, ступени улучшений.
 * Сцены и интерфейс меняют его только через методы. Событие 'change' (что изменилось).
 */
export class GameState extends Emitter {
  constructor() {
    super();
    this.coins = 0;
    /** Лучшие звёзды за каждый уровень, 0 — не пройден. */
    this.stars = Array(LEVEL_COUNT).fill(0);
    this.upgrades = Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0]));
    /** Какие подсказки к уровням уже показаны. */
    this.seenIntro = [];
  }

  _changed(...what) { this.emit('change', what); }

  /** Сколько уровней открыто: пройденные плюс следующий. */
  get unlocked() {
    const firstOpen = this.stars.findIndex((s) => s === 0);
    return firstOpen < 0 ? LEVEL_COUNT : firstOpen + 1;
  }

  get totalStars() { return this.stars.reduce((a, b) => a + b, 0); }

  /** Значения улучшений для модели уровня. */
  upgradeValues() {
    return Object.fromEntries(UPGRADE_KEYS.map((k) => [k, UPGRADES[k].steps[this.upgrades[k]].v]));
  }

  /** Следующая ступень улучшения или null, если куплено всё. */
  nextUpgrade(key) {
    return UPGRADES[key].steps[this.upgrades[key] + 1] || null;
  }

  buyUpgrade(key) {
    const next = this.nextUpgrade(key);
    if (!next || this.coins < next.price) return false;
    this.coins -= next.price;
    this.upgrades[key]++;
    this._changed('coins', 'upgrades');
    return true;
  }

  /** Сколько улучшений можно купить прямо сейчас (число на кнопке лавки). */
  affordableCount() {
    return UPGRADE_KEYS.filter((k) => { const n = this.nextUpgrade(k); return n && n.price <= this.coins; }).length;
  }

  /**
   * Итог уровня. При победе в кошелёк идёт заработанное и по 10 монет за звезду.
   * @returns {{ stars: number, reward: number, best: boolean }}
   */
  finishLevel(n, won, money, startMoney, usedMs, timeMs) {
    if (!won) return { stars: 0, reward: 0, best: false };
    const stars = starsFor(usedMs, timeMs);
    const reward = levelReward(money, startMoney, stars);
    const best = stars > this.stars[n - 1];
    if (best) this.stars[n - 1] = stars;
    this.coins += reward;
    this._changed('coins', 'stars');
    return { stars, reward, best };
  }

  hasSeenIntro(n) { return this.seenIntro.includes(n); }
  markIntro(n) {
    if (this.hasSeenIntro(n)) return;
    this.seenIntro.push(n);
    this._changed('intro');
  }

  /* ---------- сохранение ---------- */
  toSave() {
    return { v: SAVE_VERSION, coins: this.coins, stars: this.stars, upgrades: this.upgrades, seenIntro: this.seenIntro };
  }

  /** @returns {boolean} удалось ли загрузить */
  restore(s) {
    if (!s || s.v !== SAVE_VERSION) return false;
    this.coins = Math.max(0, Number(s.coins) || 0);
    if (Array.isArray(s.stars)) s.stars.slice(0, LEVEL_COUNT).forEach((v, i) => { this.stars[i] = Math.max(0, Math.min(3, v | 0)); });
    for (const k of UPGRADE_KEYS) {
      const v = s.upgrades && s.upgrades[k];
      this.upgrades[k] = Math.max(0, Math.min(UPGRADES[k].steps.length - 1, v | 0));
    }
    this.seenIntro = Array.isArray(s.seenIntro) ? s.seenIntro.filter((x) => typeof x === 'number') : [];
    return true;
  }
}
