# -*- coding: utf-8 -*-
"""index.html の CSS・ヘッダー・フッターを共有して下層ページを生成する。
使い方: python3 build/build.py  （リポジトリ直下で実行）"""
import json, re, os, html
from content import *

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
CSS = re.search(r"<style>(.*?)</style>", INDEX, re.S).group(1)
HEADER = re.search(r"(<header class=\"re\".*?</nav>)", INDEX, re.S).group(1)
FOOTER = re.search(r"(<footer>.*?</footer>)", INDEX, re.S).group(1)
FAB = re.search(r"(<a class=\"line_fab\".*?</a>\s*<a class=\"to_top\".*?</a>)", INDEX, re.S).group(1)
# 下層では #アンカーをトップへのリンクに
HEADER = HEADER.replace('href="#', 'href="/#').replace('href="/#top"', 'href="/"')
FOOTER = FOOTER.replace('href="#top"', 'href="/"')
FAB = FAB.replace('href="#top"', 'href="/"')

SUB_CSS = """
.pg{padding-top:62px}
.kv2{position:relative;padding:70px 0 54px;background:radial-gradient(900px 400px at 50% 120%,#2e2619 0,transparent 65%),linear-gradient(180deg,#0f0f10,#1a1a1b);overflow:hidden}
.kv2 .en{font-family:var(--oswald);font-weight:700;font-style:italic;font-size:clamp(44px,10vw,96px);line-height:.9;color:rgba(255,255,255,.07);position:absolute;left:-4px;top:40px;white-space:nowrap;letter-spacing:.02em;pointer-events:none}
.kv2 h1{position:relative;font-family:var(--serif);font-weight:600;font-size:clamp(22px,4.6vw,34px);letter-spacing:2px;line-height:1.4}
.kv2 .sub{position:relative;font-family:var(--oswald);font-size:11px;letter-spacing:.3em;color:var(--gray);margin-top:12px}
.crumb{font-size:11px;color:var(--gray);letter-spacing:.08em;margin-bottom:22px;position:relative}
.crumb a:hover{color:#fff}
.crumb span{margin:0 6px}
.lead{font-size:14px;line-height:2;letter-spacing:.06em;color:#eee;margin-bottom:40px}
.art h2{font-family:var(--serif);font-weight:600;font-size:19px;letter-spacing:2px;margin:46px 0 14px;padding-left:14px;border-left:3px solid var(--gold);line-height:1.4}
.art p,.art li{font-size:13px;line-height:1.95;letter-spacing:.06em;color:#ddd}
.art ul.dot li{padding-left:18px;position:relative;margin-bottom:6px}
.art ul.dot li::before{content:'';position:absolute;left:0;top:11px;width:6px;height:6px;background:var(--gold)}
.tbl{display:grid;grid-template-columns:1fr;gap:10px;margin:14px 0 6px}
.tbl .r{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.22);padding:14px 16px;transition:border-color .3s}
.tbl .r:hover{border-color:#fff}
.tbl .r b{font-family:var(--serif);font-weight:600;font-size:15px;letter-spacing:1.5px;display:block}
.tbl .r small{display:block;font-size:11px;color:var(--gray);letter-spacing:.08em;margin-top:2px}
.tbl .r .p{font-family:var(--oswald);font-size:24px;font-weight:500;white-space:nowrap}
.tbl .r .p i{font-style:normal;font-family:var(--sans);font-size:10px;color:var(--gray);margin-left:4px}
.tf{background:linear-gradient(180deg,#fffcf4,#f1e7cf);color:#1a1a1b;border-top:8px solid var(--gold);padding:22px 18px;margin:16px 0;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center}
.tf .o{font-family:var(--serif);font-weight:800;color:var(--red);font-size:26px;letter-spacing:.1em;white-space:nowrap}
.tf ul li{font-size:12px;color:#333;letter-spacing:.06em;line-height:1.9}
.cta{margin:56px 0 0;border:1px solid rgba(255,255,255,.25);padding:30px 20px;text-align:center}
.cta p{font-size:12px;color:var(--gray);letter-spacing:.1em;margin-bottom:16px}
.rel{margin-top:70px;border-top:1px solid rgba(255,255,255,.18);padding-top:30px}
.rel h3{font-family:var(--oswald);font-size:12px;letter-spacing:.3em;color:var(--gray);margin-bottom:14px}
.rel ul{display:flex;flex-wrap:wrap;gap:8px}
.rel li a{display:inline-block;border:1px solid rgba(255,255,255,.3);padding:7px 12px;font-size:12px;letter-spacing:.08em;transition:border-color .3s,background .3s}
.rel li a:hover{border-color:#fff;background:rgba(255,255,255,.05)}
.upd{font-family:var(--oswald);font-size:10px;letter-spacing:.2em;color:var(--gray);margin-top:30px}
@media (min-width:768px){.pg{padding-top:0}.kv2{padding:150px 0 70px}.art .inner{max-width:760px}.tbl{grid-template-columns:1fr 1fr 1fr}.tbl .r{grid-template-columns:1fr;gap:6px}.tbl .r .p{font-size:28px}}
@media (min-width:1200px){.kv2{padding:190px 0 80px}.kv2 .en{top:120px}}
"""

