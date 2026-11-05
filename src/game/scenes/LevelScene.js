import { Scene } from '../../engine/index.js';
import { SkeletonSprite } from '../../skeleton/index.js';
import { CRITTER } from '../data/skeleton.js';
import { FLOWERS, LOCATIONS, levelDef } from '../data/content.js';
import { LevelModel } from '../level/LevelModel.js';
import { BEDS, BED_W, BED_H, SPOTS, WELL, TABLE, anchorOf } from '../level/layout.js';
import { gladeBackground } from '../art/gardenArt.js';
import { FLOWER_COLORS } from '../art/flowers.js';
import { PlantView } from './level/PlantView.js';
import { CustomerView } from './level/CustomerView.js';

const HERO_ANIM = { plant: 'bend', pick: 'bend', clear: 'bend', water: 'water', well: 'fill', tie: 'tie', serve: 'give' };
const SOIL = 0x6b4a30;
const WATER = 0x5cb0ff;

/**
 * Уровень: поляна с грядками и прилавком. Логика — в LevelModel, сцена только рисует
 * и переводит нажатия в дела для Тиши. Интерфейс уровня (цель, таймер, лейка, корзинка,
 * семена) — HTML в ui/levelUi.js, он слушает события модели.
 */
export class LevelScene extends Scene {
  create({ n }) {
    const app = this.app;
    this.n = n;
    this.def = levelDef(n);
    this.place = LOCATIONS[this.def.location].bg;
    this.model = new LevelModel(this.def, app.state.upgradeValues());
    this.selectedSeed = this.def.flowers[0];

    this.bg = this.sprite(gladeBackground(this.textures, this.engine.renderer, this.place), 0, 0).setStatic();
    BEDS.forEach((b, i) => {
      const locked = this.model.beds[i].stage === 'locked';
      this.sprite(locked ? 'bed_locked' : 'bed', b.x, b.y).setDepth(b.y - 50).setStatic();
    });
    this.sprite('well', WELL.x, WELL.y).setStatic();
    // верёвка, ведро и ручка ворота двигаются, поэтому не в статичном слое
    this.rope = this.sprite('rope', WELL.x, WELL.y - 36).setDepth(WELL.y + 1);
    this.bucket = this.sprite('bucket', WELL.x, WELL.y - 30).setDepth(WELL.y + 2);
    this.crank = this.sprite('crank', WELL.x + 38, WELL.y - 36).setDepth(WELL.y + 3);
    this._setRope(6);
    // подсказка над колодцем, когда лейка пуста
    this.wellHint = this.sprite('thirst', WELL.x, WELL.y - 38).setDepth(1900).setVisible(false);
    if (!app.reduceMotion) this.tweens.add({ targets: this.wellHint, y: WELL.y - 46, duration: 450, yoyo: true, repeat: -1, ease: 'sineInOut' });
    this.drops = Array.from({ length: 6 }, () => this.sprite('drop', 0, 0).setDepth(2000).setVisible(false).setScale(0.6));
    if (this.def.bouquets) this.sprite('table', TABLE.x, TABLE.y).setStatic();
    this.sprite('counter', 0, 240).setDepth(300);

    this.plants = BEDS.map((_, i) => new PlantView(this, i));
    this.customers = Array.from({ length: 5 }, () => new CustomerView(this));

    this.heroShadow = this.sprite('critter_shadow', 0, 0).setDepth(1);
    this.hero = this.add(new SkeletonSprite(this.textures, CRITTER, 'tisha', 0, 0));
    this.hero.play('idle');
    // струйка воды из носика лейки
    this.hero.on('event', (name) => {
      if (name === 'pour') this._pour();
      else if (name === 'fill') this._fillDrop();
    });

    this.pestViews = Array.from({ length: 5 }, () => ({ s: this.sprite('beetle_a', -100, -100).setDepth(900).setVisible(false), id: null }));
    this.badges = Array.from({ length: 6 }, (_, k) => this.sprite('q' + (k + 1), 0, 0).setDepth(950).setVisible(false));
    this.floats = Array.from({ length: 8 }, () => this.label('', { size: 15 }, 0, 0).setDepth(1000).setVisible(false));
    this.coins = Array.from({ length: 6 }, () => this.sprite('coin', 0, 0).setDepth(990).setVisible(false));

    this.fx = this.particles(140).setDepth(980);
    this.fx.prepare([SOIL, WATER, 0xfff3b0, 0xffc93a, ...Object.values(FLOWER_COLORS)]);
    if (!app.reduceMotion) {
      this.dust = this.fx.addEmitter({
        area: { x: -120, y: 300, w: 630, h: 500 }, every: 700, colors: [0xfff3b0, 0xffffff],
        life: [3000, 6000], speedX: [-6, 6], speedY: [-12, -4], scale: [0.35, 0.05], alpha: [0.8, 0],
      });
    }

    this._bindInput();
    this._bindModel();
    this.ended = false;
  }

