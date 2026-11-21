/**
 * ============================================================
 *  ハレスタ（HARE STAND） LINE自動応対ワーカー  v1
 * ============================================================
 *  ・お客さまのメッセージにAIが即時返信（料金・エリア・締切・立札の相談、注文内容の聞き取り）
 *  ・注文内容がそろったら／AIが判断できない内容（クレーム・返金・値引き・トラブル・対象外エリアなど）は
 *    担当者のLINEへ要約つきで通知。担当者はボタンで宛先を選び、文面を送るだけでお客さまへ届く
 *  ・担当者が手で返信したお客さまは、AIを一定時間止める（ボタンで再開）
 *  ・友だち追加時のあいさつ、リッチメニューの作成も行う
 *
 *  Cloudflare に登録するもの
 *   Secret : LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN / ANTHROPIC_API_KEY
 *   KV     : HS_KV
 *  担当者の登録：最初に「担当者登録」と送った人が管理者。2人目以降は管理者がボタンで承認
 *  リッチメニュー：担当者が「リッチメニュー設定」と送ると作り直して全員に設定
 *  任意の変数
 *   NOTIFY_ALL = "1" … すべてのお客さまメッセージを担当者に通知する（既定は要対応のみ＋新規のお客さま）
 *   PAUSE_HOURS     … 担当者が手で返信したあとAIを止める時間（既定 12）
 * ============================================================
 */

const VERSION = 'harestand-line v1 (2026-11-21)';
const MODEL = 'claude-sonnet-5';
const SITE = 'https://harestand.com';
const TEL = '090-8292-9414';
const HISTORY_MAX = 40;              // 1人あたり保存する発言数
const HISTORY_TTL = 60 * 60 * 24 * 60; // 60日

/* ------------------------------------------------------------
 *  AIに渡す店の事実（サイト・llms.txt と同じ内容）
 * ------------------------------------------------------------ */
const FACTS = `
【店】ハレスタ（HARE STAND）。沖縄南部の祝い花（スタンド花・胡蝶蘭）専門店。運営：株式会社DAYS（代表取締役 伊波清弥）。
工房：〒901-0305 沖縄県糸満市西崎2丁目36-7 コーポ西崎101。電話 ${TEL}（9:00〜18:00・年中無休）。サイト ${SITE}/
【商品と価格（すべて税込）】
- 祝いスタンド ハレ（1段・高さ約160cm）¥16,500：美容室・サロン・小さなカフェ向け
- 祝いスタンド ハレハレ（2段・高さ約180cm）¥27,500：飲食店・クリニック・事務所の定番
- 祝いスタンド オオバレ（特大2段・高さ約200cm）¥44,000：グランドオープン・竣工・周年向け
- 胡蝶蘭 3本立ち 大輪白（30輪前後）¥27,500／5本立ち 大輪白（50輪前後）¥38,500（立札・ラッピング込み）
- 祝いスタンドはすべてバルーン入り。立札無料・納品写真をLINEで送付・スタンド回収無料・南部7市町の配達料込み。
- 周年祝いは数字バルーンを無料で入れられる（前日までの注文がおすすめ）。開院祝いはバルーン控えめ（白・ゴールド）で仕上げる。
- 他店から届いたスタンド花の引き取り 1基¥2,200（南部）、お返しのミニアレンジ ¥3,300〜。
- 複数基を同じお届け先へ贈る場合、1基の価格は変わらないが配達料は1回分。値引きはしない。
【配達】
- 当日配達：那覇市・豊見城市・糸満市・南風原町・八重瀬町・与那原町・南城市。当日12時までの注文で当日お届け。
- 翌日配達：浦添市・宜野湾市・西原町・北中城村・中城村・沖縄市・北谷町・うるま市・読谷村・嘉手納町。前日17時までの注文、配達料¥2,200。
- 胡蝶蘭は前日12時までの注文（在庫があれば当日もあり得るが、担当者確認が必要）。
- 北部・離島は要相談（担当者に引き継ぐ）。
- 開店祝いは開店日の前日午後〜当日午前のお届けが基本。前日17〜19時のお届けも店舗が受け取れれば可能。
- 回収はお届けの3〜5日後に回収日をお届け先へ案内。贈り主・お届け先の費用なし。
【立札】表書き（祝 御開店／祝 御開業／祝 御開院／祝 御移転／祝 ○周年／祝 御就任／祝 新装開店／御祝 など）＋贈り主名（会社名・役職・氏名）。連名は右から立場の高い順、4名以上は「○○一同」。
【支払い】クレジットカード（決済リンク）・銀行振込・法人は請求書払い。適格請求書（インボイス、登録番号 T5360001036291）を発行。見積書も出せる。金額の確定と支払い案内は担当者から送る。
【台風】暴風警報中は配達できない。台風時期（7〜10月）は前日までのお届け指定がおすすめ。
【ガイド】立札 ${SITE}/guide/tatefuda/ ／相場 ${SITE}/guide/souba/ ／締切 ${SITE}/guide/itsumade/ ／県外から ${SITE}/guide/kengai/ ／法人 ${SITE}/guide/houjin/ ／エリア ${SITE}/area/
`;

