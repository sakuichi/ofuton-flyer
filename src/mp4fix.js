/* 断片化MP4（MediaRecorderの出力）を、ふつうのMP4に組み直す。
   MediaRecorderは録画しながら書き出すので、長さの情報が先頭に正しく入らず、
   プレーヤーによっては再生時間がでたらめに表示される。全サンプルの表を先頭に持つ形に作り直すと直る。
   defrag(Uint8Array) → Uint8Array。断片化されていない・読めない場合は null を返す（呼び出し側は元のファイルを使う）。 */
const MP4FIX = (() => {
  const u32 = (b, o) => b[o] * 16777216 + (b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]);
  const i32 = (b, o) => u32(b, o) | 0;
  const u64 = (b, o) => u32(b, o) * 4294967296 + u32(b, o + 4);
  const name = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  function boxes(b, start, end) {
    const out = []; let o = start;
    while (o + 8 <= end) {
      let size = u32(b, o), head = 8; const type = name(b, o + 4);
      if (size === 1) { size = u64(b, o + 8); head = 16; } else if (size === 0) size = end - o;
      if (size < head || o + size > end) throw new Error('bad box');
      out.push({ type, start: o, head, end: o + size }); o += size;
    }
    return out;
  }
  const cat = arrs => { let n = 0; arrs.forEach(a => { n += a.length; }); const o = new Uint8Array(n); let p = 0; arrs.forEach(a => { o.set(a, p); p += a.length; }); return o; };
  const ints = vals => { const o = new Uint8Array(vals.length * 4), dv = new DataView(o.buffer); vals.forEach((v, i) => dv.setUint32(i * 4, v >>> 0)); return o; };
  const box = (type, ...payload) => { const body = cat(payload); return cat([ints([body.length + 8]), Uint8Array.from(type, ch => ch.charCodeAt(0)), body]); };

  function defrag(src) {
    const kids = bx => boxes(src, bx.start + bx.head, bx.end), find = (bx, t) => kids(bx).find(k => k.type === t);
    const top = boxes(src, 0, src.length), moov = top.find(x => x.type === 'moov'), moofs = top.filter(x => x.type === 'moof');
    if (!moov || !moofs.length) return null;
    const mvhd = find(moov, 'mvhd'), mvex = find(moov, 'mvex'), mvV = src[mvhd.start + mvhd.head];
    const movieTs = u32(src, mvhd.start + mvhd.head + 4 + (mvV ? 16 : 8));
    const tracks = {};
    kids(moov).filter(x => x.type === 'trak').forEach(trak => {
      const tkhd = find(trak, 'tkhd'), mdhd = find(find(trak, 'mdia'), 'mdhd');
      const id = u32(src, tkhd.start + tkhd.head + 4 + (src[tkhd.start + tkhd.head] ? 16 : 8));
      tracks[id] = { trak, ts: u32(src, mdhd.start + mdhd.head + 4 + (src[mdhd.start + mdhd.head] ? 16 : 8)), samples: [], chunks: [], time: 0, trex: { dur: 0, size: 0, flags: 0 } };
    });
    if (mvex) kids(mvex).filter(x => x.type === 'trex').forEach(x => { const p = x.start + x.head + 4, t = tracks[u32(src, p)]; if (t) t.trex = { dur: u32(src, p + 8), size: u32(src, p + 12), flags: u32(src, p + 16) }; });

    // すべての断片を読み、サンプル（長さ・大きさ・位置）を集める
    const order = [];
    moofs.forEach(moof => {
      let prevEnd = null;
      kids(moof).filter(x => x.type === 'traf').forEach(traf => {
        const tfhd = find(traf, 'tfhd'); let p = tfhd.start + tfhd.head; const fl = u32(src, p) & 0xffffff, t = tracks[u32(src, p + 4)]; p += 8;
        if (!t) return;
        let base = null, dDur = t.trex.dur, dSize = t.trex.size, dFlags = t.trex.flags;
        if (fl & 1) { base = u64(src, p); p += 8; }
        if (fl & 2) p += 4;
        if (fl & 8) { dDur = u32(src, p); p += 4; }
        if (fl & 0x10) { dSize = u32(src, p); p += 4; }
        if (fl & 0x20) { dFlags = u32(src, p); p += 4; }
        if (base == null) base = (fl & 0x20000) || prevEnd == null ? moof.start : prevEnd;
        const tfdt = find(traf, 'tfdt');
        if (tfdt) { const q = tfdt.start + tfdt.head, bt = src[q] ? u64(src, q + 4) : u32(src, q + 4); if (t.samples.length && bt > t.time) { t.samples[t.samples.length - 1].dur += bt - t.time; t.time = bt; } } // 断片の間のすき間は直前のサンプルを伸ばして埋める
        let off = base;
        kids(traf).filter(x => x.type === 'trun').forEach(trun => {
          let q = trun.start + trun.head; const ver = src[q], tf = u32(src, q) & 0xffffff, n = u32(src, q + 4); q += 8;
          if (tf & 1) { off = base + i32(src, q); q += 4; }
          let first = null; if (tf & 4) { first = u32(src, q); q += 4; }
          const chunk = { t, off, size: 0, n };
          for (let i = 0; i < n; i++) {
            const s = { dur: dDur, size: dSize, flags: i === 0 && first != null ? first : dFlags, cto: 0 };
            if (tf & 0x100) { s.dur = u32(src, q); q += 4; }
            if (tf & 0x200) { s.size = u32(src, q); q += 4; }
            if (tf & 0x400) { s.flags = u32(src, q); q += 4; }
            if (tf & 0x800) { s.cto = ver ? i32(src, q) : u32(src, q); q += 4; }
            t.samples.push(s); t.time += s.dur; chunk.size += s.size;
          }
          if (off < 0 || off + chunk.size > src.length) throw new Error('bad offset');
          if (n) { order.push(chunk); t.chunks.push(chunk); }
          off += chunk.size;
        });
        prevEnd = off;
      });
    });
    const live = Object.values(tracks).filter(t => t.samples.length);
    if (!live.length) return null;
    const movieDur = t => Math.round(t.time * movieTs / t.ts), total = Math.max(...live.map(movieDur));

    // 長さの欄を書き換えた箱の写しを作る（offV0 / offV1 は版ごとの位置）
    const patched = (bx, offV0, offV1, value) => { const c = src.slice(bx.start, bx.end), v1 = c[bx.head], dv = new DataView(c.buffer); if (v1) { dv.setUint32(bx.head + offV1, Math.floor(value / 4294967296)); dv.setUint32(bx.head + offV1 + 4, value >>> 0); } else dv.setUint32(bx.head + offV0, value >>> 0); return c; };
    const copy = bx => src.subarray(bx.start, bx.end), Z = ints([0]);
    const runs = (list, key) => { const out = []; list.forEach(s => { const v = key(s), last = out[out.length - 1]; if (last && last[1] === v) last[0]++; else out.push([1, v]); }); return out; };
    function stbl(t) {
      const old = find(find(find(t.trak, 'mdia'), 'minf'), 'stbl'), S = t.samples, parts = [copy(find(old, 'stsd'))];
      const tt = runs(S, s => s.dur); parts.push(box('stts', Z, ints([tt.length]), ints(tt.flat())));
      if (S.some(s => s.cto)) { const ct = runs(S, s => s.cto); parts.push(box('ctts', ints([S.some(s => s.cto < 0) ? 0x01000000 : 0]), ints([ct.length]), ints(ct.flat()))); }
      const sync = []; S.forEach((s, i) => { if (!(s.flags & 0x10000)) sync.push(i + 1); });
      if (sync.length < S.length) parts.push(box('stss', Z, ints([sync.length]), ints(sync)));
      const sc = []; t.chunks.forEach((ch, i) => { if (!sc.length || sc[sc.length - 1][1] !== ch.n) sc.push([i + 1, ch.n, 1]); });
      parts.push(box('stsc', Z, ints([sc.length]), ints(sc.flat())));
      parts.push(box('stsz', Z, ints([0, S.length]), ints(S.map(s => s.size))));
      parts.push(box('stco', Z, ints([t.chunks.length]), ints(t.chunks.map(ch => ch.out || 0))));
      return box('stbl', ...parts);
    }
    function trak(t) {
      return box('trak', ...kids(t.trak).map(k => {
        if (k.type === 'tkhd') return patched(k, 20, 28, movieDur(t));
        if (k.type === 'edts') { const el = find(k, 'elst'); return el && u32(src, el.start + el.head + 4) === 1 ? box('edts', patched(el, 8, 8, movieDur(t))) : copy(k); }
        if (k.type !== 'mdia') return copy(k);
        return box('mdia', ...kids(k).map(m => m.type === 'mdhd' ? patched(m, 16, 24, t.time) : m.type !== 'minf' ? copy(m) : box('minf', ...kids(m).map(n => n.type === 'stbl' ? stbl(t) : copy(n)))));
      }));
    }
    const buildMoov = () => box('moov', ...kids(moov).filter(k => k.type !== 'mvex').map(k => k.type === 'mvhd' ? patched(k, 16, 24, total) : k.type !== 'trak' ? copy(k) : (() => { const t = live.find(x => x.trak.start === k.start); return t ? trak(t) : new Uint8Array(0); })()));
    const ftyp = box('ftyp', Uint8Array.from('isom', ch => ch.charCodeAt(0)), ints([0x200]), Uint8Array.from('isomiso2avc1mp41', ch => ch.charCodeAt(0)));
    let pos = ftyp.length + buildMoov().length + 8, dataLen = 0; // 表の大きさは位置の値によらないので、一度作って大きさを測る
    order.forEach(ch => { ch.out = pos; pos += ch.size; dataLen += ch.size; });
    if (pos > 4294967295) return null;
    return cat([ftyp, buildMoov(), ints([dataLen + 8]), Uint8Array.from('mdat', ch => ch.charCodeAt(0)), ...order.map(ch => src.subarray(ch.off, ch.off + ch.size))]);
  }
  return { defrag };
})();
if (typeof module !== 'undefined') module.exports = MP4FIX;
