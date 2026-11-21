# ハレスタ LINE自動応対ワーカー

ハレスタ公式LINE（@812ayeum）のお客さま対応を自動で行う Cloudflare Worker です。

- `worker.js` … 本体（先頭に版番号）
- `wrangler.jsonc` … Cloudflare 用の設定（名前・KV）
- `test/run.mjs` … モックで流れを確かめるテスト（`node test/run.mjs`）

## しくみ
- お客さまのメッセージに AI（Claude）が即時返信。料金・エリア・締切・立札の相談と、注文内容の聞き取り
- 注文内容がそろったとき・AI が判断できない内容（クレーム・返金・値引き・トラブル・対象外エリア・画像）は担当者の LINE に通知
- 担当者は通知の「返信する」ボタン → 文面を送るだけでお客さまへ届く。手で返信したお客さまは AI を 12 時間止める（「AIを再開」ボタンで戻す）
- 担当者の登録：ハレスタ公式LINEに「担当者登録」と送る。最初の1人は即登録（管理者）、2人目以降は担当者がボタンで承認。解除は「担当者解除」
- 「お客さま一覧」と送ると最近のお客さまを選んで返信できる

## Cloudflare に登録するもの（リポジトリには入れない）
- Secret：`LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` / `ANTHROPIC_API_KEY`
- KV：`HS_KV`

## リッチメニュー
画像は `/line/richmenu.png`（サイトから配信）。担当者がLINEで「リッチメニュー設定」と送ると作り直して全員に設定されます。

## デプロイ
GitHub の main に push すると Cloudflare Workers Builds が line-bot/ を自動デプロイします。Cloudflare の Worker 名は `harestand-line`（https://harestand-line.sey-97a.workers.dev/ ）。Webhook URL は `https://harestand-line.sey-97a.workers.dev/webhook`。