const RULES = `
あなたは「ハレスタ」の公式LINEでお客さまに返信する担当です。以下を守ってください。
- 丁寧でやわらかい敬語。1通は短く（スマホで読みやすく3〜8行）。絵文字は使わない。箇条書きは「・」。
- 上の【事実】にないこと（在庫・空き状況・特別な対応・値引き・確約できない時間指定など）は約束しない。「担当者に確認してご連絡します」と伝え、escalate を true にする。
- 注文の聞き取りでは、次の項目のうち「いただいている内容」と「まだお伺いできていない内容」を整理して、足りないものを1〜3個ずつまとめて聞く。
  1) お届け日と時間帯 2) お届け先（店名・住所・電話番号） 3) 用途（開店・周年など） 4) 商品（プラン名または予算） 5) 立札の文字（表書き・贈り主名） 6) ご注文者のお名前とご連絡先（電話） 7) お支払い方法（カード／振込／請求書。請求書なら宛名）
- 締切を必ず確認する。現在時刻は【現在】を使う。当日12時を過ぎた当日配達、前日17時を過ぎた中部の翌日配達などは「担当者に確認します」として escalate。
- 7項目がそろったら、注文内容を一覧で示し「担当者が内容と金額を確認し、確定のご連絡とお支払い方法のご案内をお送りします」と伝え、order_complete を true にする。金額は商品価格（中部なら＋配達料¥2,200）の合計を「ご注文金額（税込）」として示してよい。
- クレーム・返金・キャンセル・値引きの相談・配達トラブル・北部離島・法人の特別な条件・写真や画像の確認が必要な内容は escalate を true。返信では「担当者からご連絡します」と伝える。
- お客さまの質問に答えられるときは、関係するサイトのページURLを1つまで https:// から書いてよい。
- 自分がAIであることを聞かれたら「自動応答でご案内しています。必要なときは担当者に引き継ぎます」と正直に答える。
出力は必ず次のJSONだけ（前後に文章を付けない）:
{"reply":"お客さまへの返信文","escalate":false,"reason":"担当者に伝える理由（escalateやorder_completeのときだけ）","order_complete":false,"summary":"注文内容や状況の要約（担当者向け・箇条書き可）"}
`;

/* ------------------------------------------------------------
 *  エントリーポイント
 * ------------------------------------------------------------ */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(VERSION + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    if (request.method === 'POST' && (url.pathname === '/webhook' || url.pathname === '/')) {
      const body = await request.text();
      const ok = await verifySignature(body, request.headers.get('x-line-signature') || '', env.LINE_CHANNEL_SECRET || '');
      if (!ok) return new Response('bad signature', { status: 401 });
      let data; try { data = JSON.parse(body); } catch { return new Response('bad json', { status: 400 }); }
      for (const ev of data.events || []) ctx.waitUntil(handleEvent(ev, env).catch(e => console.error('event error', e)));
      return new Response('ok');
    }
    return new Response('not found', { status: 404 });
  },
};

