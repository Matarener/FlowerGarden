import { $ } from './dom.js';

/**
 * Нижняя шторка и модальные окна. Одновременно открыто не больше одного окна.
 * Всё, что окно запускает (таймеры, подписки), регистрируется через onClose и
 * гарантированно снимается при закрытии.
 */
export class Sheet {
  constructor(el, { onChange } = {}) {
    this.el = el;
    this.isOpen = false;
    this._cleanups = [];
    this._onChange = onChange || (() => {});
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen && !this._modal) this.close();
    });
  }

  /**
   * @param {string} html
   * @param {{ modal?: boolean }} [opts]  modal — нельзя закрыть нажатием мимо окна
   * @returns {HTMLElement} панель окна
   */
  open(html, { modal = false } = {}) {
    if (this.isOpen) this.close();
    this._modal = modal;
    this.el.innerHTML =
      '<div class="sheet-bg"' + (modal ? '' : ' data-close') + '></div>' +
      '<div class="sheet-panel" role="dialog" aria-modal="true">' + html + '</div>';
    this.el.hidden = false;
    this.isOpen = true;
    for (const el of this.el.querySelectorAll('[data-close]')) el.addEventListener('click', () => this.close());
    this._onChange(true, modal);
    return $('.sheet-panel', this.el);
  }

  close() {
    if (!this.isOpen) return;
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this.el.hidden = true;
    this.el.innerHTML = '';
    this.isOpen = false;
    this._onChange(false, false);
  }

  onClose(fn) {
    this._cleanups.push(fn);
  }

  /** Заголовок окна с кнопкой закрытия. */
  static head(title, subtitle) {
    return '<div class="sheet-head"><div><h2 class="sheet-title">' + title + '</h2>' +
      (subtitle ? '<p class="sheet-sub">' + subtitle + '</p>' : '') +
      '</div><button class="close" type="button" data-close aria-label="Закрыть">✕</button></div>';
  }
}
