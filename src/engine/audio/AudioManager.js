/**
 * Звук без файлов: каждый звук и трек описывается функцией, которая строит граф Web Audio.
 * Описание один раз «рендерится» в буфер через OfflineAudioContext, дальше звучит готовый буфер:
 * во время игры процессор не тратится на синтез.
 *
 *   audio.define('click', { duration: 0.2, render: (ctx, out) => tone(ctx, out, {...}) });
 *   audio.play('click');
 *   audio.playMusic('farm');
 *
 * Браузеры разрешают звук только после действия пользователя, поэтому AudioContext
 * создаётся и запускается по первому нажатию (unlockOnGesture).
 */
const MUSIC_FADE = 1.2; // с, плавный переход между треками

/** Привести пик громкости к заданному уровню: звуки разной сложности звучат ровно. */
function normalize(buffer, peak) {
  let max = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > max) max = v; }
  }
  if (max < 1e-5) return;
  const k = peak / max;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
}

/** Обрезать буфер до length сэмплов, прибавив отрезанный хвост к началу (бесшовная петля). */
function foldTail(src, length) {
  const out = new AudioBuffer({ length, numberOfChannels: src.numberOfChannels, sampleRate: src.sampleRate });
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const from = src.getChannelData(ch), to = out.getChannelData(ch);
    to.set(from.subarray(0, length));
    for (let i = length; i < from.length; i++) to[i - length] += from[i];
  }
  return out;
}

export class AudioManager {
  constructor() {
    this.ctx = null;
    this._defs = new Map();
    this._buffers = new Map();
    this._rendering = new Map();
    this.musicVolume = 0.6;
    this.sfxVolume = 0.8;
    this._musicName = null;
    this._musicNode = null;
    this._wantedMusic = null;
    this._lastPlay = new Map();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  get supported() {
    return !!(window.AudioContext || window.webkitAudioContext) && !!window.OfflineAudioContext;
  }

  /** Создать контекст по первому нажатию или клавише. */
  unlockOnGesture() {
    const unlock = () => {
      this._ensureContext();
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  _ensureContext() {
    if (this.ctx || !this.supported) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.sfxBus.gain.value = this.sfxVolume;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    if (this._wantedMusic) this.playMusic(this._wantedMusic);
  }

  /**
   * @param {string} name
   * @param {object} def
   * @param {number} def.duration        длина в секундах (для музыки — длина петли)
   * @param {(ctx: BaseAudioContext, out: AudioNode) => void} def.render  строит граф звука
   * @param {boolean} [def.loop]         музыкальная петля: хвост переносится в начало
   * @param {number} [def.sampleRate]    по умолчанию 44100
   * @param {number} [def.channels]      по умолчанию 1 (моно, вдвое меньше памяти)
   * @param {number} [def.peak]          громкость пика после рендера, по умолчанию 0.7
   */
  define(name, def) {
    this._defs.set(name, def);
    return this;
  }

  /** Подготовить буфер заранее (рендер идёт в фоне, игра не ждёт). */
  load(name) {
    if (this._buffers.has(name)) return Promise.resolve(this._buffers.get(name));
    if (this._rendering.has(name)) return this._rendering.get(name);
    const def = this._defs.get(name);
    if (!def || !this.supported) return Promise.resolve(null);
    const rate = def.sampleRate || 44100;
    const channels = def.channels || 1;
    // у зацикленной музыки хвост реверберации переносится в начало: на стыке нет щелчка и обрыва
    const tail = def.loop ? def.tail ?? 2 : 0;
    const off = new OfflineAudioContext(channels, Math.ceil((def.duration + tail) * rate), rate);
    def.render(off, off.destination);
    const p = off.startRendering().then((rendered) => {
      const buffer = tail ? foldTail(rendered, Math.ceil(def.duration * rate)) : rendered;
      normalize(buffer, def.peak ?? 0.7);
      this._buffers.set(name, buffer);
      this._rendering.delete(name);
      return buffer;
    }).catch(() => null);
    this._rendering.set(name, p);
    return p;
  }

  /** Подготовить несколько буферов по очереди, чтобы не нагружать устройство разом. */
  async preload(names) {
    for (const n of names) await this.load(n);
  }

  /**
   * Проиграть звук. Если буфер ещё не готов, звук пропускается (и начинает готовиться).
   * @param {object} [o]  volume 0..1, rate — скорость (высота), throttle — не чаще раза в N мс
   */
  play(name, { volume = 1, rate = 1, throttle = 30 } = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.sfxVolume <= 0) return;
    const now = performance.now();
    if (now - (this._lastPlay.get(name) || 0) < throttle) return;
    const buffer = this._buffers.get(name);
    if (!buffer) { this.load(name); return; }
    this._lastPlay.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    let node = src;
    if (volume !== 1) {
      const g = this.ctx.createGain();
      g.gain.value = volume;
      src.connect(g);
      node = g;
    }
    node.connect(this.sfxBus);
    src.start();
  }

  /** Включить фоновый трек по кругу с плавным переходом. */
  playMusic(name) {
    this._wantedMusic = name;
    if (!this.ctx) return;
    if (this._musicName === name && this._musicNode) return;
    this.load(name).then((buffer) => {
      if (!buffer || this._wantedMusic !== name || this._musicName === name) return;
      const t = this.ctx.currentTime;
      if (this._musicNode) {
        const old = this._musicNode;
        old.gain.gain.cancelScheduledValues(t);
        old.gain.gain.setValueAtTime(old.gain.gain.value, t);
        old.gain.gain.linearRampToValueAtTime(0, t + MUSIC_FADE);
        old.src.stop(t + MUSIC_FADE + 0.05);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + MUSIC_FADE);
      src.connect(gain).connect(this.musicBus);
      src.start(t);
      this._musicNode = { src, gain };
      this._musicName = name;
    });
  }

  stopMusic() {
    this._wantedMusic = null;
    if (!this._musicNode || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._musicNode.gain.gain.linearRampToValueAtTime(0, t + MUSIC_FADE);
    this._musicNode.src.stop(t + MUSIC_FADE + 0.05);
    this._musicNode = null;
    this._musicName = null;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
}
