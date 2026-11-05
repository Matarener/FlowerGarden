/**
 * Движок (общий с «Грибницей»): Canvas 2D, без внешних зависимостей.
 * Всё, что нужно игре, импортируется отсюда.
 */
export { Engine } from './Engine.js';
export { Scene } from './Scene.js';
export { DisplayObject, Sprite, Label } from './display.js';
export { ParticleSystem } from './Particles.js';
export { TextureCache, TEXTURE_SCALE } from './TextureCache.js';
export { Painter, rgba, cssColor } from './Painter.js';
export { PerfMonitor } from './PerfMonitor.js';
export { Emitter } from './Emitter.js';
export { Ease } from './easing.js';
export { AudioManager } from './audio/AudioManager.js';
