/**
 * Где что стоит на экране уровня (игровые единицы, экран 390×844).
 * Общие для логики (куда идти Тише) и для графики.
 */
export const BED_W = 100;
export const BED_H = 78;

/** Центры грядок 3×3. */
export const BEDS = [];
for (const y of [400, 508, 616]) for (const x of [80, 195, 310]) BEDS.push({ x, y });

/** В каком порядке открываются грядки: сначала середина, потом края. */
export const BED_ORDER = [3, 4, 5, 1, 7, 0, 2, 6, 8];

/** Места покупателей у прилавка (точка ног). */
export const SPOTS = [{ x: 82, y: 262 }, { x: 195, y: 262 }, { x: 308, y: 262 }];

export const WELL = { x: 62, y: 742 };
export const TABLE = { x: 326, y: 748 };
export const HERO_START = { x: 195, y: 735 };

/** Куда встаёт Тиша, чтобы сделать дело с предметом. */
export function anchorOf(action) {
  switch (action.type) {
    case 'well': return { x: WELL.x + 52, y: WELL.y + 8 };
    case 'tie': return { x: TABLE.x - 56, y: TABLE.y + 4 };
    case 'serve': return { x: SPOTS[action.spot].x, y: 330 };
    default: {
      const b = BEDS[action.bed];
      return { x: b.x, y: b.y + BED_H / 2 + 8 };
    }
  }
}
