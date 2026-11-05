import { $, $$, esc, icon, formatTime, bump } from './dom.js';
import { Sheet } from './Sheet.js';
import { FLOWERS, LOCATIONS, levelDef, LEVEL_COUNT } from '../data/content.js';
import { itemIconKey } from '../art/flowers.js';
import { iconUrl } from '../art/icons.js';

/**
 * Интерфейс уровня поверх поляны: цель и таймер сверху, лейка и корзинка,
 * семена снизу. Плюс окна: перед уровнем, пауза, итог.
 */
export function createLevelUi(app) {
  const el = {
    money: $('#lv-money'), target: $('#lv-target'), bar: $('#lv-bar'), goal: $('#lv-goal'),
    time: $('#lv-time'), timeBox: $('#lv-time-box'),
    water: $('#lv-water'), basket: $('#lv-basket'), seeds: $('#lv-seeds'),
  };
  let shown = { money: null, sec: null, water: null, basket: null };
  let scene = null;

  const img = (key, cls = '') => '<img class="' + cls + '" alt="" src="' + iconUrl(app.engine.textures, key) + '">';

  /** Подготовить панель под новый уровень. */
  function setup(s) {
    scene = s;
    const { def, model } = s;
    shown = { money: null, sec: null, water: null, basket: null };
    el.target.textContent = '/ ' + def.goal;
    el.seeds.innerHTML = def.flowers.map((k) =>
      '<button class="seed-btn" type="button" role="radio" data-kind="' + k + '" aria-checked="' + (k === s.selectedSeed) + '" aria-label="' + FLOWERS[k].name + ', семена ' + FLOWERS[k].seed + '" title="' + FLOWERS[k].name + '">' +
        img('fl_' + k) + '<small>' + icon('i-coin') + FLOWERS[k].seed + '</small></button>').join('');
    for (const b of $$('.seed-btn', el.seeds)) {
      b.addEventListener('click', () => {
        s.selectedSeed = b.dataset.kind;
        for (const x of $$('.seed-btn', el.seeds)) x.setAttribute('aria-checked', String(x === b));
        app.sfx('tap');
      });
    }
    tick(model);
  }

  function tick(m) {
    if (m.money !== shown.money) {
      if (shown.money !== null && m.money > shown.money) bump(el.goal);
      shown.money = m.money;
      el.money.textContent = m.money;
      el.bar.style.width = Math.min(100, Math.max(0, (m.money / m.def.goal) * 100)) + '%';
    }
    const sec = Math.ceil(m.timeLeft / 1000);
    if (sec !== shown.sec) {
      shown.sec = sec;
      el.time.textContent = formatTime(m.timeLeft);
      el.timeBox.classList.toggle('hurry', sec <= 20);
    }
    const w = m.water + '/' + m.up.can;
    if (w !== shown.water) {
      shown.water = w;
      // лейка, число поливов и капли; пустая лейка мигает и подсказывает про колодец
      // капли рисуем, только пока их немного: с большой лейкой хватает числа
      let html = icon('i-can', 'can-ic') + '<b class="w-num">' + m.water + '<small>/' + m.up.can + '</small></b>';
      if (m.water === 0) html += '<span class="w-hint">к колодцу!</span>';
      else if (m.up.can <= 5) {
        html += '<span class="w-drops">';
        for (let i = 0; i < m.up.can; i++) html += icon(i < m.water ? 'i-drop' : 'i-drop-empty');
        html += '</span>';
      }
      el.water.innerHTML = html;
      el.water.classList.toggle('empty', m.water === 0);
      el.water.classList.toggle('low', m.water === 1);
    }
    const b = m.basket.join(',') + '/' + m.up.basket;
    if (b !== shown.basket) {
      shown.basket = b;
      let html = icon('i-basket', 'bk-ic');
      for (let i = 0; i < m.up.basket; i++) {
        html += '<span class="bk-slot">' + (m.basket[i] ? img(itemIconKey(m.basket[i])) : '') + '</span>';
      }
      el.basket.innerHTML = html;
    }
  }

  /** Окно перед уровнем: цель, время и новинка. */
  function showIntro(n) {
    const def = levelDef(n);
    const best = app.state.stars[n - 1];
    const panel = app.sheet.open(
      Sheet.head('Уровень ' + n, LOCATIONS[def.location].name) +
      '<div class="intro">' +
        '<div class="intro-goal"><span>' + icon('i-coin') + '<b>' + def.goal + '</b><small>заработать</small></span>' +
          '<span>' + icon('i-clock') + '<b>' + formatTime(def.timeMs) + '</b><small>на всё</small></span></div>' +
        (def.intro ? '<p class="intro-new"><b>Новое:</b> ' + esc(def.intro) + '</p>' : '') +
        '<div class="intro-flowers">' + def.flowers.map((k) => '<span>' + img('fl_' + k) + FLOWERS[k].name + '<small>' + FLOWERS[k].price + ' ' + icon('i-coin') + '</small></span>').join('') + '</div>' +
        (best ? '<p class="note">Лучший результат: ' + '★'.repeat(best) + '</p>' : '') +
        '<button class="sbtn go" type="button" id="intro-go">Начать</button>' +
      '</div>',
    );
    $('#intro-go', panel).addEventListener('click', () => {
      app.sfx('unlock');
      app.state.markIntro(n);
      app.router.go('level', n);
    });
  }

  function openPause() {
    if (!scene || scene.ended) return;
    const panel = app.sheet.open(
      Sheet.head('Пауза', 'Уровень ' + scene.n) +
      '<div class="sbtns">' +
        '<button class="sbtn go" type="button" data-close>Продолжить</button>' +
        '<button class="sbtn" type="button" id="p-restart"><span>Начать уровень заново</span></button>' +
        '<button class="sbtn" type="button" id="p-settings"><span>Настройки</span></button>' +
        '<button class="sbtn" type="button" id="p-map"><span>Выйти на карту<small>Прогресс уровня пропадёт</small></span></button>' +
      '</div>' +
      '<p class="note">Нажимай на грядки, колодец, столик и покупателей — Тиша запомнит до пяти дел подряд. Жуков прогоняй нажатием.</p>',
    );
    for (const b of $$('[data-close]', panel)) b.addEventListener('click', () => app.sfx('tap'));
    $('#p-restart', panel).addEventListener('click', () => { app.sfx('tap'); app.router.go('level', scene.n); });
    $('#p-map', panel).addEventListener('click', () => { app.sfx('tap'); app.router.go('map'); });
    $('#p-settings', panel).addEventListener('click', () => app.ui.settings.open());
  }
  $('#lv-pause').addEventListener('click', () => { app.sfx('tap'); openPause(); });

  /** Итог уровня. */
  function showResult(won) {
    const s = scene, m = s.model, def = s.def;
    const res = app.state.finishLevel(s.n, won, m.money, def.startMoney, m.time, def.timeMs);
    app.sfx(won ? 'win' : 'lose');
    const stars = [1, 2, 3].map((k) =>
      '<svg class="' + (k <= res.stars ? 'on' : '') + '" style="--d:' + (0.2 + k * 0.2) + 's" aria-hidden="true"><use href="#' + (k <= res.stars ? 'i-star' : 'i-star-empty') + '"/></svg>').join('');
    const next = s.n < LEVEL_COUNT;
    const panel = app.sheet.open(
      '<div class="result ' + (won ? 'win' : 'lose') + '">' +
        '<h2 class="sheet-title">' + (won ? 'Уровень пройден!' : 'Время вышло') + '</h2>' +
        (won ? '<div class="stars">' + stars + '</div>' +
          '<p class="reward big">В кошелёк: <b>' + icon('i-coin') + '+' + res.reward + '</b></p>' +
          '<p class="note">Заработано за уровень: ' + m.earned + '. За каждую звезду ещё +10.</p>'
          : '<p class="sheet-sub">Нужно было ' + def.goal + ', набрано ' + m.money + '. Сажай то, что просят покупатели, и не давай цветам вянуть.</p>') +
        '<div class="sbtns">' +
          (won && next ? '<button class="sbtn go" type="button" id="r-next">Дальше: уровень ' + (s.n + 1) + '</button>' : '') +
          (!won ? '<button class="sbtn go" type="button" id="r-again">Ещё раз</button>' : '') +
          '<button class="sbtn" type="button" id="r-map"><span>На карту' + (app.state.affordableCount() ? '<small>В лавке есть что купить</small>' : '') + '</span></button>' +
          (won ? '<button class="sbtn" type="button" id="r-again"><span>Переиграть за больше звёзд</span></button>' : '') +
        '</div>' +
      '</div>',
      { modal: true },
    );
    if (won) [1, 2, 3].forEach((k) => { if (k <= res.stars) setTimeout(() => app.sfx('star', { rate: 1 + k * 0.08, throttle: 0 }), 200 + k * 200); });
    const on = (id, fn) => { const b = $(id, panel); if (b) b.addEventListener('click', () => { app.sfx('tap'); fn(); }); };
    on('#r-next', () => { app.router.go('map'); showIntro(s.n + 1); });
    on('#r-again', () => app.router.go('level', s.n));
    on('#r-map', () => app.router.go('map'));
  }

  return { setup, tick, showIntro, showResult, openPause };
}
