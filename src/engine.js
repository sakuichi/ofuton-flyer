/* ダジャレ判定エンジン（ルールベース） */
const DJ = (() => {
  let DICT = null;
  const MAXW = 8;
  const isKanji = c => /[\u4e00-\u9fff\u3005\u30f6]/.test(c);
  const isKana = c => /[\u3041-\u3096\u30a1-\u30fa\u30fc]/.test(c);
  const toKata = s => s.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const DIGIT = { '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン', '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ' };
  const SMALL = 'ァィゥェォャュョヮ';
  const BOUND = 'はがをにでともへやのかだなねよ、。！？!?,.・「」 　…〜ー';
  const DAKU = {};
  'ガカギキグクゲケゴコザサジシズスゼセゾソダタヂチヅツデテドトバハビヒブフベヘボホパハピヒプフペヘポホヴウ'.replace(/(.)(.)/g, (_, a, b) => { DAKU[a] = b; });

  const FIX = { '行っ': 'イッ', '辛': 'カラ', '辛い': 'カライ', '辛く': 'カラク', '辛かっ': 'カラカッ', '何': 'ナニ', '私': 'ワタシ', '日本': 'ニホン', '上手': 'ジョウズ', '下手': 'ヘタ', '今日': 'キョウ', '明日': 'アシタ', '昨日': 'キノウ', '一人': 'ヒトリ', '二人': 'フタリ', '大人': 'オトナ' };
  const FIXN = ['私', '日本', '今日', '明日', '昨日', '一人', '二人', '大人'];
  const COUNTER = { '時': 'ジ', '分': 'フン', '円': 'エン', '人': 'ニン', '年': 'ネン', '月': 'ガツ', '日': 'ニチ', '個': 'コ', '回': 'カイ', '本': 'ホン', '枚': 'マイ', '匹': 'ヒキ', '歳': 'サイ', '才': 'サイ', '点': 'テン', '位': 'イ', '階': 'カイ', '倍': 'バイ', '秒': 'ビョウ' };
  function readNumber(d) {
    if (d.length > 4) return [...d].map(c => DIGIT[c]).join('');
    const n = d.padStart(4, '0'); let r = '';
    const U = ['セン', 'ヒャク', 'ジュウ', ''];
    const IRR = { '30': 'サンゼン', '80': 'ハッセン', '31': 'サンビャク', '61': 'ロッピャク', '81': 'ハッピャク' };
    for (let i = 0; i < 4; i++) {
      const c = n[i]; if (c === '0') continue;
      if (IRR[c + i]) r += IRR[c + i];
      else r += (c === '1' && i < 3 ? '' : DIGIT[c]) + U[i];
    }
    return r || 'ゼロ';
  }
  function setDict(text) {
    DICT = new Map();
    for (const line of text.split('\n')) {
      const i = line.indexOf('\t');
      if (i > 0) DICT.set(line.slice(0, i), line.slice(i + 1));
    }
    for (const k in FIX) DICT.set(k, (FIXN.includes(k) ? '.' : '') + FIX[k]);
  }

  // 人名の直後がひらがなのとき、「前半の語＋送りがなつきの語」に分けられるならそちらを優先する
  // 例: 明日香る → 明日＋香る、夏美しい → 夏＋美しい
  function splitsBetter(s, i, n) {
    if (!/[\u3041-\u3096]/.test(s[i + n] || '')) return false;
    for (let k = 1; k < n; k++) {
      const head = DICT.get(s.substr(i, k)); if (!head || head[0] === '!') continue;
      for (let m = 1; m <= MAXW - (n - k) && i + n + m <= s.length; m++) {
        if (!/[\u3041-\u3096]/.test(s[i + n + m - 1])) break;
        const tail = DICT.get(s.substr(i + k, n - k + m)); if (tail && tail[0] !== '!') return true;
      }
    }
    return false;
  }
  // 文を「かなの連なり」と「漢字を含む語」に分ける
  function tokenize(text) {
    const s = text.normalize('NFKC');
    const toks = []; const unknown = [];
    let i = 0;
    while (i < s.length) {
      let hit = null;
      if (DICT) {
        for (let n = Math.min(MAXW, s.length - i); n >= 1; n--) {
          const w = s.substr(i, n);
          if (!/[\u4e00-\u9fff\u3005\u30f6]/.test(w)) continue;
          const r = DICT.get(w);
          if (r) {
            const name = r[0] === '!', noun = name || r[0] === '.';
            if (name && splitsBetter(s, i, n)) continue; // 「明日香る」を人名の「明日香」と読まない
            hit = { surface: w, reading: noun ? r.slice(1) : r, kind: 'word', noun, name }; break;
          }
        }
      }
      if (hit) { toks.push(hit); i += hit.surface.length; continue; }
      const c = s[i];
      if (isKana(c)) {
        const last = toks[toks.length - 1];
        if (last && last.kind === 'kana') { last.surface += c; last.reading += toKata(c); }
        else toks.push({ surface: c, reading: toKata(c), kind: 'kana' });
      } else if (DIGIT[c]) {
        let d = c; while (DIGIT[s[i + d.length]]) d += s[i + d.length];
        toks.push({ surface: d, reading: readNumber(d), kind: 'word' });
        i += d.length;
        if (COUNTER[s[i]]) { toks.push({ surface: s[i], reading: COUNTER[s[i]], kind: 'word' }); i++; }
        continue;
      } else if (isKanji(c)) {
        unknown.push(c); toks.push({ surface: c, reading: '', kind: 'gap' });
      } else {
        toks.push({ surface: c, reading: '', kind: 'gap' });
      }
      i++;
    }
    return { toks, unknown };
  }

  // 読みを拍（モーラ）に分け、元の語との対応を持たせる
  function toMorae(toks) {
    const out = [];
    toks.forEach((t, ti) => {
      const r = t.reading; let n = 0;
      for (let k = 0; k < r.length; k++) {
        const c = r[k];
        if (SMALL.includes(c) && out.length && out[out.length - 1].ti === ti) {
          const m = out[out.length - 1]; m.k += c; if (t.kind === 'kana') m.src += t.surface[k];
        } else {
          out.push({ k: c, ti, pos: n++, src: t.kind === 'kana' ? t.surface[k] : null, ci: k });
        }
      }
      t.moraCount = n;
    });
    return out;
  }

  const VROW = { 'ア': 'アカサタナハマヤラワガザダバパァャヮ', 'イ': 'イキシチニヒミリギジヂビピィ', 'ウ': 'ウクスツヌフムユルグズヅブプゥュヴ', 'エ': 'エケセテネヘメレゲゼデベペェ', 'オ': 'オコソトノホモヨロヲゴゾドボポォョ' };
  const LONG = { 'ア': 'ア', 'イ': 'イ', 'ウ': 'ウ', 'エ': 'イ', 'オ': 'ウ' };
  const vowelOf = k => { const c = k[k.length - 1]; for (const v in VROW) if (VROW[v].includes(c)) return v; return null; };
  // ゆるい比較用の列：促音は無視、長音は母音に直す
  function loosen(morae, stripDaku) {
    const seq = [];
    morae.forEach((m, idx) => {
      let k = m.k;
      if (k === 'ッ') return;
      if (k === 'ー') { const p = seq[seq.length - 1]; const v = p && vowelOf(p.k); if (!v) return; k = LONG[v]; }
      k = k.replace('ヲ', 'オ').replace('ヂ', 'ジ').replace('ヅ', 'ズ');
      if (stripDaku) k = (DAKU[k[0]] || k[0]) + k.slice(1);
      seq.push({ k, idx });
    });
    return seq;
  }

  function describe(morae, toks, a, b) {
    // a..b は拍の添字（両端含む）
    const kana = morae.slice(a, b + 1).map(m => m.k).join('');
    let sig = ''; let lastTi = -1; const units = new Set(); let partial = false; let hasWord = false;
    for (let i = a; i <= b; i++) {
      const m = morae[i]; const t = toks[m.ti]; units.add(m.ti);
      if (t.kind === 'kana') sig += m.src;
      else { hasWord = true; if (m.ti !== lastTi) sig += t.surface; }
      lastTi = m.ti;
    }
    const first = morae[a], last = morae[b];
    const tf = toks[first.ti], tl = toks[last.ti];
    if (tf.kind !== 'kana' && first.pos > 0) partial = true;
    if (tl.kind !== 'kana' && last.pos < tl.moraCount - 1) partial = true;
    let embedded = false;
    if (tl.kind === 'kana') {
      const nx = morae[b + 1];
      if (nx && nx.ti === last.ti && !BOUND.includes(nx.src[0]) && nx.k !== 'ッ') embedded = true;
    }
    if (tl.kind !== 'kana' && last.pos === tl.moraCount - 1) {
      const nt = toks[last.ti + 1];
      if (nt && nt.kind === 'kana' && 'っッ'.includes(nt.surface[0])) embedded = true;
    }
    if (tf.kind === 'kana') {
      const pv = morae[a - 1];
      if (pv && pv.ti === first.ti && !BOUND.includes(pv.src[pv.src.length - 1])) embedded = true;
    }
    return { kana, sig, cross: units.size > 1, partial, embedded, hasWord };
  }

  // A=漢字の名詞を含む側、B=かなだけの側。Bが「Aをかなで書いただけ」なら true
  function isVariant(morae, toks, A, B, a, a2, len) {
    if (!A.hasWord || A.partial || B.hasWord || B.embedded) return false;
    for (let k = 0; k < len; k++) {
      const mA = morae[a + k], mB = morae[a2 + k], tA = toks[mA.ti];
      if (!mA || !mB || mA.k !== mB.k) return false;
      if (tA.kind === 'kana') { if (mA.src !== mB.src) return false; }
      else if (!tA.noun) return false;
    }
    return true;
  }
  function looseKana(str) {
    const tk = [{ surface: str, reading: toKata(str), kind: 'kana' }];
    return loosen(toMorae(tk), false).map(x => x.k).join('');
  }

  const LEN_PTS = [0, 0, 14, 24, 32, 37, 40];
  const CLASSICS = ['アルミカンノウエニアルミカン', 'デンワニデンワ', 'トイレニイトイレ', 'ネコガネコンダ', 'イルカガイルカ', 'スキイガスキ', 'コウチョウセンセイゼコウチョウ', 'ラクダハラクダ', 'ラクダワラクダ', 'ダジャレオイウノハダレジャ', 'ダジャレオイウノワダレジャ', 'ナイヨウガナイヨウ', 'カエルガカエル', 'ハエハハエ', 'ハエワハエ', 'ウマガウマイ', 'イクラハイクラ', 'イクラワイクラ', 'チャイロイチャ'];
  const GANSO = 'フトンガフトンダ';

  function judge(text, yomiOverride) {
    let toks, unknown = [];
    if (yomiOverride != null && yomiOverride.trim()) {
      const y = yomiOverride.normalize('NFKC');
      toks = []; 
      for (const c of y) {
        const last = toks[toks.length - 1];
        if (isKana(c)) { if (last && last.kind === 'kana') { last.surface += c; last.reading += toKata(c); } else toks.push({ surface: c, reading: toKata(c), kind: 'kana' }); }
        else toks.push({ surface: c, reading: '', kind: 'gap' });
      }
    } else ({ toks, unknown } = tokenize(text));
    const morae = toMorae(toks);
    const yomi = toks.map(t => t.kind === 'gap' ? (isKanji(t.surface) ? '〓' : '') : t.reading).join('');
    const res = { text, yomi, morae: morae.map(m => m.k), unknown, total: morae.length, score: 0, parts: { len: 0, dens: 0, twist: 0, crisp: 0 }, match: null, notes: [], kind: 'none' };
    if (morae.length < 3) { res.kind = 'short'; return res; }

    let best = null;
    for (const tier of [0, 1]) {
      const seq = loosen(morae, tier === 1); const n = seq.length;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (seq[i].k !== seq[j].k) continue;
        if (i > 0 && seq[i - 1].k === seq[j - 1].k) continue; // より長い一致の途中
        let L = 0; while (i + L < j && j + L < n && seq[i + L].k === seq[j + L].k) L++;
        if (L < 2) continue;
        const a1 = seq[i].idx, b1 = seq[i + L - 1].idx, a2 = seq[j].idx, b2 = seq[j + L - 1].idx;
        const d1 = describe(morae, toks, a1, b1), d2 = describe(morae, toks, a2, b2);
        const exact = d1.kana === d2.kana;
        const sameSurface = d1.sig === d2.sig;
        const adjacent = b1 + 1 === a2;
        const twistShape = d1.cross || d2.cross || d1.partial || d2.partial || d1.embedded || d2.embedded;
        let rep = false, maybeRep = false;
        if (sameSurface && exact) {
          if (d1.hasWord || d2.hasWord) rep = !(d1.embedded || d2.embedded);
          else if (adjacent) rep = true;
          else if (!d1.embedded && !d2.embedded) maybeRep = true;
        }
        let variant = false;
        if (exact && !sameSurface && !rep && !maybeRep && (b1 - a1) === (b2 - a2)) {
          const n1 = b1 - a1 + 1;
          variant = isVariant(morae, toks, d1, d2, a1, a2, n1) || isVariant(morae, toks, d2, d1, a2, a1, n1);
        }
        const len = LEN_PTS[Math.min(L, 6)] * (tier === 1 && !exact ? 0.8 : 1);
        const cover = (2 * L) / n;
        const dens = 25 * Math.min(1, cover / 0.7);
        let twist = 0;
        if (!sameSurface) twist += 10; else if (!rep && !maybeRep) twist += 6;
        if (twistShape) twist += 8;
        twist += exact ? 6 : (tier === 0 ? 7 : 3);
        const N = morae.length;
        const crisp = N <= 10 ? 10 : N <= 14 ? 8 : N <= 20 ? 5 : N <= 30 ? 2 : 0;
        let score = len + dens + twist + crisp;
        score *= Math.max(0.3, Math.min(1, cover / 0.35));
        if (rep) score = Math.min(score * 0.12, 8);
        else if (maybeRep) score *= 0.4;
        const scoreV = score * 0.4;
        if (!best || (variant ? scoreV : score) > best.eff + 1e-9) best = { eff: variant ? scoreV : score, variant, score, L, tier, exact, rep, maybeRep, a1, b1, a2, b2, d1, d2, parts: { len, dens, twist, crisp }, cover };
      }
    }
    if (!best) return res;
    const looseAll = loosen(morae, false).map(x => x.k).join('');
    const isClassic = CLASSICS.some(c => looseAll.includes(c));
    if (best.variant && !isClassic) best.score = best.eff; else best.variant = false;
    res.kind = best.rep ? 'repeat' : best.maybeRep ? 'maybe' : best.variant ? 'variant' : 'pun';
    const k = best.score / (best.parts.len + best.parts.dens + best.parts.twist + best.parts.crisp);
    res.parts = { len: best.parts.len * k, dens: best.parts.dens * k, twist: best.parts.twist * k, crisp: best.parts.crisp * k };
    res.match = { a1: best.a1, b1: best.b1, a2: best.a2, b2: best.b2, k1: best.d1.kana, k2: best.d2.kana, s1: best.d1.sig, s2: best.d2.sig, L: best.L, exact: best.exact, tier: best.tier };
    let score = best.score;
    if (looseAll.includes(GANSO)) { res.ganso = true; score = 100; }
    else if (res.kind === 'pun' && isClassic) { res.classic = true; score -= 12; }
    res.score = Math.max(0, Math.min(100, Math.round(score)));
    return res;
  }

  const meters = s => s <= 0 ? 0 : Math.pow(10, s / 25) - 1;
  return { setDict, judge, meters, tokenize, looseKana };
})();
if (typeof module !== 'undefined') module.exports = DJ;
