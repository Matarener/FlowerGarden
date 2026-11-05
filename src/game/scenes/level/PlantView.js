import { BEDS, BED_H } from '../../level/layout.js';

/**
 * Растение на одной грядке. Состояние живёт в модели (model.beds[i]);
 * вид каждый кадр сверяется с ним и меняет картинки только при смене стадии.
 */
export class PlantView {
  constructor(scene, i) {
    this.scene = scene;
    this.i = i;
    const { x, y } = BEDS[i];
    this.x = x;
    this.y = y;
    const ground = y + 14;
    this.plant = scene.sprite('plant_mound', x, ground).setDepth(y + 1).setVisible(false);
    this.thirst = scene.sprite('thirst', x + 32, y - 30).setDepth(y + 40).setVisible(false);
    this.glint = scene.sprite('glint', x + 10, y - 44).setDepth(y + 41).setVisible(false).setScale(0.5);
    const by = y + BED_H / 2 - 9;
    this.barBg = scene.sprite('bbar_bg', x - 29, by).setDepth(y + 30).setVisible(false);
    this.bar = scene.sprite('bbar_grow', x - 27, by).setDepth(y + 31).setVisible(false);
    this.sig = '';
    this.barW = -1;
    if (!scene.app.reduceMotion) {
      scene.tweens.add({ targets: this.thirst, y: y - 35, duration: 600, yoyo: true, repeat: -1, ease: 'sineInOut', delay: i * 90 });
      scene.tweens.add({ targets: this.glint, scale: 0.9, alpha: 0.3, rotation: Math.PI / 2, duration: 800, yoyo: true, repeat: -1, ease: 'sineInOut', delay: i * 130 });
    }
  }

  /** Короткий «прыжок» растения (посадили, полили). */
  pop() {
    if (this.scene.app.reduceMotion || !this.plant.visible) return;
    this.plant.scaleX = 1.15; this.plant.scaleY = 0.85;
    this.scene.tweens.add({ targets: this.plant, scaleX: 1, scaleY: 1, duration: 320, ease: 'backOut' });
  }

  sync(model) {
    const b = model.beds[this.i];
    const sig = b.stage + ':' + b.phase + ':' + b.thirsty + ':' + b.kind;
    if (sig !== this.sig) {
      this.sig = sig;
      this._enter(b);
    }
    if (this.bar.visible) {
      const w = Math.max(6, Math.round(54 * model.bedProgress(this.i)));
      if (w !== this.barW) { this.barW = w; this.bar.setCrop(w); }
    }
    // жук ест: растение дрожит
    if (b.pest && b.pest.state === 'eat') this.plant.rotation = Math.sin(model.time / 50) * 0.08;
    else if (this.plant.rotation) this.plant.rotation = 0;
  }

  _enter(b) {
    const p = this.plant;
    let key = null, bar = null;
    if (b.stage === 'grow') {
      key = b.phase === 0 ? (b.thirsty ? 'plant_mound' : 'plant_sprout') : 'plant_bud_' + b.kind;
      bar = b.thirsty ? 'bbar_dry' : 'bbar_grow';
    } else if (b.stage === 'bloom') { key = 'plant_bloom_' + b.kind; bar = 'bbar_bloom'; }
    else if (b.stage === 'wilted') key = 'plant_wilted';
    p.visible = !!key;
    if (key) p.setTexture(key);
    this.thirst.visible = b.stage === 'grow' && b.thirsty;
    this.glint.visible = b.stage === 'bloom';
    this.barBg.visible = this.bar.visible = !!bar;
    if (bar) this.bar.setTexture(bar);
    this.barW = -1;
    if (b.stage === 'bloom') {
      // цветок раскрывается
      p.scaleX = p.scaleY = 0.6;
      if (!this.scene.app.reduceMotion) this.scene.tweens.add({ targets: p, scaleX: 1, scaleY: 1, duration: 420, ease: 'backOut' });
      else p.scaleX = p.scaleY = 1;
    } else this.pop();
  }
}
