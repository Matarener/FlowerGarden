import { tone, noise, bell, marimba, mixBus, note, midi } from '../../engine/audio/synth.js';

/**
 * Звуки действий. Каждый — короткая функция синтеза, отрендеренная один раз в буфер.
 * В игре: app.sfx('pick').
 */
const n = (name) => midi(note(name));

/** Общая шина с лёгкой реверберацией. */
const sfx = (duration, render, room = 0.18, peak = 0.7) => ({
  duration,
  peak,
  render: (ctx, out) => render(ctx, mixBus(ctx, out, { volume: 0.9, room, roomSize: 0.9 })),
});

export const SOUNDS = {
  tap: sfx(0.15, (c, o) => marimba(c, o, 0, n('A5'), 0.22, 0.12), 0.05, 0.4),
  open: sfx(0.25, (c, o) => tone(c, o, { freq: 520, to: 820, slide: 0.08, type: 'sine', vol: 0.18, decay: 0.16 }), 0.1, 0.35),
  error: sfx(0.35, (c, o) => {
    tone(c, o, { t: 0, freq: n('E4'), type: 'triangle', vol: 0.2, decay: 0.12 });
    tone(c, o, { t: 0.1, freq: n('C4'), type: 'triangle', vol: 0.2, decay: 0.2 });
  }, 0.05, 0.45),

  /** Посадка: глухой удар по земле. */
  plant: sfx(0.5, (c, o) => {
    tone(c, o, { freq: 160, to: 70, slide: 0.15, type: 'sine', vol: 0.4, decay: 0.25 });
    noise(c, o, { vol: 0.2, decay: 0.25, filter: { type: 'lowpass', freq: 1200, to: 300 } });
    marimba(c, o, 0.08, n('G4'), 0.12, 0.3);
  }),

  /** Полив: журчание. */
  water: sfx(0.8, (c, o) => {
    noise(c, o, { vol: 0.16, attack: 0.05, sustain: 0.8, hold: 0.35, release: 0.2, filter: { type: 'bandpass', freq: 2200, q: 0.8 } });
    [0.05, 0.18, 0.3, 0.42].forEach((t, i) => tone(c, o, { t, freq: 700 + i * 140, to: 1300 + i * 160, slide: 0.05, type: 'sine', vol: 0.07, decay: 0.08 }));
  }, 0.2),

  /** Колодец: скрип ворота и плеск. */
  pump: sfx(1.1, (c, o) => {
    [0, 0.3, 0.6].forEach((t) => tone(c, o, { t, freq: 300, to: 220, slide: 0.15, type: 'sawtooth', vol: 0.05, decay: 0.18, filter: { type: 'bandpass', freq: 900, q: 3 } }));
    noise(c, o, { t: 0.7, vol: 0.2, attack: 0.02, decay: 0.35, filter: { type: 'bandpass', freq: 1400, to: 500, q: 1 } });
    tone(c, o, { t: 0.72, freq: 500, to: 260, slide: 0.12, type: 'sine', vol: 0.18, decay: 0.2 });
  }, 0.25),

  /** Сорвать цветок: «чпок» и колокольчик. */
  pick: sfx(0.7, (c, o) => {
    tone(c, o, { freq: 600, to: 1200, slide: 0.05, type: 'sine', vol: 0.22, decay: 0.08 });
    bell(c, o, 0.05, n('E6'), 0.1, 0.4);
    bell(c, o, 0.11, n('A6'), 0.08, 0.4);
  }, 0.25),

  tie: sfx(0.9, (c, o) => {
    [0, 0.12, 0.24, 0.36].forEach((t) => noise(c, o, { t, vol: 0.09, decay: 0.07, filter: { type: 'bandpass', freq: 3500, q: 2 } }));
    ['C6', 'E6', 'G6'].forEach((x, i) => bell(c, o, 0.45 + i * 0.07, n(x), 0.08, 0.5));
  }, 0.25),

  /** Отдать заказ: монетки. */
  serve: sfx(0.8, (c, o) => {
    ['E6', 'G6', 'C7'].forEach((x, i) => bell(c, o, i * 0.06, n(x), 0.11, 0.35));
    noise(c, o, { t: 0.02, vol: 0.05, attack: 0.01, decay: 0.3, filter: { type: 'highpass', freq: 6000 } });
  }, 0.25),

  coin: sfx(0.4, (c, o) => { bell(c, o, 0, n('B6'), 0.1, 0.25); bell(c, o, 0.05, n('E7'), 0.07, 0.25); }, 0.15, 0.4),

  /** Колокольчик над прилавком: пришёл покупатель. */
  bell: sfx(1.0, (c, o) => { bell(c, o, 0, n('G5'), 0.12, 0.8); bell(c, o, 0.14, n('E5'), 0.1, 0.8); }, 0.3, 0.5),

  happy: sfx(0.7, (c, o) => ['C5', 'E5', 'G5'].forEach((x, i) => marimba(c, o, i * 0.07, n(x), 0.16, 0.3)), 0.2, 0.5),
  angry: sfx(0.6, (c, o) => {
    tone(c, o, { freq: n('A3'), to: n('E3'), slide: 0.3, type: 'triangle', vol: 0.2, decay: 0.4 });
    tone(c, o, { t: 0.05, freq: n('C4'), to: n('G3'), slide: 0.3, type: 'square', vol: 0.04, decay: 0.35, filter: { type: 'lowpass', freq: 1200 } });
  }, 0.1, 0.5),

  /** Жук прилетел: жужжание. */
  buzz: sfx(0.7, (c, o) => {
    tone(c, o, { freq: 190, type: 'sawtooth', vol: 0.08, attack: 0.05, sustain: 0.8, hold: 0.4, release: 0.15, vibrato: { rate: 28, depth: 60 }, filter: { type: 'bandpass', freq: 900, q: 1.5 } });
  }, 0.05, 0.45),
  shoo: sfx(0.4, (c, o) => {
    noise(c, o, { vol: 0.16, attack: 0.01, decay: 0.15, filter: { type: 'bandpass', freq: 1200, to: 3800, q: 1.2, time: 0.15 } });
    tone(c, o, { freq: 400, to: 900, slide: 0.12, type: 'sine', vol: 0.12, decay: 0.15 });
  }, 0.1, 0.5),
  wilt: sfx(0.7, (c, o) => tone(c, o, { freq: n('G4'), to: n('C4'), slide: 0.5, type: 'triangle', vol: 0.16, decay: 0.55 }), 0.15, 0.45),

  buy: sfx(1.1, (c, o) => {
    ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((x, i) => marimba(c, o, i * 0.06, n(x), 0.16, 0.4));
    noise(c, o, { t: 0.25, vol: 0.05, attack: 0.05, decay: 0.5, filter: { type: 'highpass', freq: 7000 } });
  }, 0.3),
  unlock: sfx(1.2, (c, o) => {
    noise(c, o, { vol: 0.25, decay: 0.12, filter: { type: 'bandpass', freq: 600, q: 2 } });
    marimba(c, o, 0.05, n('C5'), 0.2, 0.5);
    ['E5', 'G5', 'C6'].forEach((x, i) => bell(c, o, 0.15 + i * 0.07, n(x), 0.1, 0.7));
  }, 0.3),

  win: sfx(2.2, (c, o) => {
    const seq = [['G4', 0], ['C5', 0.12], ['E5', 0.24], ['G5', 0.36], ['E5', 0.5], ['G5', 0.62]];
    for (const [x, t] of seq) marimba(c, o, t, n(x), 0.16, 0.35);
    ['C5', 'E5', 'G5', 'C6'].forEach((x) => {
      tone(c, o, { t: 0.78, freq: n(x), type: 'triangle', vol: 0.08, attack: 0.02, sustain: 0.8, hold: 0.6, release: 0.5 });
      bell(c, o, 0.78, n(x) * 2, 0.05, 1.2);
    });
  }, 0.35),
  lose: sfx(2.0, (c, o) => {
    [['E4', 0], ['D4', 0.25], ['C4', 0.5], ['B3', 0.8]].forEach(([x, t], i) =>
      tone(c, o, { t, freq: n(x), type: 'triangle', vol: 0.16, attack: 0.02, sustain: 0.7, hold: i === 3 ? 0.6 : 0.18, release: 0.3 }));
  }, 0.4),
  star: sfx(0.9, (c, o) => { bell(c, o, 0, n('C7'), 0.12, 0.6); bell(c, o, 0.04, n('G6'), 0.08, 0.6); }, 0.35, 0.55),
};