SCRIPT = """
<script>
(function(){
  var h=document.getElementById('hamburger'),g=document.getElementById('globalMenuSp'),bg=document.getElementById('menu_bg');
  function tog(on){h.classList.toggle('active',on);g.classList.toggle('active',on);bg.classList.toggle('active',on);h.setAttribute('aria-expanded',on)}
  h.addEventListener('click',function(){tog(!h.classList.contains('active'))});
  bg.addEventListener('click',function(){tog(false)});
  g.querySelectorAll('a[href]').forEach(function(a){a.addEventListener('click',function(){tog(false)})});
  var fades=[].slice.call(document.querySelectorAll('.fadein')),head=document.getElementById('header'),top=document.getElementById('to_top');
  function onScroll(){var sc=window.pageYOffset,wh=window.innerHeight;
    fades.forEach(function(el){if(sc>el.getBoundingClientRect().top+sc-wh+0)el.classList.add('scrollin')});
    head.classList.add('scrolled');top.classList.toggle('show',sc>600)}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('load',onScroll);onScroll();
})();
</script>"""

LINE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 5.7 2 10.3c0 4.1 3.6 7.5 8.5 8.2.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s5.9-3.5 8-6c1.5-1.6 2.2-3.3 2.2-5.1C22 5.7 17.5 2 12 2z"/></svg>'

def esc(s): return html.escape(s, quote=True)

def jsonld(obj): return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, indent=1) + '\n</script>'

def breadcrumb(items):
    return {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":i+1,"name":n,"item":SITE+u} for i,(n,u) in enumerate(items)]}

def faqld(faq):
    return {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]}

def service_ld(name, desc, url, area=None):
    o = {"@context":"https://schema.org","@type":"Service","name":name,"description":desc,"url":SITE+url,
         "serviceType":"祝い花・スタンド花の配達","provider":{"@id":SITE+"/#florist"},
         "areaServed":[{"@type":"City","name":a} for a in (area or FACTS["same_day"].split("・"))],
         "offers":[{"@type":"Offer","name":f"祝いスタンド {n}（{s}）","price":p.replace(",",""),"priceCurrency":"JPY","availability":"https://schema.org/InStock"} for n,s,p,_ in FACTS["plans"]]
         + [{"@type":"Offer","name":n,"price":p.replace(",",""),"priceCurrency":"JPY"} for n,_,p in FACTS["orchid"]]}
    return o

def article_ld(title, desc, url):
    return {"@context":"https://schema.org","@type":"Article","headline":title,"description":desc,"url":SITE+url,
            "datePublished":"2026-10-24","dateModified":UPDATED,"inLanguage":"ja",
            "author":{"@type":"Organization","name":"ハレスタ（HARE STAND）","url":SITE+"/"},
            "publisher":{"@type":"Organization","name":"株式会社DAYS","url":"https://daysballoon.jp/"},
            "mainEntityOfPage":SITE+url,"isPartOf":{"@id":SITE+"/#website"}}

def price_block():
    rows = "".join(f'<div class="r"><div><b>{esc(n)}</b><small>{esc(s)}・{esc(w)}</small></div><div class="p">¥{p}<i>税込</i></div></div>' for n,s,p,w in FACTS["plans"])
    orch = "".join(f'<div class="r"><div><b>{esc(n)}</b><small>{esc(s)}・立札つき</small></div><div class="p">¥{p}<i>税込</i></div></div>' for n,s,p in FACTS["orchid"])
    return f'<div class="tbl">{rows}</div><p>バルーン入り・立札無料・納品写真・回収無料・南部7市町の配達料込み。</p><div class="tbl" style="margin-top:16px">{orch}</div>'

