import { marimba, bell, pad, flute, bass, kick, hat, shaker, mixBus, note, midi } from '../../engine/audio/synth.js';

/**
 * Музыка: два зацикленных трека по 8 тактов — для меню и для уровня.
 * Аккорд — массив нот, первая — бас. Мелодия — [доля от начала такта, нота, длина в долях].
 */
const n = (name) => midi(note(name));
const MUSIC_RATE = 32000;

function track(bpm, bars, compose, { room = 0.3, roomSize = 2.2, volume = 0.7 } = {}) {
  const beat = 60 / bpm;
  return {
    duration: bars * 4 * beat,
    loop: true,
    tail: 2.5,
    peak: 0.6,
    sampleRate: MUSIC_RATE,
    render: (ctx, out) => compose(ctx, mixBus(ctx, out, { volume, room, roomSize }), beat),
  };
}
const chord = (...names) => names.map(n);

/* ---------- меню: флейта и пэд, фа мажор, неспешно ---------- */
const MENU_CHORDS = [
  chord('F2', 'F3', 'A3', 'C4'), chord('D2', 'D3', 'F3', 'A3'), chord('Bb1', 'Bb2', 'D3', 'F3'), chord('C2', 'C3', 'E3', 'G3'),
  chord('F2', 'F3', 'A3', 'C4'), chord('A1', 'A2', 'C#3', 'E3'), chord('D2', 'D3', 'F3', 'A3'), chord('C2', 'C3', 'E3', 'G3'),
];
const MENU_MELODY = [
  [[0, 'C5', 1], [1, 'F5', 1.5], [2.5, 'E5', 0.5], [3, 'F5', 1]],
  [[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 1]],
  [[0, 'D5', 1.5], [1.5, 'F5', 0.5], [2, 'Bb5', 2]],
  [[0, 'G5', 3], [3, 'C5', 1]],
  [[0, 'C5', 1], [1, 'F5', 1], [2, 'A5', 1], [3, 'C6', 1]],
  [[0, 'C#6', 1.5], [1.5, 'A5', 0.5], [2, 'E5', 2]],
  [[0, 'F5', 1], [1, 'A5', 1], [2, 'D6', 1], [3, 'A5', 1]],
  [[0, 'G5', 2], [2, 'E5', 1], [3, 'C5', 1]],
];
const menu = track(84, 8, (ctx, out, beat) => {
  MENU_CHORDS.forEach((c, bar) => {
    const t0 = bar * 4 * beat;
    const [root, ...tones] = c;
    for (const f of tones) pad(ctx, out, t0, f * 2, 4 * beat * 0.98, 0.022, 800);
    bass(ctx, out, t0, root, 1.8 * beat, 0.16, 'sine');
    bass(ctx, out, t0 + 2 * beat, root * 1.5, 1.6 * beat, 0.11, 'sine');
    for (const [at, nm, len] of MENU_MELODY[bar]) flute(ctx, out, t0 + at * beat, n(nm), len * beat * 0.9, 0.07);
    [0, 1, 2, 3].forEach((i) => marimba(ctx, out, t0 + i * beat + beat / 2, tones[i % 3] * 2, 0.05, 0.4));
    for (let i = 1; i < 8; i += 2) shaker(ctx, out, t0 + i * beat / 2, 0.016);
  });
}, { room: 0.4, roomSize: 2.6 });

/* ---------- уровень: бодрая маримба, соль мажор ---------- */
const GARDEN_CHORDS = [
  chord('G2', 'G3', 'B3', 'D4'), chord('E2', 'E3', 'G3', 'B3'), chord('C2', 'C3', 'E3', 'G3'), chord('D2', 'D3', 'F#3', 'A3'),
  chord('G2', 'G3', 'B3', 'D4'), chord('B1', 'B2', 'D#3', 'F#3'), chord('C2', 'C3', 'E3', 'G3'), chord('D2', 'D3', 'F#3', 'A3'),
];
const GARDEN_MELODY = [
  [[0, 'D5', 0.5], [0.5, 'G5', 0.5], [1, 'B5', 1], [2, 'A5', 0.5], [2.5, 'G5', 0.5], [3, 'D5', 1]],
  [[0, 'E5', 1], [1, 'G5', 1], [2, 'B5', 1.5], [3.5, 'A5', 0.5]],
  [[0, 'G5', 0.5], [0.5, 'E5', 0.5], [1, 'C5', 1], [2, 'E5', 1], [3, 'G5', 1]],
  [[0, 'F#5', 2], [2, 'A5', 1], [3, 'D5', 1]],
  [[0, 'D5', 0.5], [0.5, 'G5', 0.5], [1, 'B5', 1], [2, 'D6', 1], [3, 'B5', 1]],
  [[0, 'D#6', 1.5], [1.5, 'B5', 0.5], [2, 'F#5', 2]],
  [[0, 'E5', 1], [1, 'G5', 1], [2, 'C6', 1], [3, 'B5', 0.5], [3.5, 'A5', 0.5]],
  [[0, 'A5', 2], [2, 'F#5', 1], [3, 'D5', 1]],
];
const garden = track(112, 8, (ctx, out, beat) => {
  GARDEN_CHORDS.forEach((c, bar) => {
    const t0 = bar * 4 * beat;
    const [root, ...tones] = c;
    pad(ctx, out, t0, tones[0] * 2, 4 * beat * 0.95, 0.02, 900);
    for (let i = 0; i < 4; i++) bass(ctx, out, t0 + i * beat, i % 2 ? root * 1.5 : root, beat * 0.7, 0.18);
    const arp = [tones[0], tones[1], tones[2], tones[1]];
    for (let i = 0; i < 8; i++) marimba(ctx, out, t0 + i * beat / 2, arp[i % 4] * 2, i % 2 ? 0.05 : 0.075, 0.3);
    for (const [at, nm, len] of GARDEN_MELODY[bar]) bell(ctx, out, t0 + at * beat, n(nm), 0.065, Math.min(1.2, len * beat * 1.4));
    kick(ctx, out, t0, 0.25);
    kick(ctx, out, t0 + 2 * beat, 0.2);
    for (let i = 0; i < 8; i++) (i % 2 ? hat : shaker)(ctx, out, t0 + i * beat / 2, i % 2 ? 0.035 : 0.03);
  });
}, { room: 0.25, roomSize: 1.8, volume: 0.65 });

export const MUSIC = { menu, garden };
