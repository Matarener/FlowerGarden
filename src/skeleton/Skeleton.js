import { Emitter } from '../engine/Emitter.js';

/**
 * Скелетная анимация без привязки к движку: только данные и математика.
 * Отрисовкой занимается SkeletonSprite.
 *
 * Формат данных (см. game/data/skeleton.js):
 *  bones       — дерево костей с позой покоя;
 *  slots       — какая картинка висит на какой кости, порядок = порядок отрисовки;
 *  attachments — точка привязки картинок (origin 0..1) и масштаб;
 *  skins       — подмена имён картинок на текстуры конкретного персонажа;
 *  animations  — дорожки ключевых кадров для костей, смена картинок в слотах, события.
 *
 * Ключевой кадр: [время, смещение от позы покоя, плавность отрезка, ведущего в этот ключ].
 *
 * События: 'event' (name, value) с таймлайна анимации, 'complete' (animName) в конце не циклической.
 */

const EASE = {
  linear: (p) => p,
  in: (p) => p * p,
  out: (p) => 1 - (1 - p) * (1 - p),
  inOut: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  back: (p) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  stepped: () => 0,
};
const PROPS = ['x', 'y', 'rotation', 'scaleX', 'scaleY'];
const DEG = Math.PI / 180;
const DEFAULT_MIX = 0.12;

function sampleTrack(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b[0]) {
      const p = (t - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * (EASE[b[2]] || EASE.linear)(p);
    }
  }
  return last[1];
}

/** Для смены картинок: последний ключ, время которого уже наступило. */
function sampleStep(keys, t) {
  let v = null;
  for (const k of keys) {
    if (k[0] > t) break;
    v = k[1];
  }
  return v;
}