def cta():
    return f'''<div class="cta fadein"><p>用途・ご予算・立札の文字を送るだけ。10分以内に折り返します（9:00〜18:00）</p>
<a class="btn" href="{LINE}" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:var(--line);color:#fff;font-weight:700;font-size:15px;letter-spacing:.1em;padding:16px 34px">{LINE_SVG}<span>LINEで注文する</span></a>
<a href="tel:{TEL.replace('-','')}" style="display:block;margin-top:16px;font-family:var(--oswald);font-size:24px;letter-spacing:.06em">{TEL}</a></div>'''

def related(exclude=None):
    items = [("祝いスタンド・胡蝶蘭の価格","/#stand")] + [(u["name"],f"/{u['slug']}/") for u in USES] + [("胡蝶蘭","/kochoran/")] \
          + [(a["name"]+"への配達",f"/area/{a['slug']}/") for a in AREAS] + [(g["name"],f"/guide/{g['slug']}/") for g in GUIDES]
    lis = "".join(f'<li><a href="{u}">{esc(n)}</a></li>' for n,u in items if u != exclude)
    return f'<div class="rel fadein"><h3>RELATED</h3><ul>{lis}</ul></div>'

def page(url, title, desc, en, h1, sub, crumbs, body, lds):
    canon = SITE + url
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canon}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#1a1a1b">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ハレスタ｜HARE STAND">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/ogp.jpg">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;800&display=swap" rel="stylesheet">
{chr(10).join(jsonld(l) for l in lds)}
<style>{CSS}{SUB_CSS}</style>
</head>
<body>
{HEADER}
<main class="pg">
<div class="kv2"><div class="inner"><div class="en" aria-hidden="true">{esc(en)}</div>
<nav class="crumb" aria-label="パンくず">{'<span>/</span>'.join(f'<a href="{u}">{esc(n)}</a>' if u else esc(n) for n,u in crumbs)}</nav>
<h1>{h1}</h1><div class="sub">{esc(sub)}</div></div></div>
<section class="art"><div class="inner">
{body}
<p class="upd">LAST UPDATED {UPDATED}</p>
</div></section>
</main>
{FOOTER}
{FAB}
{SCRIPT}
</body>
</html>"""

def write(url, htmltext):
    d = os.path.join(ROOT, url.strip("/"))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f: f.write(htmltext)

urls = []

# ---------- 用途ページ ----------
for u in USES:
    url = f"/{u['slug']}/"
    title = f"{u['h1']}｜ハレスタ"
    desc = f"{u['name']}のスタンド花・胡蝶蘭を那覇・豊見城・糸満など沖縄南部へ当日お届け。バルーン入り祝いスタンド¥16,500〜、立札・納品写真・回収無料。{u['lead'][:40]}"
    body = f"""
