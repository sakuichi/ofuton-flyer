// IPA辞書(mecab-ipadic-seed)から「漢字を含む語 → 読み」の軽量辞書を作る
// 出力: dict/dict.txt（表層形<TAB>読み。名詞は読みの先頭に "."、人名は "!"）と dict/dict.b64（gzip+base64）
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const root = new URL('..', import.meta.url);
const D = new URL('node_modules/mecab-ipadic-seed/lib/dict/', root);
const kanji = /[\u4e00-\u9fff\u3005\u30f6]/;
const skip = new Set(['Noun.org.csv', 'Symbol.csv', 'Others.csv', 'Filler.csv', 'Postp.csv', 'Postp-col.csv', 'Auxil.csv']);
const badForm = new Set(['文語基本形', '仮定縮約１', '仮定縮約２', '命令ｙｏ', '体言接続特殊', '体言接続特殊２', '未然ヌ接続', '未然レル接続', '未然特殊', '文語命令形']);
const PLACE_LIMIT = 8200, PROPER_LIMIT = 8000; // 地名・固有名詞はコスト（=珍しさ）で足切り
const m = new Map();
const names = new Map(); // 人名（名字）。ふつうの語と表記が重なるときは、ふつうの語を優先する
for (const f of readdirSync(D).filter(f => f.endsWith('.csv') && !skip.has(f))) {
  for (const line of readFileSync(new URL(f, D), 'utf8').split('\n')) {
    if (!line) continue; const c = line.split(',');
    const s = c[0], cost = +c[3], form = c[9], r = c[11], noun = c[4] === '名詞';
    if (!kanji.test(s) || !r || s.length > 8 || badForm.has(form)) continue;
    if (f === 'Noun.place.csv' && cost > PLACE_LIMIT) continue;
    if (f === 'Noun.proper.csv' && cost > PROPER_LIMIT) continue;
    if (!/^[\u30a1-\u30fc]+$/.test(r)) continue;
    if (f === 'Noun.name.csv') {
      if (c[7] === '名') continue; // 下の名前は「今日子供」→「今日子」のような誤読を招くので除外
      const p = names.get(s); if (!p || cost < p[1]) names.set(s, ['!' + r, cost]); // "!" = 名詞かつ人名
      continue;
    }
    const p = m.get(s); if (!p || cost < p[1]) m.set(s, [(noun ? '.' : '') + r, cost]);
  }
}
let added = 0; for (const [s, v] of names) if (!m.has(s)) { m.set(s, v); added++; }
console.log('人名（名字）', added, '語を追加');
const txt = [...m].map(([s, [r]]) => s + '\t' + r).sort().join('\n');
writeFileSync(new URL('dict/dict.txt', root), txt);
const gz = gzipSync(Buffer.from(txt), { level: 9 });
writeFileSync(new URL('dict/dict.b64', root), gz.toString('base64'));
console.log('語数', m.size, '/ gzip', gz.length, 'bytes');
