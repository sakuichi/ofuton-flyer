#!/usr/bin/env python3
"""点数帯ごとのカード画像 c/0.png〜c/6.png を作る（ふだんは実行不要。絵柄を変えたいときだけ）。

使い方:
  npm install --no-save @fontsource/dela-gothic-one @fontsource/zen-maru-gothic
  pip install playwright && playwright install chromium
  npm run build && python3 tools/make-cards.py [fontsourceの入った node_modules のパス]

index.html の描画関数（布団・UFO・惑星）をそのまま使って描くので、サイトと絵柄がそろう。
"""
import asyncio, base64, os, re, sys, tempfile
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'node_modules')
HOOK = '  // 紙ふぶき（75点以上）'

JS = r"""
async () => {
  const D = window.__draw, INK = '#1b2444', W = 1200, H = 630;
  const DISP = '"Dela Gothic One",sans-serif', BODY = '"Zen Maru Gothic",sans-serif';
  const T = [
    ['布団が', '凍った', 'これより寒いダジャレ、ある？'],
    ['布団が', 'めくれた', 'あなたのダジャレは、何メートル飛ぶ？'],
    ['部屋の外まで', 'ふっ飛んだ', 'このダジャレ、超えられる？'],
    ['ご近所まで', 'ふっ飛んだ', 'このダジャレ、超えられる？'],
    ['隣町まで', 'ふっ飛んだ', 'このダジャレ、超えられる？'],
    ['成層圏まで', 'ふっ飛んだ', 'このダジャレ、超えられる？'],
    ['元祖を超えて', '宇宙へ', 'このダジャレ、超えられる？']
  ];
  await Promise.all([document.fonts.load('400 100px "Dela Gothic One"', 'ダジャレ布団飛ばし' + T.map(x => x[0] + x[1]).join('')), document.fonts.load('700 40px "Zen Maru Gothic"', T.map(x => x[2]).join(''))]);
  const KCOL = { kake: '#2b4a9b', dot: '#f4f7ff', ink: INK, shiki: '#fffdf6' };
  const out = [];
  for (let tier = 0; tier < 7; tier++) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    let seed = 11 + tier; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const space = tier >= 5, dusk = tier === 4;
    const g = c.createLinearGradient(0, H, W, 0);
    if (space) { g.addColorStop(0, '#dff1fb'); g.addColorStop(.4, '#9fd3f2'); g.addColorStop(.68, '#3a4f9a'); g.addColorStop(1, '#0b1034'); }
    else if (dusk) { g.addColorStop(0, '#dff1fb'); g.addColorStop(.6, '#9fd3f2'); g.addColorStop(1, '#5f7fc4'); }
    else { g.addColorStop(0, '#dff1fb'); g.addColorStop(1, '#9fd3f2'); }
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (space) { c.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { const x = 680 + rnd() * 520, y = rnd() * 340, a = Math.max(0, (x - 680) / 520 - y / 520); c.globalAlpha = a * (.5 + rnd() * .5); c.beginPath(); c.arc(x, y, 1 + rnd() * 2.2, 0, 7); c.fill(); } c.globalAlpha = 1; }
    else { c.fillStyle = 'rgba(255,224,122,.4)'; c.beginPath(); c.arc(1085, 105, 76, 0, 7); c.fill(); c.fillStyle = '#fff1a8'; c.beginPath(); c.arc(1085, 105, 56, 0, 7); c.fill(); }
    if (tier >= 2 && tier <= 4) { c.fillStyle = 'rgba(255,255,255,.9)'; [[820, 470, 1.6], [1090, 330, 1.2], [700, 250, 1]].slice(0, tier).forEach(([x, y, s]) => [[0, 0, 22], [24, 6, 17], [-24, 7, 16], [8, -12, 16]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); })); }
    // 畳と敷き布団
    const FY = 545; c.fillStyle = '#b4b76e'; c.fillRect(0, FY, W, H - FY); c.fillStyle = '#a3a65c'; for (let x = 0; x < W; x += 6) c.fillRect(x, FY, 1.5, H - FY); c.fillStyle = '#3c5a3a'; c.fillRect(0, FY, W, 13);
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    const bx = tier <= 1 ? 760 : 60;
    c.lineWidth = 4; c.strokeStyle = INK; c.fillStyle = '#fffdf6'; rr(bx, FY - 20, 330, 32, 16); c.fill(); c.stroke(); rr(bx + 12, FY - 42, 62, 27, 13); c.fill(); c.stroke();
    if (tier === 0) { D.drawKake(c, bx + 190, FY - 44, 0, 1.9, KCOL, { frost: 1, lw: 4 }); }
    else if (tier === 1) { D.drawKake(c, bx + 215, FY - 70, -.22, 1.9, KCOL, { lw: 4 }); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.lineCap = 'round'; [[1100, 420, 40], [1130, 455, 28]].forEach(([x, y, l]) => { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 8, x + l, y); c.stroke(); }); }
    else {
      const p = [[840, 400, 2.3], [870, 340, 2.2], [890, 300, 2.1], [890, 335, 2.1], [880, 345, 2.0]][tier - 2];
      c.save(); c.setLineDash([5, 20]); c.lineCap = 'round'; c.lineWidth = 7; c.strokeStyle = 'rgba(27,36,68,.4)'; c.beginPath(); c.moveTo(250, FY - 40); c.quadraticCurveTo(600, 530, p[0] - 110, p[1] + 65); c.stroke(); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.lineCap = 'round';
      [[p[0] - 130, p[1] + 135, 80], [p[0] + 10, p[1] + 120, 100], [p[0] + 120, p[1] + 65, 70], [p[0] + 200, p[1] - 5, 90]].forEach(([x, y, l]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .85, y + l * .53); c.stroke(); });
      if (tier === 6) { D.planet(c, 102, 1010, 150); c.save(); c.translate(1120, 330); c.scale(.8, .8); D.planet(c, 103, 0, 0); c.restore(); }
      D.drawKake(c, p[0], p[1], -.6, p[2], KCOL, { lw: 5 });
      if (tier === 5) { c.save(); c.translate(1070, 135); c.scale(1.4, 1.4); D.drawUfo(c, 0, 0, .08, 300, 1, { x: -120, y: 130 }, 1); c.restore(); D.popText(c, '！？', 1085, 34, 44, .5, '#ffe27a'); }
      if (space) { D.star4(c, 930, 60, 16, .3); D.star4(c, 1165, 250, 12, .8); D.star4(c, 850, 120, 9, 0); }
    }
    if (tier <= 1) { c.fillStyle = `rgba(165,195,222,${tier ? .2 : .36})`; c.fillRect(0, 0, W, FY); c.fillStyle = '#fff'; for (let i = 0; i < (tier ? 40 : 90); i++) { c.beginPath(); c.arc(rnd() * W, rnd() * FY, 2.5 + rnd() * 5, 0, 7); c.fill(); } }
    // 文字
    c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    const txt = (s, x, y, font, lw) => { c.font = font; c.lineWidth = lw; c.strokeStyle = '#fff'; c.strokeText(s, x, y); c.fillStyle = INK; c.fillText(s, x, y); };
    txt('ダジャレ布団飛ばし', 58, 78, `400 34px ${DISP}`, 8);
    txt(T[tier][0], 54, 205, `400 104px ${DISP}`, 16);
    txt(T[tier][1], 54, 330, `400 104px ${DISP}`, 16);
    txt(T[tier][2], 60, 410, `700 36px ${BODY}`, 10);
    out.push(cv.toDataURL('image/png'));
  }
  return out;
}
"""

async def main():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    assert HOOK in src, 'index.html の目印が見つかりません'
    tmp = src.replace(HOOK, '  window.__draw = { drawKake, drawUfo, star4, popText, planet };\n' + HOOK, 1)
    fonts = ''.join(f'<link rel="stylesheet" href="file://{NM}/@fontsource/{n}">' for n in ('dela-gothic-one/400.css', 'zen-maru-gothic/700.css'))
    tmp = re.sub(r'<link href="https://fonts.googleapis.com[^>]+>', lambda m: fonts, tmp)
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, 'cards.html'); open(path, 'w', encoding='utf-8').write(tmp)
        async with async_playwright() as p:
            b = await p.chromium.launch(); pg = await b.new_page()
            await pg.goto('file://' + path); await pg.wait_for_timeout(1500)
            out = await pg.evaluate(JS); await b.close()
    os.makedirs(os.path.join(ROOT, 'c'), exist_ok=True)
    for i, url in enumerate(out):
        open(os.path.join(ROOT, 'c', f'{i}.png'), 'wb').write(base64.b64decode(url.split(',')[1]))
    print('c/0.png〜c/%d.png を作成しました' % (len(out) - 1))

asyncio.run(main())
