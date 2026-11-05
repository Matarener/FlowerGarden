import { $ } from './dom.js';

/**
 * Титульный экран поверх поляны: название, полоска загрузки, кнопка «Играть».
 * Нажатие на «Играть» заодно разблокирует звук в браузере.
 */
export function createTitleScreen(app) {
  const root = $('#title');
  const fill = $('#load-fill');
  const text = $('#load-text');
  const load = $('#load');
  const play = $('#btn-play');

  return {
    progress(part, label) {
      fill.style.width = Math.round(part * 100) + '%';
      if (label) text.textContent = label;
    },

    /** Загрузка закончена: показать кнопку и ждать нажатия. */
    ready(onPlay) {
      load.hidden = true;
      play.hidden = false;
      play.focus({ preventScroll: true });
      play.addEventListener('click', () => {
        app.sfx('unlock');
        root.classList.add('leaving');
        onPlay();
        setTimeout(() => { root.hidden = true; }, 400);
      }, { once: true });
    },
  };
}
