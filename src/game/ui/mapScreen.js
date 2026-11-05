import { $, $$, icon } from './dom.js';
import { LOCATIONS, LEVEL_COUNT } from '../data/content.js';

/**
 * Карта уровней: три поляны по десять уровней, звёзды за каждый, кнопка лавки.
 * Целиком HTML, игровой цикл в это время на паузе.
 */
export function createMapScreen(app) {
  const root = $('#scr-map');
  const list = $('#m-list');
  const coins = $('#m-coins');
  const stars = $('#m-stars');
  const badge = $('#m-shop-badge');

  function starRow(n) {
    return [1, 2, 3].map((k) => icon(k <= n ? 'i-star' : 'i-star-empty')).join('');
  }

  function render() {
    const { state } = app;
    coins.textContent = state.coins;
    stars.textContent = state.totalStars;
    const can = state.affordableCount();
    badge.hidden = !can;
    badge.textContent = can;

    let html = '';
    LOCATIONS.forEach((loc, li) => {
      html += '<section class="map-loc loc-' + loc.bg + '"><h2>' + loc.name + '</h2><div class="map-nodes">';
      for (let n = li * 10 + 1; n <= Math.min(LEVEL_COUNT, li * 10 + 10); n++) {
        const open = n <= state.unlocked;
        const s = state.stars[n - 1];
        const current = n === state.unlocked && !s;
        html += '<button class="node' + (current ? ' current' : '') + (s ? ' done' : '') + '" type="button" data-n="' + n + '"' + (open ? '' : ' disabled') + ' aria-label="Уровень ' + n + (open ? '' : ', закрыт') + '">' +
          '<b>' + (open ? n : icon('i-lock')) + '</b>' + (open ? '<span class="node-stars">' + starRow(s) + '</span>' : '') + '</button>';
      }
      html += '</div></section>';
    });
    list.innerHTML = html;
    for (const b of $$('.node', list)) {
      b.addEventListener('click', () => { app.sfx('tap'); app.ui.level.showIntro(Number(b.dataset.n)); });
    }
  }

  /** Прокрутить к текущему уровню. */
  function scrollToCurrent() {
    const cur = $('.node.current', list) || $$('.node:not([disabled])', list).pop();
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  $('#m-shop').addEventListener('click', () => { app.sfx('tap'); app.ui.shop.open(); });
  app.state.on('change', () => { if (!root.hidden) render(); });

  return {
    show() { root.hidden = false; render(); scrollToCurrent(); },
    hide() { root.hidden = true; },
    render,
  };
}