  resize() {
    if (!this.bg) return;
    const key = gladeBackground(this.textures, this.engine.renderer, this.place);
    if (key !== this.bg.key) { this.bg.setTexture(key); this.invalidateStatic(); }
  }

  /* ---------- нажатия ---------- */
  _bindInput() {
    BEDS.forEach((b, i) => {
      if (this.model.beds[i].stage === 'locked') return;
      this.addZone(b.x, b.y - 8, BED_W + 8, BED_H + 30, () => this.onBed(i), () => this.plants[i].pop());
    });
    SPOTS.forEach((s, spot) => this.addZone(s.x, s.y - 70, 104, 150, () => this.onCustomer(spot)));
    this.addZone(WELL.x, WELL.y - 20, 100, 110, () => this.order({ type: 'well' }));
    if (this.def.bouquets) this.addZone(TABLE.x, TABLE.y - 10, 96, 90, () => this.order({ type: 'tie' }));
  }

  /** Жуков ловим по нажатию, а не по отпусканию: так быстрее. */
  handlePress(x, y) {
    for (const p of this.model.pests) {
      if ((p.state === 'fly' || p.state === 'eat') && Math.hypot(p.x - x, p.y - y) < 34) {
        this.model.shoo(p);
        this._pestTapped = true;
        return;
      }
    }
    this._pestTapped = false;
    super.handlePress(x, y);
  }

  handleTap(x, y) {
    if (this._pestTapped) { this._pestTapped = false; return; }
    super.handleTap(x, y);
  }

  /** Какой станет грядка после уже назначенных дел — от этого зависит, что сделать по нажатию. */
  _predicted(i) {
    const b = this.model.beds[i];
    let st = b.stage === 'grow' ? (b.thirsty ? 'thirsty' : 'growing') : b.stage;
    for (const a of this.model.pendingActions()) {
      if (a.bed !== i) continue;
      if (a.type === 'plant') st = 'thirsty';
      else if (a.type === 'water') st = 'growing';
      else if (a.type === 'pick' || a.type === 'clear') st = 'empty';
    }
    return st;
  }

  onBed(i) {
    const st = this._predicted(i);
    switch (st) {
      case 'empty': this.order({ type: 'plant', bed: i, kind: this.selectedSeed }); break;
      case 'thirsty': {
        // лейка опустеет раньше — сначала сходить к колодцу
        const m = this.model;
        const planned = m.pendingActions();
        let water = m.water;
        for (const a of planned) { if (a.type === 'well') water = m.up.can; else if (a.type === 'water') water--; }
        if (water <= 0) { if (!this.order({ type: 'well' }, true)) return; }
        this.order({ type: 'water', bed: i });
        break;
      }
      case 'bloom': this.order({ type: 'pick', bed: i }); break;
      case 'wilted': this.order({ type: 'clear', bed: i }); break;
      case 'growing': this.app.sfx('tap', { volume: 0.5 }); this.float('Растёт…', BEDS[i].x, BEDS[i].y - 50, '#fff4dc'); break;
    }
  }

  onCustomer(spot) {
    if (!this.model.customers[spot]) return;
    this.order({ type: 'serve', spot });
  }

  /** @returns {boolean} принято ли дело */
  order(action, quiet = false) {
    const why = this.model.enqueue(action);
    if (why) {
      this.app.sfx('error');
      this.app.toast(why);
      return false;
    }
    if (!quiet) this.app.sfx('tap');
    return true;
  }

