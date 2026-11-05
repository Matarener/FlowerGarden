// Проверка баланса без графики: «бот» проходит уровни на модели LevelModel.
//   node tools/sim.mjs            → все уровни, улучшения как у обычного игрока к этому уровню
//   node tools/sim.mjs 0          → все уровни без улучшений
// Бот играет «средне»: думает с задержкой, не всегда выбирает лучшее.
import { LevelModel } from '../src/game/level/LevelModel.js';
import { levelDef, LEVEL_COUNT, UPGRADES, starsFor } from '../src/game/data/content.js';
import { rng } from '../src/game/util/rng.js';

// без аргумента ступень улучшений зависит от уровня, как у обычного игрока
const tierArg = process.argv[2];
const tierOf = (n) => (tierArg != null ? Number(tierArg) : n < 8 ? 0 : n < 18 ? 1 : 2);
const upFor = (n) => Object.fromEntries(Object.entries(UPGRADES).map(([k, u]) => [k, u.steps[Math.min(tierOf(n), u.steps.length - 1)].v]));
const think = Number(process.argv[3] || 700); // мс между решениями

function bot(m) {
  if (m.queue.length > 1) return;
  const planned = m.plannedActions();
  const busy = (type, key, val) => planned.some((a) => a.type === type && a[key] === val);
  // 1. отдать заказ
  for (let s = 0; s < 3; s++) {
    const c = m.customers[s];
    if (c && c.arrive <= 0 && c.order.some((it) => m.basket.includes(it)) && !busy('serve', 'spot', s)) return m.enqueue({ type: 'serve', spot: s });
  }
  // 2. букет, если просят
  if (m.def.bouquets && m.customers.some((c) => c && c.order.some((it) => it.startsWith('b:') && m.basket.filter((x) => x === it.slice(2)).length >= 3)) && !busy('tie', 'type', 'tie')) return m.enqueue({ type: 'tie' });
  // 3. полить
  const thirsty = m.beds.findIndex((b, i) => b.stage === 'grow' && b.thirsty && !busy('water', 'bed', i));
  if (thirsty >= 0) {
    const plannedWater = planned.filter((a) => a.type === 'water').length;
    if (m.water - plannedWater <= 0) { if (!planned.some((a) => a.type === 'well')) return m.enqueue({ type: 'well' }); }
    else return m.enqueue({ type: 'water', bed: thirsty });
  }
  // 4. собрать
  const plannedPick = planned.filter((a) => a.type === 'pick').length;
  const bloom = m.beds.findIndex((b, i) => b.stage === 'bloom' && !busy('pick', 'bed', i));
  if (bloom >= 0 && m.basket.length + plannedPick < m.up.basket) return m.enqueue({ type: 'pick', bed: bloom });
  // 5. посадить то, что просят
  const wanted = m.customers.flatMap((c) => (c ? c.order : [])).map((it) => it.replace('b:', ''));
  const kind = wanted.find((k) => m.def.flowers.includes(k)) || m.def.flowers[0];
  const empty = m.beds.findIndex((b, i) => b.stage === 'empty' && !busy('plant', 'bed', i));
  if (empty >= 0 && !m.enqueue({ type: 'plant', bed: empty, kind })) return;
  const wilted = m.beds.findIndex((b, i) => b.stage === 'wilted' && !busy('clear', 'bed', i));
  if (wilted >= 0) return m.enqueue({ type: 'clear', bed: wilted });
  if (m.water < m.up.can && !planned.some((a) => a.type === 'well') && m.hero.state === 'idle') m.enqueue({ type: 'well' });
}

let wins = 0;
const rows = [];
for (let n = 1; n <= LEVEL_COUNT; n++) {
  const def = levelDef(n);
  let won = 0, used = 0, stars = 0;
  const runs = 8;
  for (let r = 0; r < runs; r++) {
    const m = new LevelModel(def, upFor(n), rng(n * 100 + r));
    let acc = 0;
    const seen = new Map();
    while (!m.over) {
      m.update(50);
      acc += 50;
      for (const p of m.pests) {
        if (!seen.has(p.id)) seen.set(p.id, m.time);
        if (m.time - seen.get(p.id) > 2500) m.shoo(p);
      }
      if (acc >= think) { acc = 0; bot(m); }
    }
    if (m.won) { won++; used += m.time; stars += starsFor(m.time, def.timeMs); }
  }
  if (won === runs) wins++;
  rows.push(n + '\tцель ' + def.goal + '\tвремя ' + def.timeMs / 1000 + '\tпобед ' + won + '/' + runs +
    (won ? '\tср.время ' + Math.round(used / won / 1000) + 'с\tзвёзд ' + (stars / won).toFixed(1) : ''));
}
console.log(rows.join('\n'));