function json(o, status = 200) {
  return new Response(JSON.stringify(o, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/* ------------------------------------------------------------
 *  イベント処理
 * ------------------------------------------------------------ */
async function handleEvent(ev, env) {
  const uid = ev.source && ev.source.userId;
  if (!uid || (ev.source.type && ev.source.type !== 'user')) return;
  const staff = await getStaff(env);
  const isStaff = staff.some(s => s.id === uid);

  if (ev.type === 'follow') {
    if (isStaff) return;
    await reply(env, ev.replyToken, [greeting()]);
    return;
  }

  if (ev.type === 'postback') {
    const p = new URLSearchParams(ev.postback.data || '');
    if (isStaff) return staffPostback(env, ev, uid, p);
    return; // お客さま側のpostbackは今は使わない
  }

  if (ev.type !== 'message') return;
  const m = ev.message;

  // 担当者登録（最初の1人は即登録＝管理者。2人目以降は既存の担当者がボタンで承認）
  if (m.type === 'text' && m.text.trim() === '担当者登録' && !isStaff) {
    const name = (await getProfile(env, uid)).displayName || '担当者';
    if (!staff.length) {
      staff.push({ id: uid, name, owner: true }); await env.HS_KV.put('staff', JSON.stringify(staff));
      await reply(env, ev.replyToken, [text(welcomeStaff(name))]);
    } else {
      await env.HS_KV.put('apply:' + uid, name, { expirationTtl: 86400 * 3 });
      await reply(env, ev.replyToken, [text('担当者の登録を申請しました。承認されるとお知らせします。')]);
      for (const s of staff) await push(env, s.id, [{ type: 'text', text: `${name}さんから担当者登録の申請が届きました。`,
        quickReply: { items: [qrPostback('承認する', `act=approve&u=${uid}`), qrPostback('却下する', `act=reject&u=${uid}`)] } }]);
    }
    return;
  }
  if (isStaff) return staffMessage(env, ev, uid, staff);
  return customerMessage(env, ev, uid, staff);
}

/* ------------------------------------------------------------
 *  お客さま
 * ------------------------------------------------------------ */
async function customerMessage(env, ev, uid, staff) {
  const m = ev.message;
  let userText;
  if (m.type === 'text') userText = m.text;
  else if (m.type === 'image') userText = '（画像が送られました）';
  else if (m.type === 'sticker') userText = '（スタンプが送られました）';
  else if (m.type === 'location') userText = `（位置情報：${m.title || ''} ${m.address || ''}）`;
  else userText = `（${m.type} が送られました）`;

  const hist = await getHistory(env, uid);
  const isNew = hist.length === 0;
  hist.push({ role: 'user', content: userText, at: Date.now() });
  const profile = await getProfile(env, uid);
  await touchCustomer(env, uid, profile.displayName || 'お客さま', userText);

  // 担当者が対応中ならAIは返さず、担当者に転送
  const paused = await env.HS_KV.get('pause:' + uid);
  if (paused) {
    await saveHistory(env, uid, hist);
    await notifyStaff(env, staff, uid, profile.displayName, `【対応中のお客さまから】\n${userText}`, null, true);
    return;
  }

  // スタンプだけ・画像は定型で返す
  if (m.type === 'sticker') { await saveHistory(env, uid, hist); return; }

  startLoading(env, uid);
  let ai;
  try {
    ai = await askAI(env, hist);
  } catch (e) {
    console.error('AI error', e);
    ai = { reply: 'メッセージありがとうございます。担当者が確認してご連絡します。少しお待ちください。', escalate: true, reason: 'AIの応答でエラーが出ました', summary: '' };
  }
  if (m.type === 'image') { ai.escalate = true; ai.reason = ai.reason || '画像が送られました（内容を確認してください）'; }

  const replyText = (ai.reply || '').trim() || 'メッセージありがとうございます。担当者が確認してご連絡します。';
  hist.push({ role: 'assistant', content: replyText, at: Date.now() });
  await saveHistory(env, uid, hist);
  const sent = await reply(env, ev.replyToken, [text(replyText)]);
  if (!sent) await push(env, uid, [text(replyText)]);

  const name = profile.displayName || 'お客さま';
  if (ai.order_complete) {
    await notifyStaff(env, staff, uid, name, `【ご注文内容がそろいました】\n${ai.summary || ''}\n\n内容と金額を確認し、確定のご連絡とお支払いのご案内を送ってください。`);
  } else if (ai.escalate) {
    await notifyStaff(env, staff, uid, name, `【担当者の確認が必要です】\n理由：${ai.reason || '-'}\n\nお客さま：${userText}\nAIの返信：${replyText}${ai.summary ? '\n\n状況：' + ai.summary : ''}`);
  } else if (isNew || env.NOTIFY_ALL === '1') {
    await notifyStaff(env, staff, uid, name, `【${isNew ? '新しいお客さま' : 'メッセージ'}】\nお客さま：${userText}\nAIの返信：${replyText}`, null, true);
  }
}

async function askAI(env, hist) {
  const now = new Date(Date.now() + 9 * 3600e3);
  const wd = '日月火水木金土'[now.getUTCDay()];
  const nowText = `${now.getUTCFullYear()}年${now.getUTCMonth() + 1}月${now.getUTCDate()}日（${wd}）${now.getUTCHours()}時${String(now.getUTCMinutes()).padStart(2, '0')}分（沖縄時間）`;
  const system = `【事実】${FACTS}\n【現在】${nowText}\n${RULES}`;
  // Claude は user/assistant が交互である必要があるので、連続する同じ役割をまとめる
  const msgs = [];
  for (const h of hist.slice(-HISTORY_MAX)) {
    const role = h.role === 'assistant' ? 'assistant' : 'user';
    const c = (h.staff ? '（担当者）' : '') + h.content;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + c;
    else msgs.push({ role, content: c });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: msgs }),
  });
  if (!res.ok) throw new Error('anthropic ' + res.status + ' ' + (await res.text()).slice(0, 300));
  const data = await res.json();
  const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseAI(out);
}

