import { $ } from './ui/dom.js';

/**
 * Переключение экранов: титульный, карта, уровень.
 * Отвечает за то, какая сцена движка показана, какие HTML-слои видны,
 * какая играет музыка и когда игровой цикл можно поставить на паузу.
 */
export function createRouter(app) {
  const frame = $('#frame');
  const levelLayer = $('#level-ui');
  let screen = 'title';

  /** Цикл работает только там, где игру видно: на титульном и на уровне без открытого окна. */
  function syncPause() {
    const running = screen === 'title' || (screen === 'level' && !app.sheet.isOpen);
    if (running) app.engine.resume();
    else app.engine.pause();
  }

  function go(name, arg) {
    const { engine, perf } = app;
    const prev = screen;
    app.sheet.close();
    screen = name;
    frame.dataset.screen = name;
    perf.hold(3000);

    const music = name === 'level' ? 'garden' : 'menu';
    app.audio.load(music);
    app.audio.playMusic(music);

    if (prev === 'level') engine.stopScene('level');
    levelLayer.hidden = name !== 'level';
    if (name === 'map') app.ui.map.show(); else app.ui.map.hide();

    if (name === 'level') {
      const scene = engine.show('level', { n: arg }, { restart: true });
      app.ui.level.setup(scene);
    }
    syncPause();
  }

  return { go, syncPause, get screen() { return screen; } };
}
