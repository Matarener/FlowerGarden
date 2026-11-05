/** Мелкие помощники для работы с разметкой. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Значок из спрайта <svg><symbol> в index.html. */
export const icon = (id, cls = '') => '<svg aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '><use href="#' + id + '"/></svg>';

export const formatTime = (ms) => {
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** Перезапуск CSS-анимации «подпрыгивания» элемента. */
export function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}