export class Skeleton extends Emitter {
  constructor(data, skin) {
    super();
    this.data = data;
    this.skin = skin || Object.keys(data.skins || {})[0] || null;
    this.timeScale = 1;

    this.bones = data.bones.map((b) => ({
      name: b.name,
      parent: b.parent != null ? data.bones.findIndex((p) => p.name === b.parent) : -1,
      setup: {
        x: b.x || 0, y: b.y || 0, rotation: b.rotation || 0,
        scaleX: b.scaleX ?? 1, scaleY: b.scaleY ?? 1,
      },
    }));
    this.bones.forEach((b, i) => {
      if (b.parent >= i) throw new Error('Кость "' + b.name + '" должна идти после своего родителя');
    });
    this.boneIndex = Object.fromEntries(this.bones.map((b, i) => [b.name, i]));
    this.pose = this.bones.map((b) => ({ ...b.setup }));
    /** Мировые матрицы костей относительно корня скелета: x' = a·x + c·y + tx. */
    this.world = this.bones.map(() => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }));

    this.slots = data.slots.map((s) => ({
      name: s.name,
      bone: this.boneIndex[s.bone],
      setupAttachment: s.attachment || null,
      attachment: s.attachment || null,
    }));
    this.slotIndex = Object.fromEntries(this.slots.map((s, i) => [s.name, i]));

    this.anim = null;
    this.animName = null;
    this.time = 0;
    this.loop = false;
    this.queued = null;
    this.finished = false;
    this._mixFrom = null;
    this._mixTime = 0;
    this._mixDuration = 0;

    this.computeWorld();
  }

  /* ---------- скины и картинки ---------- */

  /** Имя текстуры для картинки слота с учётом скина. */
  resolveTexture(attachment) {
    const skin = (this.data.skins || {})[this.skin] || {};
    return skin[attachment] || attachment;
  }

  setSkin(name) {
    this.skin = name;
    return this;
  }

  setAttachment(slotName, attachment) {
    const i = this.slotIndex[slotName];
    if (i != null) this.slots[i].attachment = attachment;
    return this;
  }

  /* ---------- воспроизведение ---------- */

  /**
   * @param {string} name
   * @param {object} [opts]  loop — переопределить цикличность, then — что играть после,
   *                         mix — длительность плавного перехода в секундах
   */
  play(name, opts = {}) {
    const anim = this.data.animations[name];
    if (!anim) throw new Error('Нет анимации "' + name + '"');
    this._mixFrom = this.pose.map((p) => ({ ...p }));
    this._mixTime = 0;
    this._mixDuration = opts.mix ?? this.data.mix ?? DEFAULT_MIX;

    this.anim = anim;
    this.animName = name;
    this.time = 0;
    this.loop = opts.loop ?? !!anim.loop;
    this.queued = opts.then || null;
    this.finished = false;

    for (const s of this.slots) s.attachment = s.setupAttachment;
    this._applySlots(0);
    this._fireEvents(-1, 0);
    return this;
  }

  /** Продвинуть анимацию на dt секунд. */
  update(dt) {
    const anim = this.anim;
    if (!anim) return;
    const step = dt * this.timeScale;
    const dur = anim.duration;
    const prev = this.time;
    let t = prev + step;
    let completed = false;
    if (this._mixFrom) this._mixTime += step;

    if (t >= dur) {
      this._fireEvents(prev, dur);
      if (this.anim !== anim) return; // обработчик события запустил другую анимацию
      if (this.loop) {
        t = dur > 0 ? t % dur : 0;
        this._fireEvents(-1, t);
        if (this.anim !== anim) return;
      } else {
        t = dur;
        if (!this.finished) { this.finished = true; completed = true; }
      }
    } else {
      this._fireEvents(prev, t);
      if (this.anim !== anim) return;
    }

    this.time = t;
    this._computePose(t);
    this._applySlots(t);
    this.computeWorld();

    if (completed) {
      const name = this.animName;
      if (this.queued) this.play(this.queued);
      this.emit('complete', name);
    }
  }

  _fireEvents(from, to) {
    const events = this.anim && this.anim.events;
    if (!events) return;
    for (const ev of events) if (ev[0] > from && ev[0] <= to) this.emit('event', ev[1], ev[2]);
  }

  _computePose(t) {
    const tracks = this.anim.bones || {};
    for (let i = 0; i < this.bones.length; i++) {
      const tr = tracks[this.bones[i].name];
      const s = this.bones[i].setup;
      const p = this.pose[i];
      if (!tr) {
        p.x = s.x; p.y = s.y; p.rotation = s.rotation; p.scaleX = s.scaleX; p.scaleY = s.scaleY;
        continue;
      }
      p.x = s.x + (tr.x ? sampleTrack(tr.x, t) : 0);
      p.y = s.y + (tr.y ? sampleTrack(tr.y, t) : 0);
      p.rotation = s.rotation + (tr.rotation ? sampleTrack(tr.rotation, t) : 0);
      p.scaleX = s.scaleX * (tr.scaleX ? sampleTrack(tr.scaleX, t) : 1);
      p.scaleY = s.scaleY * (tr.scaleY ? sampleTrack(tr.scaleY, t) : 1);
    }

    // плавный переход от прошлой позы
    if (!this._mixFrom) return;
    const k = this._mixDuration > 0 ? Math.min(1, this._mixTime / this._mixDuration) : 1;
    if (k >= 1) { this._mixFrom = null; return; }
    const e = EASE.inOut(k);
    for (let i = 0; i < this.pose.length; i++) {
      const p = this.pose[i], f = this._mixFrom[i];
      for (const prop of PROPS) p[prop] = f[prop] + (p[prop] - f[prop]) * e;
    }
  }

  _applySlots(t) {
    const tracks = (this.anim && this.anim.slots) || {};
    for (const name in tracks) {
      const i = this.slotIndex[name];
      if (i == null) continue;
      const v = sampleStep(tracks[name], t);
      if (v !== null) this.slots[i].attachment = v;
    }
  }

  /** Пересчитать мировые матрицы костей из текущей позы. */
  computeWorld() {
    for (let i = 0; i < this.bones.length; i++) {
      const p = this.pose[i];
      const r = p.rotation * DEG;
      const cos = Math.cos(r), sin = Math.sin(r);
      const la = cos * p.scaleX, lb = sin * p.scaleX;
      const lc = -sin * p.scaleY, ld = cos * p.scaleY;
      const w = this.world[i];
      const parent = this.bones[i].parent;
      if (parent < 0) {
        w.a = la; w.b = lb; w.c = lc; w.d = ld; w.tx = p.x; w.ty = p.y;
      } else {
        const P = this.world[parent];
        w.a = P.a * la + P.c * lb;
        w.b = P.b * la + P.d * lb;
        w.c = P.a * lc + P.c * ld;
        w.d = P.b * lc + P.d * ld;
        w.tx = P.a * p.x + P.c * p.y + P.tx;
        w.ty = P.b * p.x + P.d * p.y + P.ty;
      }
    }
  }

  getBonePose(name) {
    return this.pose[this.boneIndex[name]];
  }
}
