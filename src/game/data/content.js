/**
 * Данные игры: цветы, уровни, улучшения, покупатели. Только числа и тексты, без графики.
 * Время везде в миллисекундах игрового времени уровня.
 */

/** Цветы. seed — цена семян, price — цена одного цветка у покупателя, grow — две фазы роста. */
export const FLOWERS = {
  daisy:      { name: 'Ромашка',   seed: 2,  price: 6,  grow: [4500, 4500] },
  tulip:      { name: 'Тюльпан',   seed: 4,  price: 11, grow: [5500, 5500] },
  cornflower: { name: 'Василёк',   seed: 5,  price: 14, grow: [6000, 6500] },
  rose:       { name: 'Роза',      seed: 8,  price: 22, grow: [7500, 8000] },
  sunflower:  { name: 'Подсолнух', seed: 10, price: 28, grow: [8500, 9000] },
};
export const FLOWER_KEYS = Object.keys(FLOWERS);

/** Букет из трёх одинаковых цветов стоит как четыре. */
export const BOUQUET_SIZE = 3;
export const BOUQUET_MULT = 4;

export const RULES = {
  dryMs: 13000,      // сколько росток ждёт полива, потом вянет
  bloomMs: 16000,    // сколько распустившийся цветок стоит, потом вянет
  pestEatMs: 6500,   // сколько жук ест цветок, пока тот не завянет
  pestSpeed: 34,     // единиц в секунду
  shooReward: 2,     // монетки за прогнанного жука
  maxQueue: 5,       // сколько дел можно назначить Тише наперёд
  tipShare: 0.35,    // чаевые: доля стоимости заказа при полном терпении
  arriveMs: 1100,    // покупатель подходит к прилавку
};

/** Сколько длится каждое дело Тиши (без дороги). */
export const WORK_MS = { plant: 450, water: 800, pick: 380, clear: 600, well: 900, tie: 900, serve: 450 };

/** Покупатели: скины скелета и их имена (для подсказок). */
export const CUSTOMERS = [
  { skin: 'bunny', name: 'Зайчиха' },
  { skin: 'bear', name: 'Медвежонок' },
  { skin: 'fox', name: 'Лисичка' },
  { skin: 'frog', name: 'Лягушонок' },
];

/** Места уровней: у каждых десяти уровней своя поляна и свой цвет фона. */
export const LOCATIONS = [
  { name: 'Поляна у дома', bg: 'home' },
  { name: 'Берег ручья', bg: 'brook' },
  { name: 'Солнечный холм', bg: 'hill' },
];

/** Какой уровень что открывает (показывается перед уровнем как новинка). */
const UNLOCKS = {
  1: 'Посади ромашку, полей её дважды, собери и отнеси покупателю',
  3: 'Новый цветок — тюльпан',
  4: 'Жуки! Нажми на жука, чтобы прогнать его с грядки',
  6: 'Букеты: три одинаковых цветка на столике становятся букетом, он стоит как четыре',
  8: 'Новый цветок — василёк',
  11: 'Новый цветок — роза',
  16: 'Новый цветок — подсолнух',
};

export const LEVEL_COUNT = 30;

/** Сколько монет нужно набрать на каждом уровне. */
const GOALS = [
  40, 40, 45, 45, 50, 50, 55, 60, 65, 70,
  70, 75, 80, 85, 90, 90, 95, 120, 130, 140,
  145, 150, 155, 160, 165, 170, 175, 180, 185, 200,
];

/** Награда в кошелёк за пройденный уровень: заработанное плюс по 10 за звезду. */
export const levelReward = (money, startMoney, stars) => Math.max(0, money - startMoney) + stars * 10;

/**
 * Описание уровня по номеру (1..30). Сложность растёт плавно, новинки — по таблице UNLOCKS.
 * @returns {{ n, location, beds, flowers, bouquets, pests, goal, timeMs, startMoney,
 *             customerEvery: number[], patienceMs, maxItems, pestEvery: number[], intro }}
 */
export function levelDef(n) {
  const flowers = ['daisy'];
  if (n >= 3) flowers.push('tulip');
  if (n >= 8) flowers.push('cornflower');
  if (n >= 11) flowers.push('rose');
  if (n >= 16) flowers.push('sunflower');
  // самые дешёвые цветы со временем уходят из заказов, чтобы на экране было не больше четырёх
  while (flowers.length > 4) flowers.shift();

  const beds = n === 1 ? 4 : n === 2 ? 5 : n < 5 ? 6 : n < 12 ? 8 : 9;
  const timeMs = (n < 10 ? 150 : n < 20 ? 165 : 180) * 1000;
  // цели подобраны прогоном tools/sim.mjs: средний игрок успевает за ~80% времени
  const goal = GOALS[n - 1];
  return {
    n,
    location: Math.min(LOCATIONS.length - 1, Math.floor((n - 1) / 10)),
    beds,
    flowers,
    bouquets: n >= 6,
    pests: n >= 4,
    goal,
    timeMs,
    startMoney: 10 + Math.floor(n / 5) * 5,
    customerEvery: n < 3 ? [7000, 10000] : n < 10 ? [5500, 8500] : [4500, 7500],
    patienceMs: Math.max(26000, 40000 - n * 450),
    maxItems: n < 3 ? 2 : 3,
    pestEvery: n < 10 ? [16000, 24000] : n < 20 ? [11000, 18000] : [8000, 14000],
    intro: UNLOCKS[n] || null,
  };
}

/** Звёзды за уровень: по тому, какую часть времени потратили. */
export function starsFor(usedMs, timeMs) {
  const k = usedMs / timeMs;
  return k <= 0.62 ? 3 : k <= 0.85 ? 2 : 1;
}

/**
 * Улучшения из лавки. Ступень 0 — то, что есть с начала. price — цена перехода на эту ступень.
 */
export const UPGRADES = {
  can:       { name: 'Лейка',        hint: 'Больше воды без похода к колодцу', unit: 'полива', steps: [{ v: 3 }, { v: 5, price: 60 }, { v: 8, price: 180 }] },
  basket:    { name: 'Корзинка',     hint: 'Больше цветов за один заход', unit: 'мест', steps: [{ v: 3 }, { v: 5, price: 50 }, { v: 7, price: 160 }] },
  boots:     { name: 'Сапожки',      hint: 'Тиша бегает быстрее', unit: '', steps: [{ v: 190 }, { v: 230, price: 80 }, { v: 280, price: 220 }] },
  soil:      { name: 'Тёплая земля', hint: 'Цветы растут быстрее', unit: '', steps: [{ v: 1 }, { v: 0.85, price: 100 }, { v: 0.72, price: 260 }] },
  bell:      { name: 'Колокольчик',  hint: 'Покупатели ждут дольше', unit: '', steps: [{ v: 1 }, { v: 1.25, price: 70 }, { v: 1.5, price: 200 }] },
  scarecrow: { name: 'Пугало',       hint: 'Жуки прилетают реже', unit: '', steps: [{ v: 1 }, { v: 1.4, price: 90 }, { v: 2, price: 240 }] },
};
export const UPGRADE_KEYS = Object.keys(UPGRADES);
