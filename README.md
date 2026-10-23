# harestand.com — ハレスタ（HARE STAND）

那覇・南部の祝い花スタンド専門店のサイト。静的1ページ（index.html）。

## 公開前に差し替えるもの
- `https://lin.ee/XXXXXXX` → ハレスタ公式LINEのURL（index.html 内に7箇所。全置換でOK）
- `沖縄県糸満市西崎（番地は公開前に差し替え）` → 番地つき住所（フッター）
- JSON-LD の `"streetAddress": "西崎"` と `"postalCode"` → 正式な番地・郵便番号

## 写真が揃ったら
- `images/` に入れて `index.html` の `#gallery` セクションから `hidden` を外し、`<img>` を追加

## デプロイ
Netlify × GitHub 自動デプロイ。main に push すると反映。
