/** Короткое сообщение внизу экрана. */
export function createToast(el, duration = 2200) {
  let timer = 0;
  return function toast(text) {
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), duration);
  };
}
