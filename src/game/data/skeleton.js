/**
 * Скелет зверька: ёжик Тиша и все покупатели. Девять костей, восемь слотов.
 * Корень — точка между ступнями. Внешний вид задают скины (art/critters.js).
 *
 * Ключевой кадр: [время в секундах, смещение от позы покоя, плавность].
 */
const skin = (name) => ({ body: name + '_body', head: name + '_head', arm: name + '_arm', leg: name + '_leg' });

const blink = (at) => [[0, 'eyes_open'], [at, 'eyes_closed'], [at + 0.12, 'eyes_open']];

export const CRITTER = {
  name: 'critter',
  mix: 0.12,
  bones: [
    { name: 'root' },
    { name: 'legL', parent: 'root', x: -8, y: -17 },
    { name: 'legR', parent: 'root', x: 8, y: -17 },
    { name: 'body', parent: 'root', y: -14 },
    { name: 'head', parent: 'body', y: -34 },
    { name: 'face', parent: 'head', y: -4 },
    { name: 'armL', parent: 'body', x: -16, y: -30, rotation: 18 },
    { name: 'armR', parent: 'body', x: 16, y: -30, rotation: -18 },
    { name: 'prop', parent: 'armR', y: 21 },
  ],
  slots: [
    { name: 'legBack', bone: 'legL', attachment: 'leg' },
    { name: 'legFront', bone: 'legR', attachment: 'leg' },
    { name: 'armBack', bone: 'armL', attachment: 'arm' },
    { name: 'body', bone: 'body', attachment: 'body' },
    { name: 'head', bone: 'head', attachment: 'head' },
    { name: 'face', bone: 'face', attachment: 'eyes_open' },
    { name: 'prop', bone: 'prop', attachment: 'none' },
    { name: 'armFront', bone: 'armR', attachment: 'arm' },
  ],
  attachments: {
    body: { origin: [0.5, 0.9] },
    head: { origin: [0.5, 0.78] },
    arm: { origin: [0.5, 0.14] },
    leg: { origin: [0.5, 0.12] },
    eyes_open: { origin: [0.5, 0.5] },
    eyes_closed: { origin: [0.5, 0.5] },
    eyes_happy: { origin: [0.5, 0.5] },
    eyes_sad: { origin: [0.5, 0.5] },
    can: { origin: [0.31, 0.17] },
    none: { origin: [0.5, 0.5] },
  },
  skins: {
    tisha: skin('tisha'), bunny: skin('bunny'), bear: skin('bear'), fox: skin('fox'), frog: skin('frog'),
  },
  animations: {
    idle: {
      duration: 1.8, loop: true,
      bones: {
        body: { scaleY: [[0, 1], [0.9, 0.96, 'inOut'], [1.8, 1, 'inOut']], scaleX: [[0, 1], [0.9, 1.03, 'inOut'], [1.8, 1, 'inOut']] },
        head: { rotation: [[0, 0], [0.9, 3, 'inOut'], [1.8, 0, 'inOut']], y: [[0, 0], [0.9, 1.5, 'inOut'], [1.8, 0, 'inOut']] },
        armL: { rotation: [[0, 0], [0.9, 6, 'inOut'], [1.8, 0, 'inOut']] },
        armR: { rotation: [[0, 0], [0.9, -6, 'inOut'], [1.8, 0, 'inOut']] },
      },
      slots: { face: blink(1.4) },
    },
    walk: {
      duration: 0.46, loop: true,
      bones: {
        root: { y: [[0, 0], [0.115, -4, 'out'], [0.23, 0, 'in'], [0.345, -4, 'out'], [0.46, 0, 'in']] },
        body: { rotation: [[0, 4], [0.23, 6, 'inOut'], [0.46, 4, 'inOut']] },
        legL: { rotation: [[0, 28], [0.23, -28, 'inOut'], [0.46, 28, 'inOut']] },
        legR: { rotation: [[0, -28], [0.23, 28, 'inOut'], [0.46, -28, 'inOut']] },
        armL: { rotation: [[0, -24], [0.23, 22, 'inOut'], [0.46, -24, 'inOut']] },
        armR: { rotation: [[0, 22], [0.23, -24, 'inOut'], [0.46, 22, 'inOut']] },
        head: { rotation: [[0, -2], [0.23, 2, 'inOut'], [0.46, -2, 'inOut']] },
      },
    },
    /** Наклон к грядке: посадить, сорвать, прополоть. */
    bend: {
      duration: 0.45,
      bones: {
        body: { rotation: [[0, 0], [0.15, 22, 'out'], [0.32, 18], [0.45, 0, 'inOut']], scaleY: [[0, 1], [0.15, 0.9, 'out'], [0.45, 1, 'inOut']] },
        head: { rotation: [[0, 0], [0.15, 10, 'out'], [0.45, 0, 'inOut']] },
        armR: { rotation: [[0, 0], [0.15, -40, 'out'], [0.25, -20], [0.35, -40], [0.45, 0, 'inOut']] },
        armL: { rotation: [[0, 0], [0.15, -30, 'out'], [0.45, 0, 'inOut']] },
      },
      slots: { face: [[0, 'eyes_open'], [0.12, 'eyes_closed'], [0.36, 'eyes_open']] },
    },
    /**
     * Полив. Лейка висит на кости prop, которая крутится вместе с лапкой, поэтому
     * её поворот гасит поворот лапки и туловища: лейка держится ровно, а при поливе
     * наклоняется носиком вниз. Формула ключа: 18 − (поворот лапки) − (наклон тела) + наклон лейки.
     */
    water: {
      duration: 0.8,
      bones: {
        armR: { rotation: [[0, 0], [0.16, -62, 'out'], [0.3, -66, 'inOut'], [0.58, -66], [0.68, -62, 'inOut'], [0.8, 0, 'inOut']] },
        body: { rotation: [[0, 0], [0.16, 5, 'out'], [0.3, 8, 'inOut'], [0.58, 8], [0.68, 5, 'inOut'], [0.8, 0, 'inOut']] },
        prop: { rotation: [[0, 18], [0.16, 75, 'out'], [0.3, 128, 'inOut'], [0.44, 122, 'inOut'], [0.58, 130, 'inOut'], [0.68, 75, 'inOut'], [0.8, 18, 'inOut']] },
        head: { rotation: [[0, 0], [0.2, 6, 'out'], [0.6, 6], [0.8, 0, 'inOut']] },
      },
      slots: { prop: [[0, 'can'], [0.79, 'none']], face: [[0, 'eyes_open'], [0.3, 'eyes_happy'], [0.62, 'eyes_open']] },
      events: [[0.3, 'pour'], [0.4, 'pour'], [0.5, 'pour'], [0.58, 'pour']],
    },
    /** Набрать воды у колодца: качает ворот. */
    pump: {
      duration: 0.9,
      bones: {
        armL: { rotation: [[0, 0], [0.15, -120, 'out'], [0.3, -60], [0.45, -120], [0.6, -60], [0.75, -120], [0.9, 0, 'inOut']] },
        armR: { rotation: [[0, 0], [0.15, -60, 'out'], [0.3, -120], [0.45, -60], [0.6, -120], [0.75, -60], [0.9, 0, 'inOut']] },
        body: { scaleY: [[0, 1], [0.3, 0.94], [0.6, 1.02], [0.9, 1, 'inOut']] },
      },
      slots: { face: [[0, 'eyes_open'], [0.2, 'eyes_closed'], [0.7, 'eyes_open']] },
    },
    /**
     * Набрать воды у колодца: Тиша крутит ворот (ведро опускается и поднимается),
     * потом подставляет лейку под ведро. Лейка держится ровно: см. формулу у полива.
     */
    fill: {
      duration: 1.4,
      bones: {
        armR: { rotation: [[0, 0], [0.12, -110, 'out'], [0.24, -80, 'inOut'], [0.36, -110, 'inOut'], [0.48, -80, 'inOut'], [0.6, -110, 'inOut'], [0.7, -80, 'inOut'], [0.8, -30, 'out'], [1.25, -30], [1.4, 0, 'inOut']] },
        armL: { rotation: [[0, 0], [0.12, 30, 'out'], [1.25, 30], [1.4, 0, 'inOut']] },
        body: { rotation: [[0, 0], [0.12, 6, 'out'], [0.24, 3], [0.36, 6], [0.48, 3], [0.6, 6], [0.7, 3], [0.8, 4, 'out'], [1.25, 4], [1.4, 0, 'inOut']] },
        // лейка развёрнута носиком от колодца, горлышком под ведро
        prop: { rotation: [[0, 18], [0.7, 18], [0.8, 44, 'out'], [1.25, 44], [1.4, 18, 'inOut']], scaleX: [[0, 1], [0.72, -1, 'stepped'], [1.38, -1], [1.39, 1, 'stepped']] },
        head: { rotation: [[0, 0], [0.12, -6, 'out'], [0.7, -6], [0.85, -10, 'out'], [1.25, -10], [1.4, 0, 'inOut']] },
      },
      slots: { prop: [[0, 'none'], [0.72, 'can'], [1.39, 'none']], face: [[0, 'eyes_open'], [0.2, 'eyes_closed'], [0.6, 'eyes_open'], [1.05, 'eyes_happy'], [1.3, 'eyes_open']] },
      events: [[0.88, 'fill'], [0.96, 'fill'], [1.04, 'fill'], [1.12, 'fill'], [1.18, 'fill']],
    },
    /** Вязать букет: лапки вместе, быстрые движения. */
    tie: {
      duration: 0.9,
      bones: {
        armL: { rotation: [[0, 0], [0.12, -70, 'out'], [0.3, -50], [0.48, -70], [0.66, -50], [0.9, 0, 'inOut']] },
        armR: { rotation: [[0, 0], [0.12, -40, 'out'], [0.3, -60], [0.48, -40], [0.66, -60], [0.9, 0, 'inOut']] },
        head: { rotation: [[0, 0], [0.2, 8], [0.7, 8], [0.9, 0]] },
      },
    },
    /** Отдать покупателю: лапка вверх-вперёд. */
    give: {
      duration: 0.45,
      bones: {
        armR: { rotation: [[0, 0], [0.15, -150, 'out'], [0.32, -140], [0.45, 0, 'inOut']] },
        body: { rotation: [[0, 0], [0.15, -6, 'out'], [0.45, 0, 'inOut']] },
        head: { rotation: [[0, 0], [0.15, -8, 'out'], [0.45, 0, 'inOut']] },
      },
      slots: { face: [[0, 'eyes_happy'], [0.44, 'eyes_open']] },
    },
    happy: {
      duration: 0.7,
      bones: {
        root: { y: [[0, 0], [0.12, 2, 'out'], [0.32, -18, 'out'], [0.52, 0, 'in'], [0.7, 0]] },
        body: { scaleY: [[0, 1], [0.12, 0.86, 'out'], [0.3, 1.08], [0.52, 0.9], [0.7, 1, 'out']] },
        armL: { rotation: [[0, 0], [0.25, 140, 'out'], [0.55, 120], [0.7, 0, 'inOut']] },
        armR: { rotation: [[0, 0], [0.25, -140, 'out'], [0.55, -120], [0.7, 0, 'inOut']] },
      },
      slots: { face: [[0, 'eyes_happy'], [0.69, 'eyes_open']] },
    },
    sad: {
      duration: 0.8,
      bones: {
        head: { rotation: [[0, 0], [0.2, 12, 'out'], [0.4, -12], [0.6, 8], [0.8, 0, 'inOut']], y: [[0, 0], [0.2, 4], [0.8, 0]] },
        body: { scaleY: [[0, 1], [0.2, 0.93], [0.8, 1, 'inOut']] },
      },
      slots: { face: [[0, 'eyes_sad'], [0.79, 'eyes_open']] },
    },
    /** Покупатель заждался: топает и хмурится. */
    impatient: {
      duration: 0.8, loop: true,
      bones: {
        legR: { rotation: [[0, 0], [0.1, -18, 'out'], [0.2, 0, 'in'], [0.8, 0]] },
        head: { rotation: [[0, -4], [0.4, 4, 'inOut'], [0.8, -4, 'inOut']] },
        armL: { rotation: [[0, 40], [0.8, 40]] },
        armR: { rotation: [[0, -40], [0.8, -40]] },
      },
      slots: { face: [[0, 'eyes_sad']] },
    },
  },
};
