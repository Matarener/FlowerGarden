import { Emitter } from '../../engine/Emitter.js';
import { FLOWERS, RULES, WORK_MS, BOUQUET_SIZE, BOUQUET_MULT, CUSTOMERS } from '../data/content.js';
import { BEDS, BED_ORDER, SPOTS, HERO_START, anchorOf } from './layout.js';

/**
 * Логика одного уровня без графики: грядки, лейка, корзинка, покупатели, жуки, Тиша и его дела.
 * Сцена каждый кадр вызывает update(dt) и рисует то, что видит в полях модели.
 *
 * Стадии грядки: locked, empty, grow (фазы 0 и 1, в каждой сначала нужен полив), bloom, wilted.
 * Предметы в корзинке: 'daisy' — цветок, 'b:daisy' — букет из трёх.
 *
 * События: 'bed' (i), 'money' (delta, x, y), 'basket', 'water', 'fail' (text, x, y),
 *          'work' (type, action), 'customer' (spot), 'leave' (spot, happy), 'pest' (pest),
 *          'shoo' (pest), 'wilt' (i), 'end' (won).
 */
export class LevelModel extends Emitter {
  /**
   * @param {object} def       описание уровня (levelDef)
   * @param {object} up        значения улучшений: can, basket, boots, soil, bell, scarecrow
   * @param {() => number} random
   */
  constructor(def, up, random = Math.random) {
    super();
    this.def = def;
    this.up = up;
    this.random = random;
    this.time = 0;
    this.money = def.startMoney;
    this.earned = 0;
    this.over = false;
    this.won = false;

    this.water = up.can;
    this.basket = [];

    const open = new Set(BED_ORDER.slice(0, def.beds));
    this.beds = BEDS.map((_, i) => ({
      stage: open.has(i) ? 'empty' : 'locked', kind: null, phase: 0, thirsty: false,
      left: 0, pest: null,
    }));

    this.customers = SPOTS.map(() => null);
    this._customerId = 0;
    this._nextCustomer = 1800;
    this._lastSkin = -1;

    this.pests = [];
    this._pestId = 0;
    this._nextPest = def.pests ? this._range(def.pestEvery) * 0.6 * up.scarecrow : Infinity;

    this.hero = { x: HERO_START.x, y: HERO_START.y, state: 'idle', action: null, left: 0, facing: 1 };
    this.queue = [];
    this._actionSeq = 0;
  }

  _range([a, b]) { return a + this.random() * (b - a); }

  get timeLeft() { return Math.max(0, this.def.timeMs - this.time); }

  /* ---------- назначение дел ---------- */

  /** Сколько семян уже «зарезервировано» делами в очереди. */
  _reservedMoney() {
    return this.queue.reduce((s, a) => s + (a.type === 'plant' ? FLOWERS[a.kind].seed : 0), 0);
  }

  /**
   * Поставить дело в очередь Тиши.
   * @returns {string|null} причина отказа или null
   */
  enqueue(action) {
    if (this.over) return 'Уровень закончен';
    const all = this.hero.action ? [this.hero.action, ...this.queue] : this.queue;
    if (this.queue.length >= RULES.maxQueue) return 'Тиша и так занят, подожди';
    if (action.type === 'plant') {
      const bed = this.beds[action.bed];
      if (bed.stage !== 'empty') return 'Грядка занята';
      if (all.some((a) => a.type === 'plant' && a.bed === action.bed)) return 'Уже сажаем';
      if (this.money - this._reservedMoney() < FLOWERS[action.kind].seed) return 'Не хватает монет на семена';
    }
    action.id = ++this._actionSeq;
    this.queue.push(action);
    return null;
  }

  /** Номер дела в очереди для подписи над целью (1 — текущее). */
  plannedActions() {
    return this.hero.action ? [this.hero.action, ...this.queue] : this.queue;
  }

