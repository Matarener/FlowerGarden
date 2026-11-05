import { rng } from '../util/rng.js';

/**
 * Фоны, которые подстраиваются под ширину экрана.
 *
 * Середина фона (CORE) одинакова на всех экранах: там грядки, тропа, бойцы.
 * Сплошные полосы (небо, лес на горизонте, земля) середина рисует сразу на всю ширину,
 * используя случайность, привязанную к координате (hashRandom), поэтому при любой ширине
 * они выглядят одинаково. Отдельные предметы по краям добавляет функция краёв.
 * Ширина округляется с запасом, чтобы фон не перерисовывался при каждом изменении окна.
 */
export const CORE = { left: -120, right: 510, top: -160, bottom: 1040 };
const STEP = 160;          // шаг округления ширины
const PIXEL_BUDGET = 2600; // максимум пикселей по ширине у текстуры фона
const MAX_SCALE = 1.5;     // фоны мягкие, полуторного разрешения хватает

const current = new Map(); // имя фона → ключ текущей текстуры

/**
 * @param {import('../../engine/TextureCache.js').TextureCache} textures
 * @param {import('../../engine/Renderer.js').Renderer} renderer
 * @param {string} name
 * @param {(g, label, ext: {left, right}) => void} drawCore   середина фона и сплошные полосы на всю ширину
 * @param {(g, sides: number[][], r: Function, left: number, right: number) => void} drawSides
 *        края: sides — отрезки [от, до] по x за пределами середины, r — свой генератор случайных чисел
 * @returns {string} ключ текстуры
 */
export function bakeBackground(textures, renderer, name, drawCore, drawSides) {
  const view = renderer.width ? renderer.visibleWorld() : CORE;
  const left = view.left < CORE.left ? Math.floor((view.left - 20) / STEP) * STEP : CORE.left;
  const right = view.right > CORE.right ? Math.ceil((view.right + 20) / STEP) * STEP : CORE.right;
  const key = name + ':' + left + ':' + right;
  if (textures.has(key)) return key;

  const width = right - left;
  const height = CORE.bottom - CORE.top;
  const scale = Math.min(MAX_SCALE, PIXEL_BUDGET / width);
  const sides = [];
  if (left < CORE.left) sides.push([left, CORE.left]);
  if (right > CORE.right) sides.push([CORE.right, right]);

  textures.bake(key, width, height, -left, -CORE.top, (g, label) => {
    // середина рисует сплошные полосы (небо, лес на горизонте, землю) сразу на всю ширину,
    // края добавляют только отдельные предметы поверх: так на стыке не бывает швов
    drawCore(g, label, { left, right });
    if (sides.length) drawSides(g, sides, rng(name.length * 977 + 13), left, right);
  }, scale);

  const prev = current.get(name);
  if (prev && prev !== key) textures.delete(prev);
  current.set(name, key);
  return key;
}

/** Сколько случайных объектов положить на отрезок, если на середину приходится perCore. */
export const countFor = ([a, b], perCore) => Math.round(((b - a) / (CORE.right - CORE.left)) * perCore);

/** Травяной кустик из трёх травинок. */
export function grassTuft(g, x, y, color) {
  g.fillStyle(color, 1);
  g.fillTriangle(x - 5, y, x - 1, y, x - 6, y - 9);
  g.fillTriangle(x - 2, y, x + 2, y, x, y - 12);
  g.fillTriangle(x + 1, y, x + 5, y, x + 6, y - 8);
}

/** Случайное число 0..1, зависящее только от координаты и зерна: одинаковое при любой ширине фона. */
export function hashRandom(x, seed = 0) {
  let h = Math.imul((Math.round(x * 16) | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 1, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
