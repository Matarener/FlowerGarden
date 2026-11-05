/**
 * Сохранение прогресса игрока.
 *
 * Снимок состояния (GameState.toSave) пишется в два места:
 *   - localStorage — всегда, быстро и без сети;
 *   - Telegram CloudStorage — если игра открыта в Telegram, чтобы прогресс
 *     переносился между телефоном и компьютером.
 * При запуске читаются оба, берётся более свежий снимок (по savedAt).
 * Пишется не на каждое изменение, а с задержкой, плюс сразу при сворачивании игры.
 */

const KEY = 'flowerglade-save';
const SAVE_DELAY = 1500;   // мс тишины после изменения до записи
const CLOUD_TIMEOUT = 2500; // дольше облако при запуске не ждём

/** CloudStorage Telegram, если игра запущена внутри Telegram и он его поддерживает. */
function cloudStorage() {
  const tg = window.Telegram?.WebApp;
  if (!tg || !tg.initData || !tg.CloudStorage) return null;
  if (tg.isVersionAtLeast && !tg.isVersionAtLeast('6.9')) return null;
  return tg.CloudStorage;
}

function parse(text) {
  try { return text ? JSON.parse(text) : null; } catch (e) { return null; }
}

function readLocal() {
  try { return parse(localStorage.getItem(KEY)); } catch (e) { return null; }
}

let disabled = false; // после сброса больше ничего не записываем до перезагрузки

/**
 * Стереть сохранение везде (браузер и облако Telegram) и перезапустить игру с нуля.
 * Настройки графики и звука остаются.
 */
export function resetProgress() {
  disabled = true;
  try { localStorage.removeItem(KEY); } catch (e) { /* хранилище недоступно */ }
  const cloud = cloudStorage();
  const reload = () => location.reload();
  if (!cloud) { reload(); return; }
  const timer = setTimeout(reload, CLOUD_TIMEOUT);
  try { cloud.removeItem(KEY, () => { clearTimeout(timer); reload(); }); } catch (e) { clearTimeout(timer); reload(); }
}

function readCloud(cloud) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), CLOUD_TIMEOUT);
    try {
      cloud.getItem(KEY, (err, value) => { clearTimeout(timer); resolve(err ? null : parse(value)); });
    } catch (e) { clearTimeout(timer); resolve(null); }
  });
}

/**
 * Загрузить сохранение в состояние и дальше сохранять каждое изменение.
 * Вызывать до создания интерфейса, чтобы он сразу показал загруженные значения.
 * @param {import('./state.js').GameState} state
 * @returns {Promise<{ loaded: boolean, from: 'cloud'|'local'|null }>}
 */
export async function setupSave(state) {
  const cloud = cloudStorage();
  const local = readLocal();
  const remote = cloud ? await readCloud(cloud) : null;
  const newest = [remote, local].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
  const loaded = newest ? state.restore(newest) : false;

  let timer = 0;
  const write = () => {
    clearTimeout(timer);
    timer = 0;
    if (disabled) return;
    const text = JSON.stringify({ ...state.toSave(), savedAt: Date.now() });
    try { localStorage.setItem(KEY, text); } catch (e) { /* хранилище недоступно */ }
    if (cloud) { try { cloud.setItem(KEY, text, () => {}); } catch (e) { /* облако недоступно */ } }
  };
  state.on('change', () => {
    clearTimeout(timer);
    timer = setTimeout(write, SAVE_DELAY);
  });
  // при сворачивании или закрытии записать сразу, не дожидаясь задержки
  const flush = () => { if (timer) write(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);

  return { loaded, from: loaded ? (newest === remote ? 'cloud' : 'local') : null };
}
