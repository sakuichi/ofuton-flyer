// 判定エンジンの回帰テスト: node test/judge.test.js
const DJ = require('../src/engine.js');
DJ.setDict(require('fs').readFileSync(require('path').join(__dirname, '../dict/dict.txt'), 'utf8'));
// [入力, 期待する種類, 最低点, 最高点]
const cases = [
  ['布団が吹っ飛んだ', 'pun', 100, 100],
  ['焼肉は焼きにくい', 'pun', 85, 95],
  ['レモンの入れもん', 'pun', 78, 88],
  ['アルミ缶の上にあるミカン', 'pun', 77, 87],
  ['草刈ったら臭かった', 'pun', 72, 82],
  ['電話に出んわ', 'pun', 66, 76],
  ['猫が寝込んだ', 'pun', 51, 61],
  ['内容がないよう', 'pun', 66, 76],
  ['傷んだ廊下にいたんだろうか', 'pun', 89, 99],
  ['梨は無し', 'pun', 60, 70],
  ['カエルが帰る', 'pun', 58, 68],
  ['ゆで卵をゆでたまご', 'variant', 30, 45],
  ['布団とふとん', 'variant', 20, 40],
  ['梨はなし', 'variant', 20, 35],
  ['布団と布団', 'repeat', 0, 10],
  ['ももとももをたべた', 'maybe', 10, 25],
  // 名字（IPA辞書の人名から姓だけ収録）
  ['佐藤さんは砂糖が好き', 'pun', 60, 72],
  ['加藤が勝とう', 'pun', 78, 88],
  ['近藤が今度来る', 'pun', 74, 84],
  ['今日はいい天気ですね', 'none', 0, 0],
  ['私は昨日友達と映画を見に行きました', 'none', 0, 0],
];
// 読みの確認（人名を足しても、ふつうの文を取り違えないこと）
const yomi = [
  ['明日香る花を買いに行く', 'アシタカオルハナヲカイニイク'],
  ['夏美しい海へ行きたい', 'ナツウツクシイウミヘイキタイ'],
  ['今日子供が生まれました', 'キョウコドモガウマレマシタ'],
  ['東の空が明るくなってきた', 'ヒガシノソラガアカルクナッテキタ'],
  ['高橋を渡って学校へ行く', 'タカハシヲワタッテガッコウヘイク'],
  ['佐藤さん', 'サトウサン'],
];
let ng = 0;
for (const [t, want] of yomi) {
  const got = DJ.judge(t).yomi; const ok = got === want; if (!ok) ng++;
  console.log(ok ? 'ok  ' : 'NG  ', '読み', t, '→', got, ok ? '' : `(期待: ${want})`);
}
for (const [t, kind, lo, hi] of cases) {
  const r = DJ.judge(t); const ok = r.kind === kind && r.score >= lo && r.score <= hi; if (!ok) ng++;
  console.log(ok ? 'ok  ' : 'NG  ', String(r.score).padStart(3), r.kind.padEnd(7), t, ok ? '' : `(期待: ${kind} ${lo}〜${hi})`);
}
console.log(ng ? `\n${ng}件が期待と違います` : '\nすべて期待どおり'); process.exit(ng ? 1 : 0);