  /** Прогнать жука нажатием (без похода). */
  shoo(pest) {
    if (this.over || pest.state === 'gone' || pest.state === 'flee') return false;
    pest.state = 'flee';
    if (pest.bed != null && this.beds[pest.bed].pest === pest) this.beds[pest.bed].pest = null;
    this._addMoney(RULES.shooReward, pest.x, pest.y);
    this.emit('shoo', pest);
    return true;
  }

  /* ---------- шаг времени ---------- */
  update(dt) {
    if (this.over) return;
    this.time += dt;
    this._updateBeds(dt);
    this._updateCustomers(dt);
    this._updatePests(dt);
    this._updateHero(dt);
    if (this.time >= this.def.timeMs && !this.over) this._finish(false);
  }

  _updateBeds(dt) {
    this.beds.forEach((b, i) => {
      if (b.stage === 'grow') {
        b.left -= dt;
        if (b.left > 0) return;
        if (b.thirsty) { this._wilt(i); return; }
        if (b.phase === 0) {
          b.phase = 1; b.thirsty = true; b.left = RULES.dryMs;
        } else {
          b.stage = 'bloom'; b.left = RULES.bloomMs;
        }
        this.emit('bed', i);
      } else if (b.stage === 'bloom') {
        b.left -= dt;
        if (b.left <= 0) this._wilt(i);
      }
    });
  }

  _wilt(i) {
    const b = this.beds[i];
    b.stage = 'wilted';
    b.thirsty = false;
    b.left = 0;
    this.emit('bed', i);
    this.emit('wilt', i);
  }

  /** Доля оставшегося времени текущей стадии (для полосок над грядкой). */
  bedProgress(i) {
    const b = this.beds[i];
    if (b.stage === 'bloom') return b.left / RULES.bloomMs;
    if (b.stage !== 'grow') return 0;
    if (b.thirsty) return b.left / RULES.dryMs;
    return 1 - b.left / (FLOWERS[b.kind].grow[b.phase] * this.up.soil);
  }

  _updateCustomers(dt) {
    this._nextCustomer -= dt;
    const free = this.customers.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (this._nextCustomer <= 0 && free.length) {
      const spot = free[Math.floor(this.random() * free.length)];
      this._spawnCustomer(spot);
      this._nextCustomer = this._range(this.def.customerEvery);
    }
    this.customers.forEach((c, spot) => {
      if (!c) return;
      if (c.arrive > 0) { c.arrive -= dt; return; }
      c.patience -= dt;
      if (c.patience <= 0) this._customerLeaves(spot, false);
    });
  }

  _spawnCustomer(spot) {
    const def = this.def;
    let skin = Math.floor(this.random() * CUSTOMERS.length);
    if (skin === this._lastSkin) skin = (skin + 1) % CUSTOMERS.length;
    this._lastSkin = skin;
    const count = 1 + Math.floor(this.random() * def.maxItems);
    const order = [];
    for (let k = 0; k < count; k++) {
      // дешёвые цветы просят чаще
      const w = def.flowers.map((_, j) => def.flowers.length - j * 0.6);
      let r = this.random() * w.reduce((a, b) => a + b, 0), j = 0;
      while (r > w[j]) r -= w[j++];
      const kind = def.flowers[Math.min(j, def.flowers.length - 1)];
      const bouquet = def.bouquets && k === 0 && this.random() < 0.3;
      order.push(bouquet ? 'b:' + kind : kind);
    }
    const patienceMs = (def.patienceMs + count * 5000) * this.up.bell;
    this.customers[spot] = {
      id: ++this._customerId, skin: CUSTOMERS[skin].skin, order, total: 0,
      patience: patienceMs, patienceMax: patienceMs, arrive: RULES.arriveMs,
    };
    this.emit('customer', spot);
  }

  _customerLeaves(spot, happy) {
    const c = this.customers[spot];
    this.customers[spot] = null;
    this.emit('leave', spot, happy, c);
  }

