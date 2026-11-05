import { Engine, PerfMonitor, AudioManager } from './engine/index.js';
import { GameState } from './game/state.js';
import { makeCritterTextures } from './game/art/critters.js';
import { makeFlowerTextures } from './game/art/flowers.js';
import { makeGardenTextures, gladeBackground } from './game/art/gardenArt.js';
import { makeUpgradeTextures, UPGRADE_ICON_KEYS } from './game/art/upgradesArt.js';
import { makeMapTextures, MAP_ICON_KEYS } from './game/art/mapArt.js';
import { iconUrl } from './game/art/icons.js';
import { FLOWER_KEYS, LOCATIONS } from './game/data/content.js';
import { TitleScene } from './game/scenes/TitleScene.js';
import { LevelScene } from './game/scenes/LevelScene.js';
import { createTitleScreen } from './game/ui/titleScreen.js';
import { Sheet } from './game/ui/Sheet.js';
import { createToast } from './game/ui/toast.js';
import { createUi } from './game/ui/index.js';
import { createRouter } from './game/router.js';
import { setupSave } from './game/save.js';
import { $ } from './game/ui/dom.js';
import { Settings, QUALITY_RATIO } from './game/settings.js';
import { SOUNDS } from './game/audio/sounds.js';
import { MUSIC } from './game/audio/music.js';

/**
 * Точка входа «Цветочной поляны»: собирает движок, состояние, интерфейс и сцены.
 *
 * Общий контекст app передаётся сценам (scene.app) и модулям интерфейса:
 *   app.engine, app.perf, app.audio, app.settings, app.state, app.sheet, app.toast, app.ui, app.router
 *   app.sfx(name) — проиграть звук
 */
async function boot() {
  const frame = $('#frame');
  const engine = new Engine({ container: $('#game'), designWidth: 390, designHeight: 844, background: '#8cc063' });
  const audio = new AudioManager();
  for (const [name, def] of Object.entries(SOUNDS)) audio.define(name, def);
  for (const [name, def] of Object.entries(MUSIC)) audio.define(name, def);
  audio.unlockOnGesture();

  const app = {
    engine,
    audio,
    settings: new Settings(),
    perf: new PerfMonitor(engine),
    sfx: (name, opts) => audio.play(name, opts),
    state: new GameState(),
    reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    toast: createToast($('#toast')),

    /** Игровые координаты центра HTML-элемента (куда лететь монетке). */
    hudPoint(selector) {
      const canvas = engine.renderer.dynamicCanvas.getBoundingClientRect();
      const r = $(selector).getBoundingClientRect();
      return engine.renderer.screenToWorld(r.left + r.width / 2 - canvas.left, r.top + r.height / 2 - canvas.top);
    },
  };
  engine.app = app;
  const saveReady = setupSave(app.state);
  app.sheet = new Sheet($('#sheet'), {
    onChange: (open, modal) => {
      if (open && !modal) app.sfx('open');
      if (app.router) app.router.syncPause();
    },
  });
  const setUnit = (r) => { if (r.width) frame.style.setProperty('--u', r.zoom / r.pixelRatio + 'px'); };
  engine.events.on('resize', setUnit);
  applySettings(app);
  app.settings.on('change', (key) => applySettings(app, key));
  setUnit(engine.renderer);

  // подписи на текстурах рисуются шрифтом Unbounded: ждём его, но не дольше 1.5 с
  if (document.fonts?.load) {
    const fonts = document.fonts.load('700 15px Unbounded');
    await Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  }
  // для титульного экрана нужно почти всё: зверята, цветы и поляна
  makeCritterTextures(engine.textures);
  makeFlowerTextures(engine.textures);
  makeGardenTextures(engine.textures);
  // картинки карты и лавки нужны сразу после титульного экрана
  makeMapTextures(engine.textures);
  makeUpgradeTextures(engine.textures);

  await saveReady;
  app.ui = createUi(app);
  app.router = createRouter(app);
  engine.register('title', TitleScene).register('level', LevelScene);

  engine.start();
  engine.show('title');
  $('#loading').hidden = true;
  const title = createTitleScreen(app);

  // остальное готовится, пока на титульном экране бегает Тиша
  const frame2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const steps = [
    ['Раскладываем семена…', () => FLOWER_KEYS.forEach((k) => { iconUrl(engine.textures, 'fl_' + k); iconUrl(engine.textures, 'bq_' + k); })],
    ['Рисуем карту…', () => { MAP_ICON_KEYS.concat(UPGRADE_ICON_KEYS).forEach((k) => iconUrl(engine.textures, k)); }],
    ['Расчищаем поляны…', () => {
      // фон ближайшего места, чтобы первый уровень открылся без задержки
      const n = app.state.unlocked;
      const place = LOCATIONS[Math.min(LOCATIONS.length - 1, Math.floor((n - 1) / 10))].bg;
      gladeBackground(engine.textures, engine.renderer, place);
    }],
    ['Настраиваем звуки…', () => audio.preload(Object.keys(SOUNDS))],
  ];
  for (let i = 0; i < steps.length; i++) {
    title.progress(i / steps.length, steps[i][0]);
    await frame2();
    await steps[i][1]();
  }
  title.progress(1, 'Готово!');
  await frame2();

  title.ready(() => {
    app.router.go('map');
    // новичку сразу предлагаем первый уровень
    if (!app.state.stars[0]) app.ui.level.showIntro(1);
    engine.stopScene('title');
  });
  audio.preload(['menu', 'garden']);
  setTimeout(() => app.perf.measureScreenHz().then(() => app.ui.fps.renderHz()), 2500);

  window.flowerglade = app; // для отладки из консоли
}

/** Применить настройки к движку и звуку. */
function applySettings(app, key) {
  const { engine, perf, audio, settings } = app;
  const v = settings.values;
  const all = !key;
  if (all || key === 'quality') {
    perf.adaptive = v.quality === 'auto';
    engine.setFixedPixelRatio(v.quality === 'auto' ? null : QUALITY_RATIO[v.quality]);
  }
  if (all || key === 'fpsLimit') perf.setLimit(v.fpsLimit);
  if (all || key === 'effects') engine.effectsEnabled = v.effects;
  if (all || key === 'music') audio.setMusicVolume(v.music);
  if (all || key === 'sounds') audio.setSfxVolume(v.sounds);
}

boot();
