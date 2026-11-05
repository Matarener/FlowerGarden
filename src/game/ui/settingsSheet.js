import { $, $$ } from './dom.js';
import { Sheet } from './Sheet.js';
import { resetProgress } from '../save.js';

const QUALITY = [
  ['auto', 'Авто', 'Само снижает разрешение, если кадров не хватает'],
  ['high', 'Высокое', 'Чёткая картинка на экранах с высокой плотностью'],
  ['medium', 'Среднее', 'Чуть мягче, заметно легче для видеокарты'],
  ['low', 'Низкое', 'Для слабых телефонов'],
];
const LIMITS = [[0, 'Нет'], [60, '60'], [30, '30']];

/**
 * Окно настроек: графика и звук. Каждое изменение сразу применяется и сохраняется.
 */
export function createSettingsSheet(app) {
  const { settings, sheet } = app;

  const segmented = (key, options) =>
    '<div class="seg" role="radiogroup">' + options.map(([value, label]) =>
      '<button class="seg-btn" type="button" role="radio" data-key="' + key + '" data-value="' + value + '" aria-checked="' + (settings.get(key) === value) + '">' + label + '</button>').join('') +
    '</div>';

  const toggle = (key, label, hint) =>
    '<label class="set-row toggle-row"><span><b>' + label + '</b>' + (hint ? '<small>' + hint + '</small>' : '') + '</span>' +
    '<input type="checkbox" class="switch" id="set-' + key + '" data-key="' + key + '"' + (settings.get(key) ? ' checked' : '') + '></label>';

  const slider = (key, label) => {
    const v = Math.round(settings.get(key) * 100);
    return '<div class="set-row slider-row"><label for="set-' + key + '"><b>' + label + '</b></label>' +
      '<input type="range" class="range" id="set-' + key + '" data-key="' + key + '" min="0" max="100" step="5" value="' + v + '" style="--v:' + v + '%">' +
      '<output id="out-' + key + '">' + (v ? v + '%' : 'выкл') + '</output></div>';
  };

  const qualityHint = () => QUALITY.find(([v]) => v === settings.get('quality'))[2];

  function open() {
    const panel = sheet.open(
      Sheet.head('Настройки') +
      '<div class="settings">' +
        '<section class="set-group"><h3>Звук</h3>' + slider('music', 'Музыка') + slider('sounds', 'Звуки') + '</section>' +
        '<section class="set-group"><h3>Графика</h3>' +
          '<div class="set-row column"><b>Качество</b>' + segmented('quality', QUALITY) + '<small id="quality-hint">' + qualityHint() + '</small></div>' +
          '<div class="set-row column"><b>Ограничение кадров</b>' + segmented('fpsLimit', LIMITS) +
            '<small>На экранах 90–120 Гц лимит 60 бережёт батарею</small></div>' +
          toggle('effects', 'Частицы и брызги', 'Пылинки, капли, искры') +
          toggle('showFps', 'Счётчик кадров') +
        '</section>' +
        '<button class="sbtn reset" type="button" id="set-reset"><span>Сбросить настройки</span></button>' +
        '<button class="sbtn reset danger" type="button" id="set-progress"><span>Начать игру заново</span></button>' +
      '</div>',
    );

    for (const b of $$('.seg-btn', panel)) {
      b.addEventListener('click', () => {
        const key = b.dataset.key;
        const value = key === 'fpsLimit' ? Number(b.dataset.value) : b.dataset.value;
        settings.set(key, value);
        for (const x of $$('.seg-btn[data-key="' + key + '"]', panel)) x.setAttribute('aria-checked', String(x === b));
        if (key === 'quality') $('#quality-hint', panel).textContent = qualityHint();
        app.sfx('tap');
      });
    }
    for (const c of $$('.switch', panel)) c.addEventListener('change', () => { settings.set(c.dataset.key, c.checked); app.sfx('tap'); });
    for (const r of $$('.range', panel)) {
      const out = $('#out-' + r.dataset.key, panel);
      r.addEventListener('input', () => {
        const v = Number(r.value);
        r.style.setProperty('--v', v + '%');
        out.textContent = v ? v + '%' : 'выкл';
        settings.set(r.dataset.key, v / 100);
      });
      if (r.dataset.key === 'sounds') r.addEventListener('change', () => app.sfx('coin'));
    }
    $('#set-reset', panel).addEventListener('click', () => { settings.reset(); open(); });
    // сброс прогресса — только со второго нажатия
    const wipe = $('#set-progress', panel);
    let armed = false;
    wipe.addEventListener('click', () => {
      app.sfx('tap');
      if (!armed) {
        armed = true;
        wipe.classList.add('armed');
        wipe.querySelector('span').textContent = 'Точно? Весь прогресс пропадёт. Нажмите ещё раз';
        return;
      }
      wipe.disabled = true;
      wipe.querySelector('span').textContent = 'Начинаем заново…';
      resetProgress();
    });
  }

  for (const b of $$('[data-open-settings]')) b.addEventListener('click', () => { app.sfx('tap'); open(); });
  return { open };
}