function parseAI(out) {
  const s = out.indexOf('{'), e = out.lastIndexOf('}');
  if (s >= 0 && e > s) {
    try {
      const o = JSON.parse(out.slice(s, e + 1));
      return { reply: String(o.reply || ''), escalate: !!o.escalate, reason: String(o.reason || ''), order_complete: !!o.order_complete, summary: String(o.summary || '') };
    } catch { /* fallthrough */ }
  }
  return { reply: out.trim(), escalate: true, reason: 'AIの出力の形が崩れました（文面を確認してください）', order_complete: false, summary: '' };
}

/* ------------------------------------------------------------
 *  担当者
 * ------------------------------------------------------------ */
async function staffMessage(env, ev, uid, staff) {
  const m = ev.message;
  if (m.type !== 'text') { await reply(env, ev.replyToken, [text('担当者からお客さまへ送れるのは文字だけです。')]); return; }
  const t = m.text.trim();

  if (t === '担当者解除') {
    await env.HS_KV.put('staff', JSON.stringify(staff.filter(s => s.id !== uid)));
    await reply(env, ev.replyToken, [text('担当者の登録を解除しました。')]);
    return;
  }
  if (t === 'お客さま一覧' || t === 'お客様一覧') return sendCustomerList(env, ev.replyToken);
  if (t === 'リッチメニュー設定') {
    try { const r = await setupRichMenu(env); await reply(env, ev.replyToken, [text('リッチメニューを設定しました。（' + r.richMenuId + '）')]); }
    catch (e) { await reply(env, ev.replyToken, [text('リッチメニューの設定に失敗しました：' + String(e).slice(0, 300))]); }
    return;
  }
  if (t === '使い方' || t === 'ヘルプ') { await reply(env, ev.replyToken, [text(welcomeStaff(''))]); return; }
  if (t === 'キャンセル') { await env.HS_KV.delete('target:' + uid); await reply(env, ev.replyToken, [text('送信先の選択を取り消しました。')]); return; }

  const target = await env.HS_KV.get('target:' + uid);
  if (!target) return sendCustomerList(env, ev.replyToken, '送る相手を選んでください。');

  // お客さまへ送信
  const ok = await push(env, target, [text(t)]);
  if (!ok) { await reply(env, ev.replyToken, [text('送信に失敗しました。お客さまがブロックしている可能性があります。')]); return; }
  const hist = await getHistory(env, target);
  hist.push({ role: 'assistant', content: t, staff: true, at: Date.now() });
  await saveHistory(env, target, hist);
  const hours = Number(env.PAUSE_HOURS || 12);
  await env.HS_KV.put('pause:' + target, '1', { expirationTtl: Math.max(60, hours * 3600) });
  const c = await getCustomer(env, target);
  await reply(env, ev.replyToken, [{
    type: 'text', text: `${c.name}さんに送信しました。\nこのお客さまのAI自動返信は${hours}時間止めています。`,
    quickReply: { items: [
      qrPostback('AIを再開', `act=resume&u=${target}`),
      qrPostback('続けて送る', `act=to&u=${target}`),
      qrMessage('お客さま一覧', 'お客さま一覧'),
    ] },
  }]);
  // 他の担当者にも共有
  for (const s of staff) if (s.id !== uid) await push(env, s.id, [text(`【${(staff.find(x => x.id === uid) || {}).name || '担当者'}さんが返信】${c.name}さんへ\n${t}`)]);
}