<p class="lead fadein">{esc(u['lead'])}</p>
<h2 class="fadein">{esc(u['name'])}に選ばれている祝いスタンド</h2>
<div class="fadein">{price_block()}</div>
<h2 class="fadein">こんなお店・会社への{esc(u['name'])}に</h2>
<ul class="dot fadein">{''.join(f'<li>{esc(w)}</li>' for w in u['who'])}</ul>
<h2 class="fadein">届けるタイミング</h2>
<p class="fadein">{esc(u['timing'])}南部7市町（{FACTS['same_day']}）は当日{FACTS['cutoff']}までのご注文で当日お届けします。</p>
<h2 class="fadein">立札の表書きの例</h2>
<div class="tf fadein"><div class="o">{esc(u['omote'])}</div><ul>{''.join(f'<li>{esc(t)}</li>' for t in u['tatefuda'])}</ul></div>
<p class="fadein">立札は無料。文字はLINEで送るだけで、こちらで体裁を整えます。詳しくは<a href="/guide/tatefuda/" style="text-decoration:underline">立札の書き方</a>へ。</p>
<h2 class="fadein">{esc(u['name'])}のよくある質問</h2>
<div class="faq fadein">{''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in u['faq'])}</div>
{cta()}
{related(url)}"""
    lds = [service_ld(f"{u['name']}のスタンド花・胡蝶蘭 配達（沖縄南部）", desc, url),
           faqld(u['faq']), breadcrumb([("HOME","/"),(u['name'],url)]), article_ld(title, desc, url)]
    write(url, page(url, title, desc, u['en'], esc(u['h1']), f"{u['en']} · NAHA · SOUTH OKINAWA", [("HOME","/"),(u['name'],None)], body, lds))
    urls.append(url)

# ---------- 胡蝶蘭 ----------
url = "/kochoran/"
title = "沖縄の胡蝶蘭｜開店祝い・就任祝い・開院祝いに南部へ配達｜ハレスタ"
desc = "沖縄南部（那覇・豊見城・糸満・南風原・八重瀬・与那原・南城）へ胡蝶蘭を配達。大輪白3本立ち¥27,500、5本立ち¥38,500（税込・立札・ラッピング込み）。前日12時までのご注文で翌日お届け。"
k_faq = [("胡蝶蘭の3本立ちと5本立ちはどう選べばいいですか？","開店祝い・取引先の就任祝いは3本立ちが標準です。会長・理事長クラスの就任、重要な取引先の開業、大型店舗の開店には5本立ちが選ばれます。"),
         ("胡蝶蘭はどれくらい持ちますか？","室内で直射日光と空調の風を避ければ1〜2か月咲き続けます。水やりは1〜2週間に1回、鉢の表面が乾いてからで十分です。"),
         ("胡蝶蘭は当日配達できますか？","仕入れの都合で前日12時までのご注文をお願いしています。急ぎの場合はLINEでご相談ください。在庫があれば当日お届けできることもあります。"),
         ("胡蝶蘭に立札は付きますか？","はい。木札または紙札の立札とラッピングが価格に含まれています。表書きと贈り主名をLINEでお送りください。")]
body = f"""
<p class="lead fadein">胡蝶蘭は「幸福が飛んでくる」という花言葉と、1〜2か月咲き続ける長持ちさから、開店祝い・就任祝い・開院祝いの定番です。ハレスタでは大輪白の胡蝶蘭を3本立ち・5本立ちの2種類に絞り、立札とラッピングを含めた価格で那覇・南部へお届けします。</p>
<h2 class="fadein">胡蝶蘭の価格</h2>
<div class="tbl fadein">{''.join(f'<div class="r"><div><b>{esc(n)}</b><small>{esc(s)}・立札・ラッピング込み</small></div><div class="p">¥{p}<i>税込</i></div></div>' for n,s,p in FACTS['orchid'])}</div>
<p class="fadein">南部7市町への配達料込み。前日12時までのご注文で翌日お届けします。</p>
<h2 class="fadein">用途別の選び方</h2>
<ul class="dot fadein"><li>開店祝い・開業祝い：3本立ち。店内のカウンターやレジ横に置けるサイズです</li><li>就任祝い・昇進祝い：3本立ちが標準、会長・理事長クラスは5本立ち</li><li>開院祝い：3本立ち。待合室に置いても香りが少なく、清潔感があります</li><li>竣工祝い・上場祝い：5本立ち。エントランスでの存在感が出ます</li></ul>
<h2 class="fadein">スタンド花との違い</h2>
<p class="fadein">スタンド花は店先に置く「外向き」のお祝いで、見た目のボリュームと立札の目立ちやすさが強み。胡蝶蘭は店内・オフィスに置く「内向き」のお祝いで、長持ちと格式が強みです。店先と店内の両方に贈りたい場合は、スタンド花と胡蝶蘭のセットも承ります。</p>
<h2 class="fadein">胡蝶蘭のよくある質問</h2>
<div class="faq fadein">{''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in k_faq)}</div>
{cta()}
{related(url)}"""
lds = [{"@context":"https://schema.org","@type":"Product","name":"胡蝶蘭 大輪白（3本立ち・5本立ち）","description":desc,"url":SITE+url,"image":SITE+"/ogp.jpg","brand":{"@type":"Brand","name":"ハレスタ（HARE STAND）"},
        "offers":[{"@type":"Offer","name":n,"price":p.replace(",",""),"priceCurrency":"JPY","availability":"https://schema.org/InStock","url":SITE+url,"seller":{"@id":SITE+"/#florist"}} for n,_,p in FACTS["orchid"]]},
       faqld(k_faq), breadcrumb([("HOME","/"),("胡蝶蘭",url)])]
write(url, page(url, title, desc, "ORCHID", "沖縄の胡蝶蘭｜開店祝い・就任祝い・開院祝いに", "PHALAENOPSIS · NAHA · SOUTH OKINAWA", [("HOME","/"),("胡蝶蘭",None)], body, lds))
urls.append(url)

# ---------- エリアページ ----------
for a in AREAS:
    url = f"/area/{a['slug']}/"
    title = f"{a['name']}の開店祝いスタンド花｜12時までの注文で当日配達｜ハレスタ"
    desc = f"{a['name']}（{a['spots'].split('・')[0]}・{a['spots'].split('・')[1]}など）へ開店祝い・周年祝いのスタンド花を当日お届け。糸満市西崎の工房から自社配達、バルーン入り祝いスタンド¥16,500〜、立札・回収無料。"
    a_faq = [(f"{a['name']}は当日配達できますか？", f"はい。{a['name']}は当日{FACTS['cutoff']}までのご注文で当日お届けします。{a['access']}"),
             (f"{a['name']}への配達料はかかりますか？", "かかりません。祝いスタンド・胡蝶蘭の価格に南部7市町の配達料が含まれています。回収も無料です。"),
             (f"{a['name']}のどのエリアまで届けてもらえますか？", f"{a['name']}全域にお届けします。主なお届け先は{a['spots']}などです。{a['tip']}")]
    body = f"""