  /* ---------- события модели ---------- */
  _bindModel() {
    const m = this.model, app = this.app;
    m.on('work', (type, a) => {
      this.hero.play(HERO_ANIM[type], { then: 'idle' });
      const t = a.bed != null ? BEDS[a.bed] : null;
      switch (type) {
        case 'plant': app.sfx('plant'); this.burst(t.x, t.y + 10, SOIL, 10); break;
        case 'water': app.sfx('water'); this.burst(t.x, t.y, WATER, 14, [240, 300]); break;
        case 'pick': app.sfx('pick'); this.burst(t.x, t.y - 30, FLOWER_COLORS[m.basket[m.basket.length - 1]] ?? 0xffffff, 14); break;
        case 'clear': app.sfx('plant', { rate: 0.8 }); this.burst(t.x, t.y + 6, SOIL, 12); break;
        case 'well': app.sfx('pump'); this._wellAnim(); break;
        case 'tie': app.sfx('tie'); break;
        case 'serve': app.sfx('serve'); break;
      }
    });
    m.on('fail', (text, x, y) => {
      app.sfx('error');
      this.hero.play('sad', { then: 'idle' });
      this.float(text, x, y, '#ffe0d0', 13);
    });
    m.on('money', (delta, x, y) => {
      this.float((delta > 0 ? '+' : '') + delta, x, y, delta > 0 ? '#ffe27a' : '#fff4dc');
      if (delta > 0) this.flyCoin(x, y);
    });
    m.on('customer', (spot) => {
      const c = m.customers[spot];
      if (!this.customers.some((v) => v.id === c.id)) {
        const v = this.customers.find((x) => x.free);
        if (v) v.arrive(c, spot);
        app.sfx('bell', { volume: 0.6 });
      }
    });
    m.on('leave', (spot, happy, c) => {
      const v = this.customers.find((x) => x.id === c.id);
      if (v) v.leave(happy);
      app.sfx(happy ? 'happy' : 'angry');
      if (!happy) app.toast('Покупатель не дождался');
    });
    m.on('pest', () => app.sfx('buzz', { volume: 0.7 }));
    m.on('shoo', (p) => { app.sfx('shoo'); this.burst(p.x, p.y, 0x8a3fa0, 10); });
    m.on('wilt', (i) => { app.sfx('wilt', { volume: 0.7 }); this.burst(BEDS[i].x, BEDS[i].y, 0x9a8a48, 8); });
    m.on('end', (won) => {
      this.ended = true;
      this.hero.play(won ? 'happy' : 'sad', { then: 'idle' });
      this.timers.delay(won ? 900 : 700, () => app.ui.level.showResult(won));
    });
  }

  /* ---------- эффекты ---------- */
  burst(x, y, color, count, angle) {
    if (this.app.reduceMotion) return;
    this.fx.burst(x, y, { color, count, ...(angle ? { angle } : {}) });
  }

  /** Длина верёвки от вала до дужки ведра. */
  _setRope(len) {
    this.ropeLen = len;
    this.rope.scaleY = len / 10;
    this.bucket.y = WELL.y - 36 + len;
  }

  /** Ворот крутится, ведро опускается в воду, поднимается полным и наклоняется над лейкой. */
  _wellAnim() {
    const T = this.tweens, b = this.bucket, rope = { len: this.ropeLen };
    const setLen = () => this._setRope(rope.len);
    T.killTweensOf(b); T.killTweensOf(this.crank);
    b.rotation = 0;
    b.setTexture('bucket');
    T.add({ targets: this.crank, rotation: this.crank.rotation + Math.PI * 6, duration: 700, ease: 'sineInOut' });
    T.add({
      targets: rope, len: 22, duration: 330, ease: 'quadIn', onUpdate: setLen,
      onComplete: () => {
        this.app.sfx('water', { volume: 0.5, rate: 0.8 });
        this.burst(WELL.x, WELL.y - 6, WATER, 10);
        b.setTexture('bucket_full');
        T.add({
          targets: rope, len: 6, duration: 370, ease: 'quadOut', onUpdate: setLen,
          onComplete: () => T.add({
            targets: b, rotation: 0.75, duration: 160, ease: 'quadOut',
            onComplete: () => this.timers.delay(380, () => {
              b.setTexture('bucket');
              T.add({ targets: b, rotation: 0, duration: 220, ease: 'backOut' });
            }),
          }),
        });
      },
    });
  }