async function staffPostback(env, ev, uid, p) {
  const act = p.get('act'), u = p.get('u');
  if (act === 'approve' && u) {
    const staff = await getStaff(env);
    const name = await env.HS_KV.get('apply:' + u);
    if (!name) { await reply(env, ev.replyToken, [text('この申請はすでに処理済みか、期限が切れています。')]); return; }
    if (!staff.some(s => s.id === u)) { staff.push({ id: u, name }); await env.HS_KV.put('staff', JSON.stringify(staff)); }
    await env.HS_KV.delete('apply:' + u);
    await reply(env, ev.replyToken, [text(`${name}さんを担当者に登録しました。`)]);
    await push(env, u, [text(welcomeStaff(name))]);
    return;
  }
  if (act === 'reject' && u) {
    await env.HS_KV.delete('apply:' + u);
    await reply(env, ev.replyToken, [text('申請を却下しました。')]);
    return;
  }
  if (act === 'to' && u) {
    await env.HS_KV.put('target:' + uid, u, { expirationTtl: 1800 });
    const c = await getCustomer(env, u);
    const hist = (await getHistory(env, u)).slice(-6).map(h => `${h.role === 'user' ? 'お客さま' : (h.staff ? '担当' : 'AI')}：${h.content}`).join('\n');
    await reply(env, ev.replyToken, [text(`${c.name}さんへの返信を書いてください（30分有効）。\n取り消すときは「キャンセル」。\n\n— 最近のやりとり —\n${hist}`.slice(0, 4900))]);
  } else if (act === 'resume' && u) {
    await env.HS_KV.delete('pause:' + u);
    const c = await getCustomer(env, u);
    await reply(env, ev.replyToken, [text(`${c.name}さんのAI自動返信を再開しました。`)]);
  } else if (act === 'pause' && u) {
    await env.HS_KV.put('pause:' + u, '1', { expirationTtl: 86400 });
    const c = await getCustomer(env, u);
    await reply(env, ev.replyToken, [text(`${c.name}さんのAI自動返信を24時間止めました。`)]);
  } else if (act === 'hist' && u) {
    const c = await getCustomer(env, u);
    const hist = (await getHistory(env, u)).slice(-20).map(h => `${h.role === 'user' ? 'お客さま' : (h.staff ? '担当' : 'AI')}：${h.content}`).join('\n');
    await reply(env, ev.replyToken, [text(`${c.name}さんとのやりとり\n\n${hist}`.slice(0, 4900))]);
  }
}

