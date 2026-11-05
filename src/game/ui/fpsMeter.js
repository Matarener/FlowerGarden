import { $ } from './dom.js';

/**
 * Счётчик кадров в углу экрана. Показ и ограничение кадров задаются в настройках;
 * быстрое нажатие на счётчик переключает ограничение 60 кадров.
 */
export function createFpsMeter(app) {
  const { perf, settings, toast } = app;
  const root = $('#fps');
  const fpsEl = $('#fps b', root);
  const msEl = $('#fps-ms', root);
  const hzEl = $('#fps-hz', root);

  const renderHz = () => {
    if (!perf.screenHz) { hzEl.textContent = 'измеряю экран…'; return; }
    const limit = perf.effectiveLimit;
    hzEl.textContent = 'экран ' + perf.screenHz + ' Гц · ' + (limit ? 'лимит ' + limit : 'без лимита');
    hzEl.classList.toggle('on', !!limit);
  };

  perf.events.on('stats', (s) => {
    if (root.hidden) return;
    if (s.paused) {
      fpsEl.textContent = '—';
      fpsEl.className = 'good';
      msEl.textContent = ' · пауза';
      msEl.className = '';
      return;
    }
    const target = perf.targetFps;
    fpsEl.textContent = s.fps;
    fpsEl.className = s.fps >= target * 0.92 ? 'good' : s.fps >= target * 0.66 ? 'mid' : 'bad';
    msEl.textContent = ' · ' + s.workMs.toFixed(1) + ' мс · пик ' + Math.round(s.peakMs) + ' · ×' + s.pixelRatio;
    msEl.className = s.peakMs > 40 ? 'spike' : '';
  });

  root.addEventListener('click', () => {
    const next = settings.get('fpsLimit') === 60 ? 0 : 60;
    settings.set('fpsLimit', next);
    if (next && !perf.effectiveLimit) toast('Экран ' + (perf.screenHz || 60) + ' Гц: больше 60 кадров и так не будет');
    else toast(next ? 'Ограничение 60 кадров включено' : 'Ограничение выключено');
  });

  const sync = () => {
    root.hidden = !settings.get('showFps');
    renderHz();
  };
  settings.on('change', sync);
  sync();
  return { renderHz };
}
