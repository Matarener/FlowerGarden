import { SkeletonSprite } from '../../../skeleton/index.js';
import { CRITTER } from '../../data/skeleton.js';
import { SPOTS } from '../../level/layout.js';
import { itemIconKey } from '../../art/flowers.js';

/**
 * Покупатель у прилавка: зверёк, облачко с заказом и полоска терпения.
 * Видов несколько: пока один уходит, на его место уже может прийти другой.
 */
export class CustomerView {
  constructor(scene) {
    this.scene = scene;
    this.id = null;
    this.spot = -1;
    this.leaving = false;
    this.body = scene.add(new SkeletonSprite(scene.textures, CRITTER, 'bunny', -100, SPOTS[0].y)).setDepth(262).setVisible(false);
    this.body.scale = 0.95;
    this.bubble = scene.sprite('bubble', 0, 0).setDepth(320).setVisible(false);
    this.icons = [0, 1, 2].map(() => scene.sprite('fl_daisy', 0, 0).setDepth(321).setVisible(false).setScale(0.8));
    this.pbg = scene.sprite('pbar_bg', 0, 0).setDepth(321).setVisible(false);
    this.pbar = scene.sprite('pbar_good', 0, 0).setDepth(322).setVisible(false);
    this.orderSig = '';
    this.mood = '';
    this.barW = -1;
  }

  get free() { return this.id === null && !this.leaving; }

  /** Покупатель пришёл: подходит сбоку к своему месту. */
  arrive(c, spot) {
    this.id = c.id;
    this.spot = spot;
    this.leaving = false;
    const s = SPOTS[spot];
    const fromLeft = spot === 0 || (spot === 1 && Math.random() < 0.5);
    const b = this.body;
    b.setSkin(c.skin).setVisible(true);
    b.alpha = 1;
    b.x = fromLeft ? -50 : 440;
    b.y = s.y;
    b.scaleX = fromLeft ? 0.95 : -0.95;
    b.play('walk');
    this.scene.tweens.add({
      targets: b, x: s.x, duration: 1050, ease: 'quadOut',
      onComplete: () => { if (this.id === c.id) { b.play('idle'); this.mood = 'idle'; } },
    });
    this.orderSig = '';
    this.mood = 'walk';
    this._place(s);
  }

  _place(s) {
    const by = s.y - 150;
    this.bubble.setPosition(s.x, by);
    this.icons.forEach((ic, k) => ic.setPosition(s.x, by - 6));
    this.pbg.setPosition(s.x - 32, by + 14);
    this.pbar.setPosition(s.x - 30, by + 14);
  }

  /** Покупатель уходит: радостно (заказ собран) или обиженно. */
  leave(happy) {
    if (this.id === null) return;
    this.id = null;
    this.leaving = true;
    this._showOrder(false);
    const b = this.body;
    this.scene.tweens.killTweensOf(b);
    b.play(happy ? 'happy' : 'sad');
    const toRight = this.spot !== 0;
    this.scene.timers.delay(happy ? 650 : 750, () => {
      b.scaleX = toRight ? 0.95 : -0.95;
      b.play('walk');
      this.scene.tweens.add({
        targets: b, x: toRight ? 450 : -60, alpha: 0.6, duration: 1100, ease: 'quadIn',
        onComplete: () => { b.visible = false; this.leaving = false; },
      });
    });
  }

  _showOrder(v) {
    this.bubble.visible = this.pbg.visible = this.pbar.visible = v;
    if (!v) for (const ic of this.icons) ic.visible = false;
  }

  sync(c) {
    if (!c || c.id !== this.id) return;
    const ready = c.arrive <= 0;
    if (ready !== this.bubble.visible) this._showOrder(ready);
    if (!ready) return;
    const sig = c.order.join(',');
    if (sig !== this.orderSig) {
      this.orderSig = sig;
      const x = SPOTS[this.spot].x, n = c.order.length;
      this.icons.forEach((ic, k) => {
        ic.visible = k < n;
        if (k < n) ic.setTexture(itemIconKey(c.order[k])).setPosition(x + (k - (n - 1) / 2) * 30, ic.y);
      });
      // заказ уменьшился: облачко подпрыгивает
      if (!this.scene.app.reduceMotion) {
        this.bubble.scale = 1.12;
        this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 260, ease: 'backOut' });
      }
    }
    const k = c.patience / c.patienceMax;
    const w = Math.max(4, Math.round(60 * k));
    if (w !== this.barW) {
      this.barW = w;
      this.pbar.setTexture(k > 0.5 ? 'pbar_good' : k > 0.25 ? 'pbar_mid' : 'pbar_bad').setCrop(w);
    }
    const mood = k < 0.25 ? 'impatient' : 'idle';
    if (mood !== this.mood && this.mood !== 'walk') { this.mood = mood; this.body.play(mood); }
  }
}
