// src/template.html に判定エンジンと読み辞書を埋め込んで index.html を作る。
// あわせて、点数帯ごとのカード用の入口ページ c/0.html〜c/6.html も作る。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const engine = read('src/engine.js').replace("if (typeof module !== 'undefined') module.exports = DJ;", '');
const tpl = read('src/template.html');
const mp4fix = read('src/mp4fix.js').replace("if (typeof module !== 'undefined') module.exports = MP4FIX;", '');
for (const mark of ['/*DICT*/', '/*ENGINE*/', '/*MP4FIX*/']) if (!tpl.includes(mark)) throw new Error('template.html に ' + mark + ' がありません');
const html = tpl.replace('/*DICT*/', () => read('dict/dict.b64').trim()).replace('/*ENGINE*/', () => engine).replace('/*MP4FIX*/', () => mp4fix);
writeFileSync(new URL('index.html', root), html);
console.log('index.html を作成しました:', (html.length / 1024).toFixed(0), 'KB');

// カードの入口ページ。Xなどはここのメタタグを読んで画像つきカードを出し、人が開くと本体へ転送される。
// 画像（c/N.png）は tools/make-cards.py で作る。点数帯の区切りは template.html の tierOf と合わせること。
const site = (tpl.match(/const SITE_URL = '([^']*)'/) || [])[1];
if (!site) throw new Error('template.html に SITE_URL がありません');
const TIERS = [
  ['布団が凍った', 'これより寒いダジャレ、ある？'],
  ['布団がめくれた', 'あなたのダジャレは、何メートル飛ぶ？'],
  ['布団が部屋の外までふっ飛んだ', 'このダジャレ、超えられる？'],
  ['布団がご近所までふっ飛んだ', 'このダジャレ、超えられる？'],
  ['布団が隣町までふっ飛んだ', 'このダジャレ、超えられる？'],
  ['布団が成層圏までふっ飛んだ', 'このダジャレ、超えられる？'],
  ['布団が元祖を超えて宇宙へ', 'このダジャレ、超えられる？']
];
mkdirSync(new URL('c/', root), { recursive: true });
TIERS.forEach(([title, desc], i) => {
  const page = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}｜ダジャレ布団飛ばし</title>
<meta name="robots" content="noindex">
<meta property="og:title" content="${title}｜ダジャレ布団飛ばし">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ダジャレ布団飛ばし">
<meta property="og:url" content="${site}c/${i}.html">
<meta property="og:image" content="${site}c/${i}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${site}c/${i}.png">
<script>location.replace('../' + location.search);</script>
</head>
<body>
<p><a href="../">ダジャレ布団飛ばしを開く</a></p>
</body>
</html>
`;
  writeFileSync(new URL(`c/${i}.html`, root), page);
});
console.log('c/0.html〜c/' + (TIERS.length - 1) + '.html を作成しました');
