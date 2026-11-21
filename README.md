# harestand.com — ハレスタ（HARE STAND）

那覇・南部の祝い花スタンド専門店のサイト。静的1ページ（index.html）。

## 連絡先（2026-11-21 確定）
- 注文窓口：DAYS Flower 公式LINE `https://lin.ee/Xuvqzq7`（index.html と build/content.py の LINE）
- 住所：〒901-0305 沖縄県糸満市西崎2丁目36-7 コーポ西崎101（build/content.py の COMPANY）
- AI向け：llms.txt（手書き）、llms-full.txt（build.py が自動生成）

## 写真が揃ったら
- `images/` に入れて `index.html` の `#gallery` セクションから `hidden` を外し、`<img>` を追加

## デプロイ
Netlify × GitHub 自動デプロイ。main に push すると反映。

## 下層ページの更新
- 文章・価格は `build/content.py`、見た目は `build/build.py` で管理
- 変更後に `python3 build/build.py` を実行すると、用途・エリア・ガイドの全ページと sitemap.xml が再生成される
- トップ（index.html）の CSS・ヘッダー・フッターを下層が自動で引き継ぐ
