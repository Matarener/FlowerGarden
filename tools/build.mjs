// Сборка в один файл dist/index.html: все модули и стили внутри.
// Такой файл можно открыть двойным щелчком или выложить на хостинг для Telegram.
//   npm install      (один раз, ставит esbuild)
//   npm run build
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const js = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020', 'safari14'],
  write: false,
  legalComments: 'none',
});
const css = await readFile('styles/main.css', 'utf8');
let html = await readFile('index.html', 'utf8');

html = html
  // подсказка про запуск из файла в собранной версии не нужна: там всё внутри одного файла
  .replace(/<script>\s*\/\/ Модули не загружаются[\s\S]*?<\/script>\s*/, '')
  .replace('<link rel="stylesheet" href="styles/main.css">', () => '<style>\n' + css + '\n</style>')
  .replace('<script type="module" src="src/main.js"></script>', () => '<script>\n' + js.outputFiles[0].text + '\n</script>');

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('Готово: dist/index.html, ' + Math.round(html.length / 1024) + ' КБ');
