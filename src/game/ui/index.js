import { createLevelUi } from './levelUi.js';
import { createMapScreen } from './mapScreen.js';
import { createShopSheet } from './shopSheet.js';
import { createFpsMeter } from './fpsMeter.js';
import { createSettingsSheet } from './settingsSheet.js';

/**
 * Весь HTML-интерфейс поверх игры. Модули получают общий контекст app
 * и общаются с игрой только через app.state, app.router и сцены движка.
 */
export function createUi(app) {
  return {
    level: createLevelUi(app),
    map: createMapScreen(app),
    shop: createShopSheet(app),
    fps: createFpsMeter(app),
    settings: createSettingsSheet(app),
  };
}
