/**
 * Функции плавности: принимают прогресс 0..1 и возвращают 0..1 (back может выходить за 1).
 */
export const Ease = {
  linear: (p) => p,
  quadIn: (p) => p * p,
  quadOut: (p) => 1 - (1 - p) * (1 - p),
  quadInOut: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  cubicIn: (p) => p * p * p,
  cubicOut: (p) => 1 - Math.pow(1 - p, 3),
  sineIn: (p) => 1 - Math.cos((p * Math.PI) / 2),
  sineOut: (p) => Math.sin((p * Math.PI) / 2),
  sineInOut: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  backOut: (p) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
};

export function getEase(name) {
  return (name && Ease[name]) || Ease.linear;
}
