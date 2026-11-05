import { Scene } from '../../engine/index.js';
import { SkeletonSprite } from '../../skeleton/index.js';
import { CRITTER } from '../data/skeleton.js';
import { gladeBackground } from '../art/gardenArt.js';
import { BEDS } from '../level/layout.js';

/**
 * Титульный экран: поляна с цветущими грядками, Тиша бегает с лейкой,
 * у прилавка ждут покупатели. Всё крутится само, без логики уровня.
 */
const BLOOM = ['daisy', 'tulip', 'rose', 'cornflower', 'sunflower', 'daisy', 'tulip', 'rose', 'cornflower'];
const STOPS = [[195, 455, 'water'], [80, 563, 'bend'], [310, 455, 'water'], [195, 671, 'pump']];

export class TitleScene extends Scene {
  create() {
    this.bg = this.sprite(gladeBackground(this.textures, this.engine.renderer, 'home'), 0, 0).setStatic();
    BEDS.forEach((b, i) => {
      this.sprite('bed', b.x, b.y).setStatic();
      const p = this.sprite('plant_bloom_' + BLOOM[i], b.x, b.y + 14).setDepth(b.y + 1);
      if (!this.app.reduceMotion) this.tweens.add({ targets: p, rotation: 0.06, duration: 1300 + i * 70, yoyo: true, repeat: -1, ease: 'sineInOut', delay: i * 120 });
    });
    this.sprite('counter', 0, 240).setDepth(300);
    ['bunny', 'bear', 'fox'].forEach((skin, k) => {
      const c = this.add(new SkeletonSprite(this.textures, CRITTER, skin, 82 + k * 113, 262)).setDepth(262);
      c.scale = 0.95;
      c.play(k === 1 ? 'happy' : 'idle');
      c.time = k * 0.5;
      if (k === 1) c.on('complete', () => this.timers.delay(1400, () => c.play('happy')));
    });

    this.heroShadow = this.sprite('critter_shadow', 195, 735);
    this.hero = this.add(new SkeletonSprite(this.textures, CRITTER, 'tisha', 195, 735));
    this.hero.play('idle');
    this.stop = 0;
    this.timers.delay(1200, () => this._next());
  }

  resize() {
    if (!this.bg) return;
    const key = gladeBackground(this.textures, this.engine.renderer, 'home');
    if (key !== this.bg.key) { this.bg.setTexture(key); this.invalidateStatic(); }
  }

  /** Тиша идёт к следующей грядке и что-нибудь делает. */
  _next() {
    const [x, y, anim] = STOPS[this.stop++ % STOPS.length];
    const h = this.hero;
    h.scaleX = x >= h.x ? 1 : -1;
    h.play('walk');
    const d = Math.hypot(x - h.x, y - h.y);
    this.tweens.add({
      targets: h, x, y, duration: (d / 170) * 1000, ease: 'linear',
      onComplete: () => {
        h.play(anim, { then: 'idle' });
        this.timers.delay(1600, () => this._next());
      },
    });
  }

  update() {
    this.hero.depth = this.hero.y;
    this.heroShadow.setPosition(this.hero.x, this.hero.y);
    this.heroShadow.depth = this.hero.y - 1;
  }
}