async function sendCustomerList(env, replyToken, lead) {
  const list = JSON.parse((await env.HS_KV.get('customers')) || '[]').slice(0, 12);
  if (!list.length) { await reply(env, replyToken, [text('まだお客さまからのメッセージはありません。')]); return; }
  await reply(env, replyToken, [{
    type: 'text', text: (lead ? lead + '\n' : '') + '最近のお客さま（新しい順）',
    quickReply: { items: list.map(c => qrPostback(c.name.slice(0, 18), `act=to&u=${c.id}`)) },
  }]);
}

async function notifyStaff(env, staff, uid, name, body, _x, quiet) {
  if (!staff.length) return;
  const msg = {
    type: 'text', text: `${name || 'お客さま'}さん\n${body}`.slice(0, 4900),
    quickReply: { items: [
      qrPostback('返信する', `act=to&u=${uid}`),
      qrPostback('やりとりを見る', `act=hist&u=${uid}`),
      qrPostback('AIを止める', `act=pause&u=${uid}`),
      qrPostback('AIを再開', `act=resume&u=${uid}`),
    ] },
  };
  for (const s of staff) await push(env, s.id, [msg], quiet);
}

function welcomeStaff(name) {
  return `${name ? name + 'さんを担当者に登録しました。\n\n' : ''}【担当者の使い方】\n・お客さまの注文がそろったときや、確認が必要なときにここへ通知します\n・通知の「返信する」を押して文面を送ると、お客さまに届きます（そのお客さまのAIは12時間止まります）\n・「お客さま一覧」と送ると、最近のお客さまを選んで返信できます\n・「リッチメニュー設定」でメニューを作り直します\n・「担当者解除」で登録を外します`;
}

/* ------------------------------------------------------------
 *  あいさつ・リッチメニュー
 * ------------------------------------------------------------ */
function greeting() {
  return {
    type: 'text',
    text: 'ハレスタ（HARE STAND）です。友だち追加ありがとうございます。\n\n開店祝い・周年祝いのスタンド花と胡蝶蘭を、那覇・南部へお届けしています。\n・南部7市町は当日12時までのご注文で当日お届け\n・バルーン入り祝いスタンド ¥16,500〜（税込）\n・立札・納品写真・回収は無料\n\nご注文は、このトークに「お届け日・お届け先・ご予算・立札の文字」を送るだけ。24時間受け付けて、すぐにお返事します。',
    quickReply: { items: [
      qrMessage('注文したい', '注文したいです'),
      qrMessage('料金を知りたい', '料金を教えてください'),
      qrMessage('今日届く？', '今日届けてもらえますか？'),
      qrMessage('立札の書き方', '立札の書き方を教えてください'),
    ] },
  };
}

