/**
 * Где что стоит на экране уровня (игровые единицы, экран 390×844). Версия в изометрии:
 * огород — ромб из 3×3 грядок, над ним прилавок с покупателями, внизу колодец и верстак.
 * Общие для логики (куда идти Тише) и для графики.
 */

/** Изометрия: ширина и высота клетки на экране. */
export const TW = 74, TH = 40;
/** Точка (x, y) в клетках от центра (sx, sy) и высота z в пикселях → экран. */
export const iso = (sx, sy) => (x, y, z = 0) => [sx + (x - y) * TW / 2, sy + (x + y) * TH / 2 - z];

/** Огород: центр ромба, сторона в клетках, шаг грядок и размер грядки в клетках. */
export const GARDEN = { x: 195, y: 500, size: 4.9, step: 1.5, bed: 1.3 };

/** Размер грядки на экране (ромб). */
export const BED_W = GARDEN.bed * TW;
export const BED_H = GARDEN.bed * TH;

/** Центры грядок 3×3: строка — по оси y изометрии, столбец — по оси x. */
export const BEDS = [];
for (let j = -1; j <= 1; j++) {
  for (let i = -1; i <= 1; i++) {
    const [x, y] = iso(GARDEN.x, GARDEN.y)(i * GARDEN.step, j * GARDEN.step);
    BEDS.push({ x, y, i, j });
  }
}

/** В каком порядке открываются грядки: сначала средний ряд, потом края. */
export const BED_ORDER = [3, 4, 5, 1, 7, 0, 2, 6, 8];

/** Попадает ли точка экрана в ромб грядки (с запасом до середины дорожки). */
export function inBed(b, x, y) {
  const dx = (x - b.x) / (TW / 2), dy = (y - (b.y - 8)) / (TH / 2);
  const u = (dx + dy) / 2, v = (dy - dx) / 2;
  const r = GARDEN.step / 2;
  return Math.abs(u) <= r && Math.abs(v) <= r;
}

/** Прилавок и места покупателей перед ним (точка ног). */
export const STALL = { x: 248, y: 232 };
export const SPOTS = [{ x: 132, y: 318 }, { x: 236, y: 330 }, { x: 336, y: 316 }];

export const WELL = { x: 66, y: 680 };
export const TABLE = { x: 322, y: 694 };
export const HERO_START = { x: 195, y: 640 };

/** Куда встаёт Тиша, чтобы сделать дело с предметом. */
export function anchorOf(action) {
  switch (action.type) {
    case 'well': return { x: WELL.x + 62, y: WELL.y + 14 };
    case 'tie': return { x: TABLE.x - 58, y: TABLE.y + 14 };
    case 'serve': return { x: SPOTS[action.spot].x - 6, y: SPOTS[action.spot].y + 40 };
    default: {
      // передний угол грядки, на дорожке
      const b = BEDS[action.bed];
      return { x: b.x, y: b.y + BED_H / 2 + 6 };
    }
  }
}