<p class="lead fadein">{esc(a['name'])}（{esc(a['kana'])}）への開店祝い・周年祝い・移転祝いのスタンド花は、糸満市西崎のハレスタ工房から自社配達。{esc(a['name'])}は当日{FACTS['cutoff']}までのご注文で当日お届けできる「南部7市町」のひとつです。{esc(a['scene'])}</p>
<h2 class="fadein">{esc(a['name'])}の主なお届けエリア</h2>
<p class="fadein">{esc(a['spots'])}。{esc(a['access'])}</p>
<h2 class="fadein">{esc(a['name'])}に当日お届けできる祝いスタンド</h2>
<div class="fadein">{price_block()}</div>
<h2 class="fadein">{esc(a['name'])}へのお届けで気をつけていること</h2>
<p class="fadein">{esc(a['tip'])}お届け後は設置した状態を撮影してLINEでお送りするので、県外からのご注文でも届いたことがその場でわかります。お花が終わる頃にはスタンドを無料で回収に伺います。</p>
<h2 class="fadein">{esc(a['name'])}への配達のよくある質問</h2>
<div class="faq fadein">{''.join(f'<details><summary>{esc(q)}</summary><p>{esc(ans)}</p></details>' for q,ans in a_faq)}</div>
{cta()}
{related(url)}"""
    lds = [service_ld(f"{a['name']}への祝い花スタンド配達", desc, url, [a['name']]), faqld(a_faq),
           breadcrumb([("HOME","/"),("お届けエリア","/#area"),(a['name'],url)])]
    write(url, page(url, title, desc, a['en'], f"{esc(a['name'])}の開店祝いスタンド花<br><span style='font-size:.6em;color:var(--gray)'>12時までのご注文で当日お届け</span>", f"{a['en']} · SAME-DAY DELIVERY", [("HOME","/"),("お届けエリア","/#area"),(a['name'],None)], body, lds))
    urls.append(url)

# ---------- ガイド ----------
for g in GUIDES:
    url = f"/guide/{g['slug']}/"
    title = f"{g['title']}｜ハレスタ"
    desc = g['lead'][:110]
    body = f"""
<p class="lead fadein">{esc(g['lead'])}</p>
{''.join(f'<h2 class="fadein">{esc(h)}</h2><p class="fadein">{esc(t)}</p>' for h,t in g['sections'])}
<h2 class="fadein">よくある質問</h2>
<div class="faq fadein">{''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in g['faq'])}</div>
{cta()}
{related(url)}"""
    lds = [article_ld(g['title'], desc, url), faqld(g['faq']), breadcrumb([("HOME","/"),("ガイド","/#guide"),(g['name'],url)])]
    write(url, page(url, title, desc, g['en'], esc(g['h1']), "GUIDE · CELEBRATION FLOWERS", [("HOME","/"),("ガイド","/#guide"),(g['name'],None)], body, lds))
    urls.append(url)

# ---------- sitemap ----------
sm = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      f'  <url><loc>{SITE}/</loc><lastmod>{UPDATED}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>']
for u in urls:
    pr = "0.8" if u.count("/")==2 else "0.7"
    sm.append(f'  <url><loc>{SITE}{u}</loc><lastmod>{UPDATED}</lastmod><changefreq>monthly</changefreq><priority>{pr}</priority></url>')
sm.append('</urlset>')
open(os.path.join(ROOT,"sitemap.xml"),"w",encoding="utf-8").write("\n".join(sm)+"\n")

print(f"generated {len(urls)} pages")
for u in urls: print(" ", u)
