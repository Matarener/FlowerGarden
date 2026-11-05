import { $$, icon } from './dom.js';
import { Sheet } from './Sheet.js';
import { UPGRADES, UPGRADE_KEYS } from '../data/content.js';

/** Как показать значение ступени улучшения. */
function stepText(key, v) {
  switch (key) {
    case 'can': return v + ' полива';
    case 'basket': return v + ' мест';
    case 'boots': return 'скорость ' + Math.round((v / 190) * 100) + '%';
    case 'soil': return 'рост ×' + (1 / v).toFixed(2).replace(/\.?0+$/, '');
    case 'bell': return 'терпение ×' + v;
    case 'scarecrow': return v === 1 ? 'жуки как обычно' : 'жуков в ' + v + ' раза меньше';
    default: return String(v);
  }
}

/**
 * Лавка улучшений между уровнями: лейка, корзинка, сапожки, земля, колокольчик, пугало.
 */
export function createShopSheet(app) {
  function open() {
    const { state } = app;
    const panel = app.sheet.open(
      Sheet.head('Лавка', 'В кошельке ' + state.coins + ' монет') +
      '<div class="settings"><div class="sbtns">' +
        UPGRADE_KEYS.map((k) => {
          const u = UPGRADES[k], step = state.upgrades[k], next = state.nextUpgrade(k);
          const dots = u.steps.map((_, i) => '<i class="' + (i <= step ? 'on' : '') + '"></i>').join('');
          return '<button class="sbtn up-row" type="button" data-up="' + k + '"' + (!next || next.price > state.coins ? ' disabled' : '') + '>' +
            '<span><span class="up-name">' + u.name + '<span class="up-dots">' + dots + '</span></span>' +
            '<small>' + u.hint + '. Сейчас: ' + stepText(k, u.steps[step].v) + (next ? ', будет: ' + stepText(k, next.v) : '') + '</small></span>' +
            (next ? '<span class="price">' + icon('i-coin') + next.price + '</span>' : '<span class="price done">Всё</span>') +
          '</button>';
        }).join('') +
      '</div></div>' +
      '<p class="note">Монеты дают за пройденные уровни. Звёзды приносят по 10 монет.</p>',
    );
    for (const b of $$('[data-up]', panel)) {
      b.addEventListener('click', () => {
        if (state.buyUpgrade(b.dataset.up)) {
          app.sfx('buy');
          app.toast(UPGRADES[b.dataset.up].name + ': улучшено!');
          open();
        } else app.sfx('error');
      });
    }
  }
  return { open };
}