  _updatePests(dt) {
    this._nextPest -= dt;
    if (this._nextPest <= 0) {
      this._nextPest = this._range(this.def.pestEvery) * this.up.scarecrow;
      this._spawnPest();
    }
    const sec = dt / 1000;
    for (const p of this.pests) {
      if (p.state === 'fly') {
        const b = BEDS[p.bed], dx = b.x - p.x, dy = b.y - 6 - p.y, d = Math.hypot(dx, dy);
        const bed = this.beds[p.bed];
        if (!(bed.stage === 'grow' || bed.stage === 'bloom') || (bed.pest && bed.pest !== p)) {
          // цель пропала: ищем другую или улетаем
          const next = this._pestTarget();
          if (next == null) { p.state = 'flee'; continue; }
          p.bed = next;
          continue;
        }
        const step = RULES.pestSpeed * 2.4 * sec;
        if (d <= step) { p.x = b.x; p.y = b.y - 6; p.state = 'eat'; p.left = RULES.pestEatMs; bed.pest = p; }
        else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
        p.facing = dx >= 0 ? 1 : -1;
      } else if (p.state === 'eat') {
        const bed = this.beds[p.bed];
        if (!(bed.stage === 'grow' || bed.stage === 'bloom')) { bed.pest = null; p.state = 'flee'; continue; }
        p.left -= dt;
        if (p.left <= 0) { bed.pest = null; this._wilt(p.bed); p.state = 'flee'; }
      } else if (p.state === 'flee') {
        p.y -= 260 * sec;
        p.x += p.facing * 90 * sec;
        if (p.y < -60) p.state = 'gone';
      }
    }
    this.pests = this.pests.filter((p) => p.state !== 'gone');
  }

  _pestTarget() {
    const taken = new Set(this.pests.filter((p) => p.state === 'fly' || p.state === 'eat').map((p) => p.bed));
    const options = this.beds.map((b, i) => i).filter((i) => {
      const b = this.beds[i];
      return (b.stage === 'grow' || b.stage === 'bloom') && !b.pest && !taken.has(i);
    });
    if (!options.length) return null;
    return options[Math.floor(this.random() * options.length)];
  }

  _spawnPest() {
    const bed = this._pestTarget();
    if (bed == null) { this._nextPest = 3000; return; }
    const fromLeft = this.random() < 0.5;
    const p = {
      id: ++this._pestId, bed, state: 'fly', left: 0,
      x: fromLeft ? -30 : 420, y: 340 + this.random() * 300, facing: fromLeft ? 1 : -1,
    };
    this.pests.push(p);
    this.emit('pest', p);
  }

  /* ---------- Тиша ---------- */
  _updateHero(dt) {
    const h = this.hero;
    if (h.state === 'work') {
      h.left -= dt;
      if (h.left <= 0) { h.state = 'idle'; h.action = null; }
      else return;
    }
    if (h.state === 'idle') {
      if (!this.queue.length) return;
      h.action = this.queue.shift();
      h.state = 'walk';
    }
    if (h.state === 'walk') {
      const t = anchorOf(h.action);
      const dx = t.x - h.x, dy = t.y - h.y, d = Math.hypot(dx, dy);
      const step = this.up.boots * (dt / 1000);
      if (Math.abs(dx) > 1) h.facing = dx > 0 ? 1 : -1;
      if (d > step) { h.x += (dx / d) * step; h.y += (dy / d) * step; return; }
      h.x = t.x; h.y = t.y;
      this._perform(h.action);
    }
  }

