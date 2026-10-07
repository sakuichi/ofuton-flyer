// src/template.html に判定エンジンと読み辞書を埋め込んで index.html を作る
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const engine = read('src/engine.js').replace("if (typeof module !== 'undefined') module.exports = DJ;", '');
let html = read('src/template.html');
for (const mark of ['/*DICT*/', '/*ENGINE*/']) if (!html.includes(mark)) throw new Error('template.html に ' + mark + ' がありません');
html = html.replace('/*DICT*/', () => read('dict/dict.b64').trim()).replace('/*ENGINE*/', () => engine);
writeFileSync(new URL('index.html', root), html);
console.log('index.html を作成しました:', (html.length / 1024).toFixed(0), 'KB');
