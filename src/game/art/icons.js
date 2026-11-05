/**
 * Картинки для HTML-интерфейса из готовых текстур: data:URL создаётся один раз на ключ.
 */
const cache = new Map();

export function iconUrl(textures, key) {
  if (cache.has(key)) return cache.get(key);
  const url = textures.get(key).canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
