/**
 * Простые инструменты для синтеза: всё работает и в обычном, и в OfflineAudioContext.
 * Время — в секундах от начала рендера, громкость 0..1.
 */

/** Частота ноты по номеру MIDI (60 — до первой октавы). */
export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'C4', 'F#3', 'Bb5' → номер MIDI. */
export function note(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('Нота "' + name + '"');
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** Огибающая: быстрая атака, экспоненциальное затухание. */
export function envelope(param, t, { attack = 0.005, decay = 0.3, sustain = 0, hold = 0, release = 0.05, peak = 1 }) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  if (sustain > 0) {
    param.setTargetAtTime(peak * sustain, t + attack, decay / 3);
    param.setTargetAtTime(0.0001, t + attack + hold, release / 3);
  } else {
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
}

/**
 * Тон осциллятора.
 * @param {object} o  t, freq, to (конечная частота), slide (время скольжения), type,
 *                    vol, attack, decay, sustain, hold, release, detune, filter {type, freq, q}
 */
export function tone(ctx, out, o) {
  const t = o.t || 0;
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || o.decay || 0.2));
  if (o.detune) osc.detune.value = o.detune;
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = o.vibrato.rate || 5;
    depth.gain.value = o.vibrato.depth || 8;
    lfo.connect(depth).connect(osc.detune);
    lfo.start(t);
    lfo.stop(t + totalLength(o) + 0.05);
  }
  const g = ctx.createGain();
  envelope(g.gain, t, { ...o, peak: o.vol ?? 0.3 });
  let node = osc.connect(g);
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type || 'lowpass';
    f.frequency.setValueAtTime(o.filter.freq, t);
    if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + (o.filter.time || 0.3));
    f.Q.value = o.filter.q || 0.7;
    node = node.connect(f);
  }
  node.connect(out);
  osc.start(t);
  osc.stop(t + totalLength(o) + 0.05);
}

function totalLength(o) {
  return (o.attack || 0.005) + (o.sustain > 0 ? (o.hold || 0) + (o.release || 0.05) * 2 : (o.decay || 0.3));
}

const noiseCache = new WeakMap();
function noiseBuffer(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    d[i] = (seed / 4294967296) * 2 - 1;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

/** Шумовой удар (хэт, шорох, взрыв спор). filter: { type, freq, to, q, time } */
export function noise(ctx, out, o) {
  const t = o.t || 0;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = (o.filter && o.filter.type) || 'bandpass';
  f.frequency.setValueAtTime((o.filter && o.filter.freq) || 2000, t);
  if (o.filter && o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + (o.filter.time || o.decay || 0.2));
  f.Q.value = (o.filter && o.filter.q) || 1;
  const g = ctx.createGain();
  envelope(g.gain, t, { ...o, peak: o.vol ?? 0.3 });
  src.connect(f).connect(g).connect(out);
  src.start(t, (t * 0.37) % 0.5);
  src.stop(t + totalLength(o) + 0.05);
}

/** Реверберация из сгенерированного затухающего шума. */
export function reverb(ctx, seconds = 1.6, decay = 3, wet = 0.3) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, len, rate);
  let seed = 98765;
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const input = ctx.createGain();
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;
  const dry = ctx.createGain();
  dry.gain.value = 1;
  const output = ctx.createGain();
  input.connect(dry).connect(output);
  input.connect(conv).connect(wetGain).connect(output);
  return { input, output };
}

/** Общая шина с мягким ограничителем громкости и реверберацией. */
export function mixBus(ctx, out, { volume = 0.8, room = 0.25, roomSize = 1.6 } = {}) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = volume;
  const rv = reverb(ctx, roomSize, 3, room);
  rv.output.connect(comp).connect(master).connect(out);
  return rv.input;
}

/* ---------- инструменты ---------- */

