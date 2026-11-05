import { $$, icon } from './dom.js';
import { Sheet } from './Sheet.js';
import { UPGRADES, UPGRADE_KEYS } from '../data/content.js';
import { iconUrl } from '../art/icons.js';

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
      Sheet.head('Лавка', 'Улучшения действуют на всех уровнях') +
      '<div class="shop-purse">' + icon('i-coin') + '<b>' + state.coins + '</b><small>в кошельке</small></div>' +
      '<div class="settings"><div class="up-grid">' +
        UPGRADE_KEYS.map((k) => {
          const u = UPGRADES[k], step = state.upgrades[k], next = state.nextUpgrade(k);
          const dots = u.steps.map((_, i) => '<i class="' + (i <= step ? 'on' : '') + '"></i>').join('');
          const poor = next && next.price > state.coins;
          return '<div class="up-card up-' + k + (next ? '' : ' maxed') + '">' +
            '<img class="up-pic" alt="" src="' + iconUrl(app.engine.textures, 'up_' + k) + '">' +
            '<b class="up-name">' + u.name + '</b>' +
            '<span class="up-dots" aria-label="Ступень ' + (step + 1) + ' из ' + u.steps.length + '">' + dots + '</span>' +
            '<small class="up-hint">' + u.hint + '</small>' +
            '<span class="up-val">' + stepText(k, u.steps[step].v) + (next ? '<em>→ ' + stepText(k, next.v) + '</em>' : '') + '</span>' +
            (next
              ? '<button class="up-buy' + (poor ? ' poor' : '') + '" type="button" data-up="' + k + '"' + (poor ? ' disabled' : '') + ' aria-label="Купить: ' + u.name + ', ' + next.price + ' монет">' + icon('i-coin') + next.price + '</button>'
              : '<span class="up-buy done">Всё куплено</span>') +
          '</div>';
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
