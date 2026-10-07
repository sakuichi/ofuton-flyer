# ダジャレ布団飛ばし

ダジャレを入れると、出来ばえの分だけ布団が飛ぶサイトです。判定はすべてブラウザ内で行い、入力した文は外に送りません。

## 公開（GitHub Pages）

リポジトリ直下の `index.html` がそのままサイトになります。Settings → Pages で、公開元をブランチ直下に設定してください。

## 開発

```
npm run build   # src/ を直したあと index.html を作り直す
npm test        # 判定の回帰テスト
```

構成や設計の詳細は `CLAUDE.md` にあります。

## ライセンス表示

漢字の読み辞書は mecab-ipadic（IPA辞書）から生成しています。詳細は `THIRD_PARTY_NOTICES.md` を参照してください。