  /** Тиша дошёл: выполнить дело или объяснить, почему нельзя. */
  _perform(a) {
    const h = this.hero;
    const fail = (text) => {
      h.state = 'work'; h.left = 250;
      const t = anchorOf(a);
      this.emit('fail', text, t.x, t.y - 70);
    };
    const work = () => {
      h.state = 'work';
      h.left = WORK_MS[a.type];
      this.emit('work', a.type, a);
    };
    const bed = a.bed != null ? this.beds[a.bed] : null;
    const label = anchorOf(a);

    switch (a.type) {
      case 'plant': {
        const cost = FLOWERS[a.kind].seed;
        if (bed.stage !== 'empty') return fail('Грядка занята');
        if (this.money < cost) return fail('Не хватает на семена');
        this._addMoney(-cost, label.x, label.y - 60);
        Object.assign(bed, { stage: 'grow', kind: a.kind, phase: 0, thirsty: true, left: RULES.dryMs });
        work();
        this.emit('bed', a.bed);
        return;
      }
      case 'water': {
        if (bed.stage !== 'grow' || !bed.thirsty) return fail(bed.stage === 'bloom' ? 'Уже цветёт, можно собирать' : 'Поливать не нужно');
        if (this.water <= 0) return fail('Лейка пуста! К колодцу');
        this.water--;
        bed.thirsty = false;
        bed.left = FLOWERS[bed.kind].grow[bed.phase] * this.up.soil;
        work();
        this.emit('water');
        this.emit('bed', a.bed);
        return;
      }
      case 'pick': {
        if (bed.stage !== 'bloom') return fail('Ещё не распустился');
        if (this.basket.length >= this.up.basket) return fail('Корзинка полна');
        this.basket.push(bed.kind);
        Object.assign(bed, { stage: 'empty', kind: null, left: 0 });
        if (bed.pest) { this.shoo(bed.pest); }
        work();
        this.emit('basket');
        this.emit('bed', a.bed);
        return;
      }
      case 'clear': {
        if (bed.stage !== 'wilted') return fail('Тут нечего убирать');
        Object.assign(bed, { stage: 'empty', kind: null, left: 0 });
        work();
        this.emit('bed', a.bed);
        return;
      }
      case 'well': {
        if (this.water >= this.up.can) return fail('Лейка полна');
        this.water = this.up.can;
        h.facing = -1; // колодец слева от Тиши
        work();
        this.emit('water');
        return;
      }
      case 'tie': {
        const kind = this._bouquetKind();
        if (!kind) return fail('Нужно три одинаковых цветка');
        for (let k = 0; k < BOUQUET_SIZE; k++) this.basket.splice(this.basket.indexOf(kind), 1);
        this.basket.push('b:' + kind);
        work();
        this.emit('basket');
        return;
      }
      case 'serve': {
        const c = this.customers[a.spot];
        if (!c) return fail('Покупатель ушёл');
        if (c.arrive > 0) return fail('Ещё подходит');
        let paid = 0;
        c.order = c.order.filter((item) => {
          const at = this.basket.indexOf(item);
          if (at < 0) return true;
          this.basket.splice(at, 1);
          paid += itemPrice(item);
          return false;
        });
        if (!paid) return fail('В корзинке нет того, что нужно');
        c.total += paid;
        let tip = 0;
        if (!c.order.length) tip = Math.round(c.total * RULES.tipShare * (c.patience / c.patienceMax));
        this._addMoney(paid + tip, SPOTS[a.spot].x, SPOTS[a.spot].y - 120);
        work();
        this.emit('basket');
        if (!c.order.length) this._customerLeaves(a.spot, true);
        else this.emit('customer', a.spot);
        return;
      }
    }
  }

  /** Из какого цветка вязать букет: сначала тот, что просят покупатели. */
  _bouquetKind() {
    const counts = {};
    for (const it of this.basket) if (!it.startsWith('b:')) counts[it] = (counts[it] || 0) + 1;
    const ready = Object.keys(counts).filter((k) => counts[k] >= BOUQUET_SIZE);
    if (!ready.length) return null;
    const wanted = ready.find((k) => this.customers.some((c) => c && c.order.includes('b:' + k)));
    return wanted || ready.sort((a, b) => FLOWERS[b].price - FLOWERS[a].price)[0];
  }

  _addMoney(delta, x, y) {
    this.money += delta;
    if (delta > 0) this.earned += delta;
    this.emit('money', delta, x, y);
    if (this.money >= this.def.goal && !this.over) this._finish(true);
  }

  _finish(won) {
    this.over = true;
    this.won = won;
    this.queue.length = 0;
    this.emit('end', won);
  }
}

/** Цена предмета из корзинки. */
export function itemPrice(item) {
  if (item.startsWith('b:')) return FLOWERS[item.slice(2)].price * BOUQUET_MULT;
  return FLOWERS[item].price;
}
