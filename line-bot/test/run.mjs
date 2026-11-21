// モックで一連の流れを確かめるテスト: node test/run.mjs
import worker from '../worker.js';
const kv = new Map();
const env = {
  LINE_CHANNEL_SECRET: 'sec', LINE_CHANNEL_ACCESS_TOKEN: 'tok', ANTHROPIC_API_KEY: 'k', ADMIN_CODE: 'hare123', ADMIN_TOKEN: 'adm',
  HS_KV: { get: async k => kv.has(k) ? kv.get(k) : null, put: async (k, v) => kv.set(k, v), delete: async k => kv.delete(k) },
};
const sent = []; let aiOut = '';
globalThis.fetch = async (url, opt = {}) => {
  url = String(url);
  if (url.includes('anthropic')) return new Response(JSON.stringify({ content: [{ type: 'text', text: aiOut }] }));
  if (url.includes('/profile/')) return new Response(JSON.stringify({ displayName: url.endsWith('STAFF') ? '山川' : '比嘉' }));
  if (url.includes('/message/')) { sent.push({ url: url.split('/').pop(), body: JSON.parse(opt.body) }); return new Response('{}'); }
  return new Response('{}');
};
async function sign(body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('sec'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))));
}
async function post(ev) {
  const body = JSON.stringify({ events: [ev] }); const waits = [];
  const res = await worker.fetch(new Request('https://x/webhook', { method: 'POST', body, headers: { 'x-line-signature': await sign(body) } }), env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits); return res.status;
}
const msg = (uid, t) => ({ type: 'message', replyToken: 'r', source: { type: 'user', userId: uid }, message: { type: 'text', text: t } });
const pb = (uid, d) => ({ type: 'postback', replyToken: 'r', source: { type: 'user', userId: uid }, postback: { data: d } });
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK ' : 'NG ') + m); if (!c) fails++; };

// 署名NG
const bad = await worker.fetch(new Request('https://x/webhook', { method: 'POST', body: '{}', headers: { 'x-line-signature': 'x' } }), env, { waitUntil() {} });
ok(bad.status === 401, '署名が違うと401');
// 担当者登録
await post(msg('USTAFF', '担当者登録 hare123'));
ok(JSON.parse(kv.get('staff')).length === 1, '担当者登録');
// 友だち追加
sent.length = 0; await post({ type: 'follow', replyToken: 'r', source: { type: 'user', userId: 'UCUST' } });
ok(sent[0].body.messages[0].text.includes('友だち追加'), 'あいさつ');
// 普通の質問 → 新規なので担当者に静かに通知
sent.length = 0; aiOut = '{"reply":"1段は¥16,500です。","escalate":false,"order_complete":false,"summary":""}';
await post(msg('UCUST', '料金は？'));
ok(sent.find(s => s.url === 'reply').body.messages[0].text === '1段は¥16,500です。', 'AI返信');
ok(sent.some(s => s.url === 'push' && s.body.to === 'USTAFF' && s.body.notificationDisabled), '新規客を担当者へ通知');
// 2通目の普通の質問 → 通知なし
sent.length = 0; await post(msg('UCUST', '回収は？'));
ok(!sent.some(s => s.url === 'push'), '要対応でなければ通知しない');
// エスカレーション
sent.length = 0; aiOut = '```json\n{"reply":"担当者に確認します。","escalate":true,"reason":"値引き相談","order_complete":false,"summary":""}\n```';
await post(msg('UCUST', '安くなりませんか'));
ok(sent.some(s => s.url === 'push' && s.body.messages[0].text.includes('値引き相談') && !s.body.notificationDisabled), '要対応を通知（音あり）');
// 注文完了
sent.length = 0; aiOut = '{"reply":"内容を確認します。","escalate":false,"order_complete":true,"summary":"ハレ 11/25"}';
await post(msg('UCUST', '支払いはカードで'));
ok(sent.some(s => s.url === 'push' && s.body.messages[0].text.includes('ご注文内容がそろいました')), '注文完了を通知');
// 担当者が宛先を選んで返信
sent.length = 0; await post(pb('USTAFF', 'act=to&u=UCUST'));
ok(sent[0].body.messages[0].text.includes('返信を書いてください'), '宛先選択');
sent.length = 0; await post(msg('USTAFF', '決済リンクをお送りします。'));
ok(sent.some(s => s.url === 'push' && s.body.to === 'UCUST' && s.body.messages[0].text === '決済リンクをお送りします。'), 'お客さまへ転送');
ok(kv.has('pause:UCUST'), 'AIを一時停止');
// 停止中のお客さま → AIは返さず担当者へ
sent.length = 0; await post(msg('UCUST', 'ありがとうございます'));
ok(!sent.some(s => s.url === 'reply') && sent.some(s => s.body.to === 'USTAFF'), '停止中は担当者へ転送');
// 再開
await post(pb('USTAFF', 'act=resume&u=UCUST'));
ok(!kv.has('pause:UCUST'), 'AI再開');
// 宛先未選択の担当者メッセージ → 一覧
sent.length = 0; kv.delete('target:USTAFF'); await post(msg('USTAFF', 'こんにちは'));
ok(sent[0].body.messages[0].quickReply.items.length >= 1, '宛先未選択なら一覧');
// AIの出力が壊れたとき
sent.length = 0; aiOut = 'すみません'; await post(msg('UCUST', '?'));
ok(sent.some(s => s.url === 'push' && s.body.to === 'USTAFF'), '壊れた出力は担当者へ');
// GET
ok((await (await worker.fetch(new Request('https://x/'), env, {})).text()).startsWith('harestand-line'), 'GET /');
console.log(fails ? `${fails} 件NG` : 'すべてOK'); process.exit(fails ? 1 : 0);