async function setupRichMenu(env) {
  const H = { authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json' };
  const W = 2500, Hh = 1686, cw = Math.round(W / 3), ch = Math.round(Hh / 2);
  const area = (i, action) => ({ bounds: { x: (i % 3) * cw, y: Math.floor(i / 3) * ch, width: i % 3 === 2 ? W - 2 * cw : cw, height: i < 3 ? ch : Hh - ch }, action });
  const menu = {
    size: { width: W, height: Hh }, selected: true, name: 'harestand-main', chatBarText: 'メニュー',
    areas: [
      area(0, { type: 'message', label: '注文する', text: '注文したいです' }),
      area(1, { type: 'uri', label: '料金・プラン', uri: SITE + '/#stand' }),
      area(2, { type: 'uri', label: 'お届けエリア', uri: SITE + '/area/' }),
      area(3, { type: 'uri', label: '立札の書き方', uri: SITE + '/guide/tatefuda/' }),
      area(4, { type: 'uri', label: 'よくある質問', uri: SITE + '/#faq' }),
      area(5, { type: 'uri', label: '電話する', uri: 'tel:' + TEL.replace(/-/g, '') }),
    ],
  };
  // 既存のメニューを消してから作り直す
  const old = await (await fetch('https://api.line.me/v2/bot/richmenu/list', { headers: H })).json();
  for (const r of old.richmenus || []) await fetch('https://api.line.me/v2/bot/richmenu/' + r.richMenuId, { method: 'DELETE', headers: H });
  const cr = await fetch('https://api.line.me/v2/bot/richmenu', { method: 'POST', headers: H, body: JSON.stringify(menu) });
  const crj = await cr.json();
  if (!crj.richMenuId) throw new Error('create failed: ' + JSON.stringify(crj));
  const img = await fetch(SITE + '/line/richmenu.png');
  if (!img.ok) throw new Error('image fetch ' + img.status);
  const up = await fetch(`https://api-data.line.me/v2/bot/richmenu/${crj.richMenuId}/content`, {
    method: 'POST', headers: { authorization: H.authorization, 'content-type': 'image/png' }, body: await img.arrayBuffer(),
  });
  if (!up.ok) throw new Error('upload ' + up.status + ' ' + (await up.text()));
  const def = await fetch('https://api.line.me/v2/bot/user/all/richmenu/' + crj.richMenuId, { method: 'POST', headers: H });
  if (!def.ok) throw new Error('default ' + def.status + ' ' + (await def.text()));
  return { ok: true, richMenuId: crj.richMenuId };
}

/* ------------------------------------------------------------
 *  保存（KV）
 * ------------------------------------------------------------ */
async function getStaff(env) { return JSON.parse((await env.HS_KV.get('staff')) || '[]'); }
async function getHistory(env, uid) { return JSON.parse((await env.HS_KV.get('h:' + uid)) || '[]'); }
async function saveHistory(env, uid, hist) { await env.HS_KV.put('h:' + uid, JSON.stringify(hist.slice(-HISTORY_MAX)), { expirationTtl: HISTORY_TTL }); }
async function getCustomer(env, uid) {
  const list = JSON.parse((await env.HS_KV.get('customers')) || '[]');
  return list.find(c => c.id === uid) || { id: uid, name: 'お客さま' };
}
async function touchCustomer(env, uid, name, last) {
  const list = JSON.parse((await env.HS_KV.get('customers')) || '[]').filter(c => c.id !== uid);
  list.unshift({ id: uid, name, last: String(last).slice(0, 40), at: Date.now() });
  await env.HS_KV.put('customers', JSON.stringify(list.slice(0, 50)));
}

/* ------------------------------------------------------------
 *  LINE API
 * ------------------------------------------------------------ */
function text(t) { return { type: 'text', text: String(t).slice(0, 4900) }; }
function qrMessage(label, t) { return { type: 'action', action: { type: 'message', label: label.slice(0, 20), text: t } }; }
function qrPostback(label, data) { return { type: 'action', action: { type: 'postback', label: label.slice(0, 20), data, displayText: label } }; }

async function reply(env, token, messages) {
  if (!token) return false;
  const r = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST', headers: { authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ replyToken: token, messages }),
  });
  if (!r.ok) console.error('reply', r.status, await r.text());
  return r.ok;
}
async function push(env, to, messages, quiet) {
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', headers: { authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ to, messages, notificationDisabled: !!quiet }),
  });
  if (!r.ok) console.error('push', r.status, await r.text());
  return r.ok;
}
async function getProfile(env, uid) {
  try {
    const r = await fetch('https://api.line.me/v2/bot/profile/' + uid, { headers: { authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN } });
    return r.ok ? await r.json() : {};
  } catch { return {}; }
}
function startLoading(env, uid) {
  fetch('https://api.line.me/v2/bot/chat/loading/start', {
    method: 'POST', headers: { authorization: 'Bearer ' + env.LINE_CHANNEL_ACCESS_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ chatId: uid, loadingSeconds: 20 }),
  }).catch(() => {});
}
async function verifySignature(body, signature, secret) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (b64.length !== signature.length) return false;
  let d = 0; for (let i = 0; i < b64.length; i++) d |= b64.charCodeAt(i) ^ signature.charCodeAt(i);
  return d === 0;
}

export const _test = { parseAI, greeting, FACTS, RULES };
