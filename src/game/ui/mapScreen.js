import { $, $$, icon } from './dom.js';
import { LOCATIONS, LEVEL_COUNT } from '../data/content.js';
import { iconUrl } from '../art/icons.js';

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

  const pic = (key) => iconUrl(app.engine.textures, key);
  let decorated = false;

  function render() {
    const { state } = app;
    if (!decorated) { root.style.setProperty('--map-pattern', 'url(' + pic('map_pattern') + ')'); decorated = true; }
    coins.textContent = state.coins;
    stars.textContent = state.totalStars;
    const can = state.affordableCount();
    badge.hidden = !can;
    badge.textContent = can;

    let html = '';
    LOCATIONS.forEach((loc, li) => {
      const first = li * 10 + 1, last = Math.min(LEVEL_COUNT, li * 10 + 10);
      let got = 0;
      for (let n = first; n <= last; n++) { got += state.stars[n - 1] || 0; }
      const locked = first > state.unlocked;
      html += '<section class="map-loc loc-' + loc.bg + (locked ? ' locked' : '') + '">' +
        '<div class="map-ban"><img alt="" src="' + pic('map_' + loc.bg) + '">' +
          '<h2><span>' + loc.name + '</span></h2>' +
          '<span class="map-score" title="Звёзды на этой поляне">' + icon('i-star') + got + '<small>/' + (last - first + 1) * 3 + '</small></span>' +
          (locked ? '<span class="map-lock">' + icon('i-lock') + 'Пройди уровень ' + (first - 1) + '</span>' : '') +
        '</div><div class="map-nodes">';
      for (let n = first; n <= last; n++) {
        const open = n <= state.unlocked;
        const s = state.stars[n - 1];
        const current = n === state.unlocked && !s;
        html += '<button class="node' + (current ? ' current' : '') + (s ? ' done' : '') + '" type="button" data-n="' + n + '"' + (open ? '' : ' disabled') + ' aria-label="Уровень ' + n + (open ? '' : ', закрыт') + '">' +
          (current ? '<img class="node-hero" alt="" src="' + pic('map_tisha') + '">' : '') +
          '<b>' + (open ? n : icon('i-lock')) + '</b>' + (open ? '<span class="node-stars">' + starRow(s) + '</span>' : '') + '</button>';
      }
      html += '</div>' + '</section>';
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