  /** Капля летит из наклонённого ведра в лейку. Горлышко лейки — точка (LX, LY) в её рисунке. */
  _fillDrop() {
    const d = this.drops.find((s) => !s.visible);
    if (!d || this.app.reduceMotion) return;
    const h = this.hero, sk = h.skeleton, m = sk.world[sk.boneIndex.prop];
    const LX = 11, LY = 12;
    const tx = h.x + h.scaleX * (m.a * LX + m.c * LY + m.tx), ty = h.y + h.scaleY * (m.b * LX + m.d * LY + m.ty);
    const b = this.bucket;
    d.setPosition(b.x + 8, b.y + 8).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: d, x: tx, duration: 220, ease: 'linear' });
    this.tweens.add({
      targets: d, y: ty, duration: 220, ease: 'quadIn',
      onComplete: () => { d.visible = false; this.fx.burst(tx, ty, { color: WATER, count: 2, speed: [20, 40], life: [200, 300], scale: [0.5, 0.1] }); },
    });
  }

  /** Капли из носика: точка носика в рисунке лейки пересчитывается через кость prop. */
  _pour() {
    const h = this.hero, sk = h.skeleton;
    const m = sk.world[sk.boneIndex.prop];
    const k = 1; // масштаб картинки лейки
    const lx = 26 * k, ly = 3 * k;
    const x = h.x + h.scaleX * (m.a * lx + m.c * ly + m.tx);
    const y = h.y + h.scaleY * (m.b * lx + m.d * ly + m.ty);
    if (!this.app.reduceMotion) this.fx.burst(x, y, { color: WATER, count: 6, speed: [20, 60], angle: h.scaleX > 0 ? [40, 100] : [80, 140], life: [300, 500], gravity: 500, scale: [0.75, 0.25] });
  }

  float(text, x, y, color = '#fff4dc', size = 15) {
    const f = this.floats.find((l) => !l.visible) || this.floats[0];
    this.tweens.killTweensOf(f);
    f.setColor(color).setText(text).setPosition(Math.max(70, Math.min(320, x)), y).setAlpha(1).setVisible(true);
    f.scale = size / 15;
    this.tweens.add({ targets: f, y: y - 34, duration: 900, ease: 'quadOut' });
    this.tweens.add({ targets: f, alpha: 0, delay: 600, duration: 400, onComplete: () => { f.visible = false; } });
  }

  /** Монетка летит в счётчик цели наверху. */
  flyCoin(x, y) {
    const c = this.coins.find((s) => !s.visible);
    if (!c || this.app.reduceMotion) return;
    const target = this.app.hudPoint('#lv-goal');
    c.setPosition(x, y).setScale(1).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: c, x: target.x, y: target.y, scale: 0.6, duration: 650, ease: 'cubicIn',
      onComplete: () => { c.visible = false; this.app.sfx('coin', { volume: 0.6 }); },
    });
  }

  /* ---------- кадр ---------- */
  update(dt) {
    const m = this.model;
    m.update(dt);
    for (const p of this.plants) p.sync(m);
    m.customers.forEach((c) => { if (c) { const v = this.customers.find((x) => x.id === c.id); if (v) v.sync(c); } });
    for (const v of this.customers) v.body.depth = 262;

    // Тиша
    const h = m.hero, hero = this.hero;
    hero.x = h.x; hero.y = h.y; hero.depth = h.y;
    hero.scaleX = h.facing;
    this.heroShadow.setPosition(h.x, h.y);
    this.heroShadow.depth = h.y - 1;
    if (h.state === 'walk' && hero.animName !== 'walk') hero.play('walk');
    else if (h.state === 'idle' && hero.animName === 'walk') hero.play('idle');

    // пустая лейка: над колодцем прыгает капля, пока Тиша туда не идёт
    const goingToWell = m.plannedActions().some((a) => a.type === 'well');
    this.wellHint.visible = m.water === 0 && !goingToWell && !this.ended;

    this._syncPests(dt);
    this._syncBadges();
    this.app.ui.level.tick(m);
  }

  _syncPests(dt) {
    const m = this.model;
    const alive = new Set(m.pests.map((p) => p.id));
    for (const v of this.pestViews) if (v.id !== null && !alive.has(v.id)) { v.id = null; v.s.visible = false; }
    const wing = Math.floor(m.time / 70) % 2 ? 'beetle_b' : 'beetle_a';
    for (const p of m.pests) {
      let v = this.pestViews.find((x) => x.id === p.id);
      if (!v) { v = this.pestViews.find((x) => x.id === null); if (!v) continue; v.id = p.id; v.s.visible = true; }
      v.s.setPosition(p.x, p.y + (p.state === 'eat' ? Math.sin(m.time / 90) * 1.5 : 0));
      v.s.setTexture(p.state === 'eat' ? 'beetle_a' : wing);
      v.s.flipX = p.facing < 0;
      v.s.rotation = p.state === 'flee' ? -0.4 * p.facing : 0;
    }
  }

  /** Номера дел над целями, чтобы было видно, что Тиша сделает и в каком порядке. */
  _syncBadges() {
    const planned = this.model.plannedActions();
    const seen = new Map();
    this.badges.forEach((b, k) => {
      const a = planned[k];
      b.visible = !!a && !this.ended;
      if (!b.visible) return;
      const t = anchorOf(a);
      const key = t.x + ':' + t.y;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      b.setPosition(t.x + 22 + n * 16, t.y - 24);
    });
  }
}