/** Маримба / деревянный щипок. */
export function marimba(ctx, out, t, freq, vol = 0.25, len = 0.6) {
  tone(ctx, out, { t, freq, type: 'sine', vol, decay: len });
  tone(ctx, out, { t, freq: freq * 4, type: 'sine', vol: vol * 0.25, decay: len * 0.15 });
  tone(ctx, out, { t, freq: freq * 2, type: 'triangle', vol: vol * 0.15, decay: len * 0.3 });
}

/** Колокольчик: неровные обертоны. */
export function bell(ctx, out, t, freq, vol = 0.2, len = 1.2) {
  tone(ctx, out, { t, freq, type: 'sine', vol, decay: len });
  tone(ctx, out, { t, freq: freq * 2.76, type: 'sine', vol: vol * 0.4, decay: len * 0.5 });
  tone(ctx, out, { t, freq: freq * 5.4, type: 'sine', vol: vol * 0.2, decay: len * 0.25 });
}

/** Мягкий пэд из двух расстроенных пил через фильтр. */
export function pad(ctx, out, t, freq, dur, vol = 0.08, cutoff = 900) {
  for (const det of [-8, 8]) {
    tone(ctx, out, {
      t, freq, type: 'sawtooth', detune: det, vol, attack: Math.min(0.6, dur * 0.3),
      sustain: 0.9, hold: dur, release: 0.6, filter: { type: 'lowpass', freq: cutoff, q: 0.5 },
    });
  }
}

/** Флейта: синус с вибрато и лёгким дыханием. */
export function flute(ctx, out, t, freq, dur, vol = 0.12) {
  tone(ctx, out, { t, freq, type: 'sine', vol, attack: 0.06, sustain: 0.85, hold: dur, release: 0.25, vibrato: { rate: 5, depth: 10 } });
  tone(ctx, out, { t, freq: freq * 2, type: 'sine', vol: vol * 0.12, attack: 0.08, sustain: 0.8, hold: dur, release: 0.2 });
  noise(ctx, out, { t, vol: vol * 0.08, attack: 0.03, decay: 0.15, filter: { type: 'bandpass', freq: freq * 2, q: 2 } });
}

/** Бас. */
export function bass(ctx, out, t, freq, dur, vol = 0.22, type = 'triangle') {
  tone(ctx, out, { t, freq, type, vol, attack: 0.01, sustain: 0.7, hold: dur * 0.8, release: 0.08, filter: { type: 'lowpass', freq: 700 } });
}

/** Ведущий голос с плавной атакой. */
export function lead(ctx, out, t, freq, dur, vol = 0.1) {
  tone(ctx, out, { t, freq, type: 'square', vol, attack: 0.01, sustain: 0.6, hold: dur * 0.85, release: 0.06, filter: { type: 'lowpass', freq: 2400, q: 0.8 } });
  tone(ctx, out, { t, freq, type: 'triangle', detune: 7, vol: vol * 0.8, attack: 0.01, sustain: 0.6, hold: dur * 0.85, release: 0.06 });
}

/* ---------- ударные ---------- */
export function kick(ctx, out, t, vol = 0.5) {
  tone(ctx, out, { t, freq: 140, to: 45, slide: 0.12, type: 'sine', vol, decay: 0.3 });
}
export function snare(ctx, out, t, vol = 0.22) {
  noise(ctx, out, { t, vol, decay: 0.16, filter: { type: 'highpass', freq: 1500 } });
  tone(ctx, out, { t, freq: 200, to: 150, type: 'triangle', vol: vol * 0.6, decay: 0.08 });
}
export function hat(ctx, out, t, vol = 0.08, open = false) {
  noise(ctx, out, { t, vol, decay: open ? 0.18 : 0.04, filter: { type: 'highpass', freq: 7000 } });
}
export function shaker(ctx, out, t, vol = 0.05) {
  noise(ctx, out, { t, vol, attack: 0.01, decay: 0.07, filter: { type: 'bandpass', freq: 5000, q: 1.5 } });
}
