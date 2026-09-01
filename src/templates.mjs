/**
 * HTML templates for every page type. Pure functions returning HTML strings.
 * Reuses the existing design-system class names from css/style.css.
 */
import { esc, attr, num, clip, seededPick, toISO, dubbed } from './util.mjs';
import { av } from './assets.mjs';
import { icon } from './icons.mjs';
import { SITE, ADS, ADBLOCK, url, ERAS, TYPES } from './config.mjs';
import { longDesc, metaDesc, episodeLongDesc, episodeMetaDesc, episodeFaq } from './describe.mjs';

// Inline SVG placeholder used when an external CDN image fails to load.
const ph = (w, h) =>
  `this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 ${w} ${h}%22%3E%3Crect fill=%22%231a1919%22 width=%22${w}%22 height=%22${h}%22/%3E%3C/svg%3E'`;

const FAVICONS = `
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon-192x192.png">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="${attr(SITE.nameAr)}">
  <meta name="mobile-web-app-capable" content="yes">`;

/**
 * Ad-blocker guard, inlined in <head> of every page. Inline because URL-based
 * blockers cannot remove it. Two independent detection signals:
 *
 *  1. NETWORK PROBE — fetches the real ad script URLs (no-cors). DNS-level
 *     blockers (AdGuard Private DNS, NextDNS, AdAway…) and network filter
 *     lists (uBlock, AdGuard desktop) make the fetch reject, which DOM checks
 *     can't see. Blocked only when EVERY configured ad URL rejects, so one
 *     flaky ad server never false-positives the whole site.
 *  2. COSMETIC BAIT — classic ad-div classes; catches blockers that only hide
 *     elements. Requires two consecutive hits to avoid false positives.
 *
 * Everything is self-contained: no external requests beyond the probes, no
 * class names an "ad" cosmetic filter could hide, silent for clean visitors.
 */
function adGuard() {
  if (!ADBLOCK.enabled) return '';
  const relaxed = ADBLOCK.relaxed ? 'true' : 'false';
  const netMode = `'${ADBLOCK.networkMode === 'hard' ? 'hard' : ADBLOCK.networkMode === 'off' ? 'off' : 'soft'}'`;
  const probes = [...new Set(
    [
      ADS.popunder.enabled ? ADS.popunder.scriptSrc : '',
      ADS.socialBar.enabled ? ADS.socialBar.scriptSrc : '',
      ...ADS.nativeBanners.filter((n) => n.enabled && n.scriptSrc).map((n) => n.scriptSrc),
      ...ADS.banners.filter((b) => b.enabled && b.invokeSrc).map((b) => b.invokeSrc),
    ]
      .filter(Boolean)
      .map((u) => { try { return new URL(u).href; } catch { return ''; } })
      .filter(Boolean)
  )];
  return `
  <script>
  (function () {
    'use strict';
    var RELAXED = ${relaxed}, MODE = ${netMode}, KEY = 'kg_adb_ok', ACK = 'kg_net_ack', NETV = 'kg_net_v', PROBES = ${JSON.stringify(probes)}, shown = false, hits = 0;
    /* Generic ad-serving domains: blocked by every ad blocker (AdGuard
       app/DNS default, uBlock, Brave) but almost never by carriers — the
       discriminator between "visitor runs a blocker they can turn off" and
       "ISP filters ad domains, nothing to do". Several, so a filter that
       misses one domain still trips on another. */
    var GENERIC = [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
      'https://www.highperformanceformat.com/'
    ];
    function passed() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    function mark(ok) { try { sessionStorage.setItem(KEY, ok ? '1' : '0'); } catch (e) {} }
    function acked() { try { return sessionStorage.getItem(ACK) === '1'; } catch (e) { return false; } }
    function markAck() { try { sessionStorage.setItem(ACK, '1'); } catch (e) {} }
    function baitHidden() {
      var b = document.createElement('div');
      b.className = 'adsbox ad-banner pub_300x250 text-ad ad-wrapper ad-slot';
      b.id = 'ad-banner-1';
      b.innerHTML = '&nbsp;';
      b.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:300px;height:60px;pointer-events:none;';
      document.body.appendChild(b);
      var hidden = false;
      try {
        var cs = window.getComputedStyle(b);
        hidden = b.offsetHeight === 0 || b.offsetParent === null || cs.display === 'none' || cs.visibility === 'hidden';
      } catch (e) {}
      b.parentNode.removeChild(b);
      return hidden;
    }
    /* One probe per configured ad URL: 'ok' | 'blocked' | 'timeout'.
       A hung request is NOT treated as blocking (could be a slow network). */
    function probe(url) {
      return new Promise(function (res) {
        var settled = false;
        var t = setTimeout(function () { if (!settled) { settled = true; res('timeout'); } }, 4000);
        fetch(url, { mode: 'no-cors', cache: 'no-store' })
          .then(function () { if (!settled) { settled = true; clearTimeout(t); res('ok'); } })
          .catch(function () { if (!settled) { settled = true; clearTimeout(t); res('blocked'); } });
      });
    }
    function netBlocked() {
      if (!PROBES.length || MODE === 'off') return Promise.resolve(false);
      return Promise.all(PROBES.map(probe)).then(function (rs) {
        return rs.every(function (r) { return r === 'blocked'; });
      });
    }
    /* Verdict, cached for the session so repeat page views cost zero probes:
       'blk' = our ads + any generic ad domain unreachable → ad blocker
       'isp' = only our ad domains unreachable → carrier/ISP filtering
       'ok'  = ads reachable. */
    function netVerdict() {
      if (MODE === 'off') return Promise.resolve('off');
      var cached = null;
      try { cached = sessionStorage.getItem(NETV); } catch (e) {}
      if (cached) return Promise.resolve(cached);
      return Promise.all([netBlocked(), Promise.all(GENERIC.map(probe))]).then(function (rs) {
        var gen = rs[1].some(function (r) { return r === 'blocked'; });
        var v = rs[0] && gen ? 'blk' : rs[0] ? 'isp' : 'ok';
        try { sessionStorage.setItem(NETV, v); } catch (e) {}
        return v;
      });
    }
    function shell(dismissible) {
      var ov = document.createElement('div');
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,10,' + (dismissible ? '.55' : '.94') + ');backdrop-filter:blur(8px);display:flex;align-items:' + (dismissible ? 'flex-end' : 'center') + ';justify-content:center;padding:1.25rem;font-family:Cairo,system-ui,sans-serif;direction:rtl;';
      var card = document.createElement('div');
      card.style.cssText = 'background:#1a1919;color:#fff;border:1px solid #484847;border-radius:1rem;max-width:430px;width:100%;padding:1.75rem 1.5rem;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.6);';
      ov.appendChild(card);
      if (!dismissible) document.documentElement.style.overflow = 'hidden';
      document.body.appendChild(ov);
      return { ov: ov, card: card };
    }
    function unshell(ov) {
      document.documentElement.style.overflow = '';
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    /* Tier 1: hard overlay. A browser extension is hiding ad elements — the
       visitor can whitelist us, so hold the page until they do. */
    function notice() {
      if (shown) return; shown = true;
      var ui = shell(false);
      ui.card.innerHTML =
        '<div style="font-size:2.6rem;line-height:1;margin-bottom:.75rem">🛡️</div>' +
        '<h2 style="font-size:1.25rem;font-weight:800;margin:0 0 .6rem">يرجى تعطيل مانع الإعلانات</h2>' +
        '<p style="color:#adaaaa;font-size:.9rem;line-height:1.9;margin:0 0 .75rem">موقع كارتوني مجاني بالكامل للجميع، والإعلانات هي ما يُبقيه يعمل ويُحافظ على الحلقات والسرعة. فضلاً أضف kartoney.com إلى القائمة المسموح لديك في مانع الإعلانات ثم حدّث الصفحة.</p>' +
        '<p style="color:#777575;font-size:.78rem;line-height:1.8;margin:0 0 1.1rem">💡 من أيقونة درع المتصفح أو إضافة مانع الإعلانات ⇦ اختر «إيقافه على هذا الموقع».<br>📱 إذا كنت تستخدم AdGuard DNS أو خاصية Private DNS في هاتفك: أوقفها من إعدادات الشبكة (اختر DNS تلقائي) ثم أعد فتح الصفحة.</p>';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'لقد عطّلت مانع الإعلانات — تحقّق الآن';
      btn.style.cssText = 'width:100%;padding:.8rem 1rem;border:0;border-radius:.75rem;background:#ffac54;color:#583100;font-family:inherit;font-size:.95rem;font-weight:800;cursor:pointer;';
      btn.onclick = function () {
        btn.textContent = 'جارٍ التحقق…';
        try { sessionStorage.removeItem(NETV); } catch (e) {}
        Promise.all([netVerdict(), Promise.resolve(baitHidden())]).then(function (rs) {
          if (rs[0] === 'ok' && !rs[1]) { mark(true); unshell(ui.ov); location.reload(); return; }
          btn.textContent = 'لم نكتشف التعطيل بعد — عطّله ثم أعد المحاولة';
        });
      };
      ui.card.appendChild(btn);
      if (RELAXED) {
        var skip = document.createElement('button');
        skip.type = 'button';
        skip.textContent = 'متابعة الموقع كما هو';
        skip.style.cssText = 'width:100%;margin-top:.5rem;padding:.55rem 1rem;border:0;border-radius:.75rem;background:transparent;color:#adaaaa;font-family:inherit;font-size:.8rem;cursor:pointer;text-decoration:underline;';
        skip.onclick = function () { mark(true); unshell(ui.ov); };
        ui.card.appendChild(skip);
      }
    }
    /* Tier 2: dismissible card. Our ad domains are unreachable — could be
       AdGuard DNS, could be the carrier. Never trap someone who can't fix it:
       show once per session, always dismissible. */
    function netNotice() {
      var ui = shell(true);
      ui.card.style.textAlign = 'start';
      ui.card.innerHTML =
        '<h2 style="font-size:1.05rem;font-weight:800;margin:0 0 .5rem">📣 الإعلانات محجوبة على شبكتك</h2>' +
        '<p style="color:#adaaaa;font-size:.85rem;line-height:1.9;margin:0 0 .5rem">كارتوني مجاني بفضل الإعلانات، ونكتشف أنها لا تصلك. إن كنت تستخدم مانع إعلانات أو <strong>AdGuard DNS / Private DNS</strong> عطّله وأعد التحميل ليدعم الموقع.</p>' +
        '<p style="color:#777575;font-size:.78rem;line-height:1.7;margin:0 0 1rem">إن لم تستخدم أي مانع، فمزود الإنترنت لديك قد يحجب الإعلانات — يمكنك المتابعة بشكل طبيعي.</p>';
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:.6rem;flex-wrap:wrap';
      var go = document.createElement('button');
      go.type = 'button';
      go.textContent = 'متابعة المشاهدة';
      go.style.cssText = 'flex:1;padding:.75rem 1rem;border:0;border-radius:.75rem;background:#ffac54;color:#583100;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;';
      go.onclick = function () { markAck(); unshell(ui.ov); };
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'أعد التحقق';
      retry.style.cssText = 'flex:1;padding:.75rem 1rem;border:1px solid #484847;border-radius:.75rem;background:transparent;color:#adaaaa;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;';
      retry.onclick = function () {
        retry.textContent = '…';
        try { sessionStorage.removeItem(NETV); } catch (e) {}
        netVerdict().then(function (v) {
          if (v === 'ok') { markAck(); unshell(ui.ov); location.reload(); return; }
          retry.textContent = 'ما زالت محجوبة';
        });
      };
      row.appendChild(go); row.appendChild(retry);
      ui.card.appendChild(row);
    }
    function start() {
      if (passed() || shown) return;
      netVerdict().then(function (v) {
        if (shown || passed()) return;
        if (v === 'blk') {
          /* Ad blocker (app or DNS) — the visitor can turn it off. */
          if (MODE === 'soft' || MODE === 'hard') { mark(false); notice(); return; }
          if (!acked()) netNotice();
          return;
        }
        if (v === 'isp') {
          /* Carrier-level filtering — not the visitor's doing. Never trap. */
          if (MODE === 'hard') { mark(false); notice(); return; }
          if (!acked()) netNotice();
          return;
        }
        if (baitHidden()) { if (++hits >= 2) { mark(false); notice(); } }  // cosmetic-only block
        else { mark(true); hits = 0; }                            // clean visitor
      });
      if (!shown && !passed() && MODE !== 'off') setTimeout(function () {
        if (!shown && !passed() && baitHidden()) notice();
      }, 1400);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  })();
  </script>`;
}

/* ════════════════════════════ LAYOUT ════════════════════════════ */
export function layout({ title, description, path, body, jsonLd = [], ogImage = null, ogType = 'website', preloadImage = null, extraHead = '', scripts = '' }) {
  const canonical = url.abs(path);
  const img = url.abs(ogImage || SITE.ogImage);
  return `<!DOCTYPE html>
<html class="dark" dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ar" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${canonical}">
  <meta http-equiv="content-language" content="ar">
  <meta name="theme-color" content="${SITE.themeColor}">
  <meta name="color-scheme" content="dark">
${FAVICONS}
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:image" content="${attr(img)}">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:site_name" content="${attr(SITE.nameAr)} | ${attr(SITE.nameEn)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${attr(img)}">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/cairo-arabic.woff2" crossorigin>
${preloadImage ? `  <link rel="preload" as="image" href="${attr(preloadImage)}" fetchpriority="high">\n` : ''}  <link rel="stylesheet" href="${av('/css/style.css')}">
${adGuard()}
${jsonLd.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${extraHead}
  <!-- Cloudflare Web Analytics, installed by hand. The dashboard's automatic
       injection rewrites responses as they pass through the edge from an origin;
       this HTML is generated by the Worker inside Cloudflare, so there is no
       pass-through to rewrite and the beacon never appears. Keep in sync with the
       copy in public/live_streaming_apps.html. The token is public by design. -->
  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "325474a0021f47cab732efd34844abbd"}'></script>
</head>
<body>
${topNav()}
${sidebar()}
${searchOverlay()}
  <main class="main-content">
${body}
  </main>
${bottomNav()}
${bannerMount('mobileAnchor')}
  <script src="${av('/js/main.js')}" defer></script>
  <script src="${av('/js/widgets.js')}" defer></script>
${scripts || ''}
</body>
</html>`;
}

/* ════════════════════════════ CHROME ════════════════════════════ */
function topNav() {
  return `  <nav class="top-nav" id="top-nav">
    <div style="display:flex;align-items:center;gap:2rem">
      <a href="/" class="nav-logo">${esc(SITE.nameAr)}</a>
      <ul class="nav-links">
        <li><a href="/" data-page="landing">الرئيسية</a></li>
        <li><a href="/lives/" data-page="home">مسلسلات وبث مباشر</a></li>
        <li><a href="${url.genresIndex()}" data-page="genre">التصنيفات</a></li>
        <li><a href="${url.category('classic')}" data-page="classic">كلاسيكي</a></li>
        <li><a href="${url.category('anime')}" data-page="anime">أنمي</a></li>
        <li><a href="${url.library()}" data-page="library">المكتبة</a></li>
      </ul>
    </div>
    <div class="nav-actions" style="display:flex;align-items:center;gap:1.5rem">
      <a href="/live_streaming_apps/" class="nav-download-badge">
        <span class="pulse-ring"></span>
        ${icon('tv', { size: 16 })}
        <span>التطبيق (هاتف · تابلت · تلفزيون) 🔥</span>
      </a>
      <button id="pwa-install-btn" onclick="installPWA()" style="display:none;background:var(--primary);color:var(--on-primary);border:none;padding:.4rem 1rem;border-radius:1rem;font-weight:700;font-size:.9rem;cursor:pointer;align-items:center;gap:.3rem">${icon('download', { size: 18 })} تثبيت</button>
      <div class="nav-search" onclick="openSearch()" style="cursor:pointer">
        ${icon('search', { size: 20 })}
        <span style="color:rgba(173,170,170,0.6);font-size:0.875rem;pointer-events:none">ابحث عن مسلسلك المفضل...</span>
      </div>
      <button onclick="openSearch()" class="mobile-search-btn" aria-label="بحث" style="color:var(--on-surface-variant)">${icon('search', { size: 24 })}</button>
    </div>
  </nav>`;
}

function sidebar() {
  return `  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h3>أهلاً بك</h3>
      <p>مشاهدة ممتعة</p>
    </div>
    <nav class="sidebar-links">
      <a href="/" class="sidebar-link">${icon('home')}<span>الرئيسية</span></a>
      <a href="/lives/" class="sidebar-link">${icon('tv', { filled: true })}<span>البث والمشاهدة</span></a>
      <a href="/live_streaming_apps/" class="sidebar-link" style="color:var(--primary);font-weight:700">${icon('tv')}<span>تحميل التطبيق 🔥</span></a>
      <hr style="border:0;border-top:1px solid var(--outline-variant);margin:.5rem 1rem;opacity:.5">
      <a href="${url.genresIndex()}" class="sidebar-link">${icon('category')}<span>التصنيفات</span></a>
      <a href="${url.category('classic')}" class="sidebar-link">${icon('tv')}<span>كرتون كلاسيكي</span></a>
      <a href="${url.category('anime')}" class="sidebar-link">${icon('animation')}<span>أنمي</span></a>
      <a href="${url.era('90s')}" class="sidebar-link">${icon('history')}<span>كرتون التسعينات</span></a>
      <a href="${url.library()}" class="sidebar-link">${icon('video_library')}<span>كل المسلسلات</span></a>
    </nav>
  </aside>`;
}

function bottomNav() {
  return `  <nav class="bottom-nav" id="bottom-nav">
    <a href="/" class="bottom-nav-item" data-page="landing">${icon('home', { filled: true })}<span>الرئيسية</span></a>
    <a href="/lives/" class="bottom-nav-item" data-page="home">${icon('tv')}<span>المشاهدة</span></a>
    <button onclick="openSearch()" class="bottom-nav-item" data-page="search" aria-label="بحث">${icon('search')}<span>بحث</span></button>
    <a href="/live_streaming_apps/" class="bottom-nav-item" style="color:var(--primary)">${icon('tv')}<span>التطبيق</span></a>
  </nav>`;
}

function searchOverlay() {
  return `  <div class="search-overlay" id="search-overlay" onclick="if(event.target===this)closeSearch()">
    <div class="search-box">
      ${icon('search', { size: 24, cls: 'text-muted' })}
      <input type="text" id="search-input" placeholder="ابحث عن مسلسل، حلقة..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="بحث">
      <button onclick="closeSearch()" aria-label="إغلاق">${icon('close', { size: 20, cls: 'text-muted' })}</button>
    </div>
    <div class="search-results" id="search-results">
      <p class="text-center text-muted" style="padding:2rem">اكتب اسم المسلسل للبحث...</p>
    </div>
  </div>`;
}

function breadcrumbs(items) {
  // items: [{label, href}] — last item is current (no href)
  return `  <nav aria-label="مسار التنقل" style="padding:calc(var(--navbar-h) + 1rem) 2rem 0;font-size:0.85rem;color:var(--on-surface-variant)">
    ${items
      .map((it, i) =>
        it.href
          ? `<a href="${it.href}" style="color:var(--primary-dim)">${esc(it.label)}</a>${i < items.length - 1 ? ' <span style="opacity:.5">›</span> ' : ''}`
          : `<span>${esc(it.label)}</span>`
      )
      .join('')}
  </nav>`;
}

function footer(totals) {
  return `  <footer class="site-footer">
    <div class="footer-brand">${esc(SITE.nameAr)}</div>
    <p>أكبر مكتبة كرتون وأنمي مدبلج بالعربية — مجاناً</p>
    <div class="footer-stats">
      <div class="footer-stat"><span class="stat-num">${num(totals.cartoons)}</span><span class="stat-label">مسلسل</span></div>
      <div class="footer-stat"><span class="stat-num">${num(totals.episodes)}</span><span class="stat-label">حلقة</span></div>
      <div class="footer-stat"><span class="stat-num">${num(totals.genres)}</span><span class="stat-label">تصنيف</span></div>
      <div class="footer-stat"><span class="stat-num">4</span><span class="stat-label">عقود من الذكريات</span></div>
    </div>
    <nav style="margin:1.25rem 0;display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;justify-content:center;font-size:0.85rem">
      <a href="/" style="color:var(--on-surface-variant)">الرئيسية</a>
      <a href="${url.genresIndex()}" style="color:var(--on-surface-variant)">التصنيفات</a>
      <a href="${url.library()}" style="color:var(--on-surface-variant)">كل المسلسلات</a>
      ${ERAS.map((e) => `<a href="${url.era(e.key)}" style="color:var(--on-surface-variant)">${esc(e.label)}</a>`).join('')}
    </nav>
    <p style="opacity:0.5">© ${new Date().getFullYear()} ${esc(SITE.nameEn)}.com — جميع الحقوق محفوظة</p>
  </footer>`;
}

/* ── Ad slots ─────────────────────────────────────────────────────────
   Server-side containers only. The Adsterra scripts are injected lazily by
   dist/js/widgets.js (built from adsRuntime in src/build.mjs) when the slot
   approaches the viewport. Renders nothing unless the slot is enabled in
   src/config.mjs, so disabled slots cost zero bytes and zero layout shift. */
function nativeSlot(id, { minHeight = 0, cls = '' } = {}) {
  const slot = ADS.nativeBanners.find((n) => n.id === id);
  if (!slot || !slot.enabled || !slot.containerId) return '';
  return `\n    <div class="ad-slot${cls ? ' ' + cls : ''}"${minHeight || slot.minHeight ? ` style="min-height:${slot.minHeight || minHeight}px"` : ''}><div id="${attr(slot.containerId)}"></div></div>`;
}

function bannerMount(id) {
  const slot = ADS.banners.find((b) => b.id === id);
  if (!slot || !slot.enabled || !slot.adKey) return '';
  const sticky = slot.stickyMobile ? ' ad-sticky-mobile' : '';
  // Sticky ads need a visible escape hatch: an anchor people can't close
  // reads as an intrusive interstitial and burns mobile goodwill. Hidden for
  // the rest of the session once dismissed (checked again by widgets.js).
  const close = slot.stickyMobile
    ? `<button type="button" class="ad-close" aria-label="إغلاق الإعلان" onclick="try{sessionStorage.setItem('kg_anchor_off','1')}catch(e){};var s=this.parentNode;s.style.display='none';return false;">✕</button>`
    : '';
  return `\n    <div class="ad-slot ad-slot-banner${sticky}" data-banner="${attr(id)}">${close}</div>`;
}

/* ════════════════════════════ CARDS ════════════════════════════ */
function landscapeCard(c, eager = false) {
  return `<a class="card-landscape" href="${url.cartoon(c.slug)}">
      <div class="card-thumb">
        <img src="${attr(c.logo)}" alt="${attr(c.name)}" width="280" height="158" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="${ph(280, 158)}">
        <div class="card-overlay"><div class="card-play">${icon('play_arrow', { size: 20, filled: true })}</div></div>
      </div>
      <h3 class="card-title">${esc(c.name)}</h3>
      <div class="card-meta"><span>${num(c.total_episodes)} حلقة</span><span class="dot"></span><span>${esc(c.genres.map((g) => g.ar).join(' • '))}</span></div>
    </a>`;
}

function portraitCard(c) {
  return `<a class="card-portrait" href="${url.cartoon(c.slug)}">
      <div class="card-thumb">
        <img src="${attr(c.logo)}" alt="${attr(c.name)}" width="200" height="300" loading="lazy" decoding="async" onerror="${ph(200, 300)}">
        ${c.era ? `<span class="badge">${esc(c.era)}</span>` : ''}
      </div>
      <h3 class="card-title">${esc(c.name)}</h3>
    </a>`;
}

function scrollRow(cartoons, kind = 'landscape') {
  const fn = kind === 'landscape' ? landscapeCard : portraitCard;
  return `<div class="scroll-row no-scrollbar">${cartoons.map((c) => fn(c)).join('')}</div>`;
}

/* ════════════════════════════ HOME ════════════════════════════ */
export function homePage(data) {
  const featured = (data.featured.length ? data.featured : data.popular).slice(0, 5);
  const hero = featured[0] || data.cartoons[0];
  const popular = (data.popular.length ? data.popular : data.cartoons).slice(0, 12);
  const grid = seededPick(data.cartoons, 18, 7);
  const bento = data.cartoons.slice(0, 4);
  const suggested = seededPick(data.cartoons, 8, 13);

  const heroData = featured.map((c) => ({ name: c.name, desc: clip(c.description || '', 160), logo: c.logo, href: url.cartoon(c.slug) }));

  const body = `
  <h1 class="sr-only">${esc(SITE.titleAr)} — شاهد آلاف حلقات الكرتون والأنمي المدبلج بالعربية</h1>
  <section class="hero" id="hero-section" data-hero='${attr(JSON.stringify(heroData))}'>
    <div class="hero-bg">
      <img id="hero-img" src="${attr(hero.logo)}" alt="${attr(hero.name)}" width="1280" height="720" fetchpriority="high" decoding="async" onerror="${ph(1280, 720)}">
      <div class="hero-gradient"></div>
      <div class="hero-side-gradient"></div>
    </div>
    <div class="hero-content" id="hero-content">
      <div class="hero-badge"><span class="tag">⭐ الأكثر شهرة</span></div>
      <h2 id="hero-title" style="font-size:clamp(2rem,7vw,5rem);font-weight:900;line-height:1.1;letter-spacing:-2px;margin-bottom:1rem">${esc(hero.name)}</h2>
      <p class="hero-desc" id="hero-desc">${esc(clip(hero.description || '', 160))}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" id="hero-link" href="${url.cartoon(hero.slug)}">${icon('play_arrow', { filled: true })} مشاهدة</a>
        <a class="btn btn-glass" href="${url.library()}">${icon('video_library')} كل المسلسلات</a>
      </div>
      <div class="hero-dots" id="hero-dots" style="display:flex;gap:8px;margin-top:1.5rem">
        ${featured.map((_, i) => `<button data-i="${i}" aria-label="شريحة ${i + 1}" style="width:${i === 0 ? '24px' : '8px'};height:8px;border-radius:4px;background:${i === 0 ? 'var(--primary)' : 'var(--surface-container-highest)'};transition:all .3s;border:none;cursor:pointer"></button>`).join('')}
      </div>
    </div>
  </section>

  <div class="content-rows">
    <!-- Premium App Promo Banner -->
    <div class="app-promo-banner">
      <div class="banner-glow"></div>
      <div class="banner-content">
        <div class="banner-text">
          <span class="banner-badge">🔥 تطبيق الأندرويد الحصري</span>
          <h2>حمل تطبيق الأسطورة أونلاين — كارتوني في جيبك</h2>
          <p>مكتبة كارتوني كاملة مدمجة داخل التطبيق، مع البث المباشر وآلاف القنوات. ملف واحد يعمل على الهاتف والتابلت وتلفزيون أندرويد. تحميل مباشر وآمن.</p>
        </div>
        <div class="banner-actions">
          <a href="/ostora_online_v1.1.apk?v=1.1" class="btn btn-banner-download" download="ostora_online_v1.1.apk">
            ${icon('download', { size: 18 })}
            <span>تحميل التطبيق مجاناً (APK)</span>
          </a>
          <a href="/live_streaming_apps/" class="btn btn-banner-more">تفاصيل المزايا</a>
        </div>
      </div>
    </div>

    <section>
      <div class="section-header"><h2 class="section-title"><span class="accent"></span>الأكثر مشاهدة</h2><a href="${url.library()}" class="section-link">عرض الكل</a></div>
      ${scrollRow(popular, 'landscape')}
    </section>

    <section>
      <div class="section-header"><h2 class="section-title"><span class="accent gold"></span>تصفح حسب التصنيف</h2></div>
      <div class="genre-row no-scrollbar" style="margin-bottom:1.5rem">
        ${data.genres.map((g) => `<a class="genre-chip" href="${url.genre(g.en)}"><span class="genre-icon">${g.icon || '🎬'}</span> ${esc(g.name_ar)}</a>`).join('')}
      </div>
      <div class="cartoons-grid">${grid.map((c) => portraitCard(c)).join('')}</div>
    </section>

    <section>
      <div class="section-header"><h2 class="section-title"><span class="accent" style="background:var(--secondary)"></span>اكتشف المسلسلات</h2></div>
      <div class="bento-grid">
        <a class="bento-item featured" href="${url.cartoon(bento[0].slug)}">
          <img src="${attr(bento[0].logo)}" alt="${attr(bento[0].name)}" width="600" height="800" loading="lazy" decoding="async" onerror="${ph(600, 800)}">
          <div class="bento-overlay"></div>
          <div class="bento-content">
            <span style="display:inline-block;background:var(--secondary);color:var(--on-secondary);padding:.2rem .6rem;border-radius:var(--radius-full);font-size:.7rem;font-weight:700;margin-bottom:.5rem">${num(bento[0].total_episodes)} حلقة</span>
            <h3 style="font-size:1.5rem;font-weight:900;margin-bottom:.25rem">${esc(bento[0].name)}</h3>
            <p style="color:var(--on-surface-variant);font-size:.8rem">${esc(bento[0].genres.map((g) => g.ar).join(' • '))}</p>
          </div>
        </a>
        ${bento.slice(1, 4).map((c) => `<a class="bento-item" href="${url.cartoon(c.slug)}" style="min-height:180px">
          <img src="${attr(c.logo)}" alt="${attr(c.name)}" width="400" height="200" loading="lazy" decoding="async" onerror="${ph(400, 200)}">
          <div class="bento-small-overlay"></div>
          <div class="bento-small-title"><h4>${esc(c.name)}</h4></div>
        </a>`).join('')}
      </div>
    </section>
${nativeSlot('homeMid')}
    <section>
      <div class="section-header"><h2 class="section-title"><span class="accent red"></span>مقترح لك</h2></div>
      ${scrollRow(suggested, 'portrait')}
    </section>

    ${ERAS.map((era) => {
      const list = data.byEra(era.key).slice(0, 10);
      if (!list.length) return '';
      return `<section>
      <div class="section-header"><h2 class="section-title"><span class="accent"></span>${era.emoji} ${esc(era.label)}</h2><a href="${url.era(era.key)}" class="section-link">عرض الكل</a></div>
      ${scrollRow(list, 'landscape')}
    </section>`;
    }).join('\n')}

    <section class="seo-section">
      <h2>كارتوني — كرتون عربي وأنمي مدبلج بجودة عالية</h2>
      <p>كارتوني هو مكتبة كرتون عربي متكاملة تجمع لك أشهر مسلسلات الكرتون القديم والأنمي المدبلج بالعربية في مكان واحد، بدون تسجيل ولا اشتراك. سواء كنت تبحث عن <a href="${url.era('90s')}">كرتون التسعينات</a> الذي كبرت معه، أو <a href="${url.era('2000s')}">كرتون الألفية</a>، أو أحدث <a href="${url.category('anime')}">أنمي مدبلج</a> — ستجده هنا كاملاً وبجميع حلقاته، من <a href="/cartoon/detective-conan/">المحقق كونان</a> و<a href="/cartoon/naruto/">ناروتو</a> إلى كلاسيكيات <a href="${url.category('classic')}">الكرتون الكلاسيكي</a> مثل عدنان ولينا وسيف النار.</p>
      <p>نوفّر ${num(data.totals.episodes)} حلقة من ${num(data.totals.cartoons)} مسلسلاً، مصنّفة حسب <a href="${url.genresIndex()}">التصنيفات</a> والعقود لتصل إلى ما تريد بسرعة: كرتون أكشن ومغامرات، كرتون رياضي، أنمي غموض، وأعمال عائلية مناسبة لكل الأعمار. كل الحلقات تعمل مباشرة من المتصفح على الهاتف والحاسوب، وتتوفر أيضاً داخل <a href="/live_streaming_apps/">تطبيق الأسطورة أونلاين</a> للهاتف والتلفزيون.</p>
      <div class="seo-faq">
        <h3>أسئلة شائعة عن مشاهدة الكرتون في كارتوني</h3>
        <details>
          <summary>هل مشاهدة الكرتون والأنمي في كارتوني مجانية؟</summary>
          <p>نعم، جميع الحلقات متاحة مجاناً بالكامل وبدون تسجيل حساب أو دفع أي اشتراك — الموقع يعمل عبر الإعلانات فقط.</p>
        </details>
        <details>
          <summary>هل الحلقات مدبلجة بالعربية؟</summary>
          <p>نعم، كل المسلسلات في مكتبة كارتوني مدبلجة بالعربية بجودة صوت واضحة، ومصنّفة حسب التصنيف والعقد لتسهيل الوصول إليها.</p>
        </details>
        <details>
          <summary>هل يمكنني المشاهدة على الهاتف؟</summary>
          <p>بالتأكيد. الموقع متوافق مع الهاتف والتابلت والحاسوب، ويتوفر أيضاً تطبيق أندرويد يجمع المكتبة كاملة مع البث المباشر.</p>
        </details>
      </div>
    </section>
  </div>
${footer(data.totals)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: `${SITE.url}/`,
      name: SITE.nameAr,
      alternateName: SITE.nameEn,
      description: SITE.descAr,
      inLanguage: 'ar',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/library/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.nameAr,
      alternateName: SITE.nameEn,
      url: `${SITE.url}/`,
      logo: { '@type': 'ImageObject', url: url.abs('/images/favicon-512x512.png'), width: 512, height: 512 },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'هل مشاهدة الكرتون والأنمي في كارتوني مجانية؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم، جميع الحلقات متاحة مجاناً بالكامل وبدون تسجيل حساب أو دفع أي اشتراك — الموقع يعمل عبر الإعلانات فقط.' },
        },
        {
          '@type': 'Question',
          name: 'هل الحلقات مدبلجة بالعربية؟',
          acceptedAnswer: { '@type': 'Answer', text: 'نعم، كل المسلسلات في مكتبة كارتوني مدبلجة بالعربية بجودة صوت واضحة، ومصنّفة حسب التصنيف والعقد لتسهيل الوصول إليها.' },
        },
        {
          '@type': 'Question',
          name: 'هل يمكنني المشاهدة على الهاتف؟',
          acceptedAnswer: { '@type': 'Answer', text: 'بالتأكيد. الموقع متوافق مع الهاتف والتابلت والحاسوب، ويتوفر أيضاً تطبيق أندرويد يجمع المكتبة كاملة مع البث المباشر.' },
        },
      ],
    },
  ];

  return layout({
    title: SITE.titleAr + ' | Kartoney.com',
    description: SITE.descAr,
    path: '/lives/',
    body,
    jsonLd,
    preloadImage: hero.logo,
  });
}

/* ════════════════════════════ LANDING PAGE ════════════════════════════ */
export function landingPage(data) {
  const popular = (data.popular.length ? data.popular : data.cartoons).slice(0, 6);

  const body = `
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="landing-hero">
      <div class="landing-hero-bg">
        <div class="mesh-gradient"></div>
        <div class="ambient-glow"></div>
      </div>
      
      <div class="landing-hero-container">
        <div class="landing-hero-content">
          <div class="premium-badge">
            <span class="pulse-dot"></span>
            <span>تطبيق الأسطورة أونلاين — للهاتف والتابلت والتلفزيون 📱</span>
          </div>
          <h1 class="landing-main-title">
            شاهد كرتونك المفضل<br>
            <span class="gradient-text">على كل شاشة عندك!</span>
          </h1>
          <p class="landing-subtitle">
            ملف APK واحد يعمل على الهاتف والتابلت وتلفزيون أندرويد. مكتبة كارتوني كاملة مدمجة بداخله — ${num(data.totals.cartoons)} مسلسل و${num(data.totals.episodes)} حلقة — مع البث المباشر وآلاف القنوات والإذاعات، مجاناً وبدون تسجيل حساب.
          </p>
          
          <div class="landing-actions">
            <a href="/ostora_online_v1.1.apk?v=1.1" class="btn btn-premium-download" download="ostora_online_v1.1.apk">
              <div class="btn-download-icon">
                ${icon('download', { size: 24, filled: true })}
              </div>
              <div class="btn-download-text">
                <span class="small-label">تحميل مباشر APK</span>
                <span class="large-label">تنزيل التطبيق للأندرويد</span>
              </div>
            </a>
            
            <a href="/lives/" class="btn btn-glass-enter">
              ${icon('play_arrow', { size: 24, filled: true })}
              <span>دخول الموقع والمشاهدة</span>
            </a>
          </div>

          <div class="app-stats">
            <div class="app-stat-item">
              <span class="stat-number">${num(data.totals.episodes)}</span>
              <span class="stat-lbl">حلقة داخل التطبيق</span>
            </div>
            <div class="app-stat-item">
              <span class="stat-number">3</span>
              <span class="stat-lbl">هاتف · تابلت · تلفزيون</span>
            </div>
            <div class="app-stat-item">
              <span class="stat-number" dir="ltr">5 MB</span>
              <span class="stat-lbl">حجم التطبيق</span>
            </div>
          </div>
        </div>

        <!-- Phone Mockup Container -->
        <div class="landing-hero-mockup">
          <div class="phone-mockup">
            <div class="phone-screen">
              <!-- A real screenshot of the app, not a drawing of one. -->
              <img src="/images/app/home.webp" alt="الشاشة الرئيسية لتطبيق الأسطورة أونلاين" width="540" height="1200" fetchpriority="high" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block">
            </div>
            <div class="phone-button"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Install APK Section (Bento Grid) -->
    <section class="landing-section">
      <div class="container">
        <div class="section-center-header">
          <span class="section-subtitle">لماذا تحتاج إلى تطبيق الأسطورة أونلاين؟</span>
          <h2 class="section-main-title">مزايا حصرية غير متوفرة في الموقع</h2>
        </div>
        
        <div class="bento-features">
          <div class="bento-feature-card size-double feature-ads-free">
            <div class="bento-icon-wrapper">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h3>تجربة خالية تماماً من الإعلانات المزعجة</h3>
            <p>مشاهدة آمنة تماماً ومباشرة دون نوافذ منبثقة أو روابط إعادة توجيه ضارة. متعة المشاهدة الحقيقية لعائلتك وأطفالك بأمان تام وبدون تشتيت.</p>
            <div class="bento-glass-shine"></div>
          </div>

          <div class="bento-feature-card feature-live">
            <div class="bento-icon-wrapper">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </div>
            <h3>بث مباشر للمباريات والمسلسلات</h3>
            <p>تابع أهم مباريات اليوم بث حي ومباشر بدون تقطيع وبأكثر من جودة تناسب اتصالك بالإنترنت.</p>
          </div>

          <div class="bento-feature-card feature-speed">
            <div class="bento-icon-wrapper">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 12 6a7.92 7.92 0 0 1 5.3 2.05l1.41-1.41A9.95 9.95 0 0 0 12 4C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10a9.9 9.9 0 0 0-1.62-5.43zM10 10.1v5.8l5-2.9z"/>
              </svg>
            </div>
            <h3>سيرفرات فائقة السرعة</h3>
            <p>تقنيات ذكية تعمل على تسريع تحميل الحلقات لتجنب التقطيع والتخزين المؤقت، حتى مع أضعف سرعات الإنترنت.</p>
          </div>

          <div class="bento-feature-card size-double feature-notif">
            <div class="bento-icon-wrapper">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
            <h3>تنبيهات فورية وإشعارات حية</h3>
            <p>لا تفوت حلقة جديدة من الأنمي الخاص بك أو موعد مباراة مصيرية. التطبيق يرسل لك إشعاراً ذكياً على هاتفك فور بدء البث أو توفر حلقات جديدة لتكون أول من يشاهد.</p>
            <div class="bento-glass-shine"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Preview from Catalog -->
    <section class="landing-section library-teaser">
      <div class="container">
        <div class="section-header-row">
          <div>
            <span class="section-subtitle">شاهد عبر الموقع أو التطبيق</span>
            <h2 class="section-main-title">مسلسلات حصرية وبث حي مستمر</h2>
          </div>
          <a href="/lives/" class="btn btn-primary-outline">عرض كل المسلسلات</a>
        </div>
        <div class="scroll-row no-scrollbar">
          ${popular.map((c) => `
            <a class="card-landscape" href="${url.cartoon(c.slug)}">
              <div class="card-thumb">
                <img src="${attr(c.logo)}" alt="${attr(c.name)}" width="280" height="158" loading="lazy" decoding="async" onerror="${ph(280, 158)}">
                <div class="card-overlay"><div class="card-play">${icon('play_arrow', { size: 20, filled: true })}</div></div>
              </div>
              <h3 class="card-title">${esc(c.name)}</h3>
              <div class="card-meta"><span>${num(c.total_episodes)} حلقة</span><span class="dot"></span><span>${esc(c.genres.map((g) => g.ar).join(' • '))}</span></div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
${nativeSlot('landingMid')}
    <!-- Installation Steps -->
    <section class="landing-section steps-section">
      <div class="container">
        <div class="section-center-header">
          <span class="section-subtitle">دليل التثبيت السهل</span>
          <h2 class="section-main-title">كيفية تثبيت ملف APK على هاتفك الأندرويد؟</h2>
        </div>
        
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-num">01</div>
            <h3>تحميل ملف APK</h3>
            <p>انقر على زر "تنزيل التطبيق" لحفظ ملف <code style="color:var(--primary)">ostora_online_v1.1.apk</code> على جهازك بأمان تامة وبشكل مباشر من موقعنا.</p>
          </div>
          <div class="step-card">
            <div class="step-num">02</div>
            <h3>السماح بالتثبيت</h3>
            <p>إذا ظهر لك تحذير الأمان، انتقل إلى إعدادات هاتفك ثم الأمان وفعل خيار <strong>"السماح بتثبيت التطبيقات من مصادر غير معروفة"</strong>.</p>
          </div>
          <div class="step-card">
            <div class="step-num">03</div>
            <h3>ثبت واستمتع!</h3>
            <p>افتح ملف APK الذي قمت بتحميله، وانقر على تثبيت. افتح التطبيق واستمتع بأكبر تشكيلة كرتون وبث مباشر وبدون إعلانات!</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Premium Call to Action -->
    <section class="landing-cta">
      <div class="landing-cta-container">
        <div class="landing-cta-bg"></div>
        <h2 class="cta-title">هل أنت جاهز لتجربة مشاهدة متميزة؟</h2>
        <p class="cta-desc">حمل تطبيق الأسطورة أونلاين الآن، وشاهد كارتوني والبث المباشر على هاتفك وتابلتك وتلفزيونك بملف واحد.</p>
        <div class="cta-actions">
          <a href="/ostora_online_v1.1.apk?v=1.1" class="btn btn-premium-download" download="ostora_online_v1.1.apk">
            <div class="btn-download-icon">
              ${icon('download', { size: 24, filled: true })}
            </div>
            <div class="btn-download-text">
              <span class="small-label">تحميل مباشر APK</span>
              <span class="large-label">تنزيل التطبيق الآن</span>
            </div>
          </a>
          <a href="/lives/" class="btn btn-glass-enter">
            <span>تصفح الموقع بدلاً من ذلك</span>
          </a>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="landing-section faq-section">
      <div class="container">
        <div class="section-center-header">
          <span class="section-subtitle">الأسئلة الشائعة</span>
          <h2 class="section-main-title">كل ما تريد معرفته عن التطبيق</h2>
        </div>
        
        <div class="faq-accordion">
          <details class="faq-item" open>
            <summary class="faq-question">هل التطبيق آمن للتحميل والتثبيت؟</summary>
            <div class="faq-answer">
              <p>نعم، التطبيق آمن بنسبة 100%. يتم فحص ملف APK الخاص بنا وتوقيعه بشكل آمن لضمان خلوه تماماً من أي برمجيات ضارة أو ملفات تجسس، وهو مجاني الاستخدام تماماً.</p>
            </div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">لماذا لا يتوفر التطبيق على متجر جوجل بلاي؟</summary>
            <div class="faq-answer">
              <p>بسبب سياسات متجر جوجل بلاي الصارمة بشأن حقوق الملكية الفكرية وتوفير البث المباشر ومحتوى الفيديو، نقوم بتوفير التطبيق بصيغة APK بشكل مباشر وموثوق لضمان حصولك على كافة المزايا دون قيود.</p>
            </div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">هل يمكنني تشغيل التطبيق على شاشات التلفزيون الذكية (Smart TV)؟</summary>
            <div class="faq-answer">
              <p>نعم! يمكنك تثبيت ملف APK على أي شاشة تلفزيون تعمل بنظام Android TV أو جهاز TV Box والاستمتاع بالمشاهدة على شاشتك الكبيرة بكل سهولة.</p>
            </div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">ما هي الأجهزة المتوافقة مع التطبيق؟</summary>
            <div class="faq-answer">
              <p>التطبيق متوافق مع الهواتف والأجهزة اللوحية وتلفزيونات أندرويد (إصدار Android 7.0 فما فوق) بملف واحد، وبحجم 5 ميغابايت فقط.</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  </div>
  ${footer(data.totals)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Ostora Online O²',
      'alternateName': 'الأسطورة أونلاين',
      'operatingSystem': 'Android 7.0+',
      'applicationCategory': 'MultimediaApplication',
      'softwareVersion': '1.1',
      'downloadUrl': 'https://kartoney.com/ostora_online_v1.1.apk',
      'installUrl': 'https://kartoney.com/live_streaming_apps/',
      'fileSize': '5 MB',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      }
    }
  ];

  return layout({
    title: 'تحميل تطبيق الأسطورة أونلاين APK - كرتون وبث مباشر للهاتف والتلفزيون | كارتوني',
    description: 'تحميل تطبيق الأسطورة أونلاين APK برابط مباشر. 8611 حلقة كرتون وأنمي مدبلج مدمجة داخل التطبيق، مع البث المباشر وآلاف القنوات — على الهاتف والتابلت وتلفزيون أندرويد.',
    path: '/',
    body,
    jsonLd,
  });
}

/* ════════════════════════════ CARTOON DETAIL ════════════════════════════ */
export function cartoonPage(c, data) {
  const first = c.allEpisodes[0];
  const related = seededPick(data.byGenre(c.genres[0]?.en || '').filter((x) => x.id !== c.id), 8, c.id) ;
  const relatedList = related.length >= 4 ? related : seededPick(data.cartoons.filter((x) => x.id !== c.id), 8, c.id);
  const statusText = c.status === 'completed' ? 'مكتمل' : 'مستمر';
  const desc = metaDesc(c);
  const about = longDesc(c);
  // Per-episode thumbnails are mostly duplicates of the series poster; on huge
  // series (One Piece = 936 eps) they add ~900 <img> nodes/requests. Keep them
  // for normal series, drop them for mega-lists → far lighter DOM, same links.
  const showThumbs = c.total_episodes <= 100;

  const body = `
${breadcrumbs([{ label: 'الرئيسية', href: '/' }, { label: 'المكتبة', href: url.library() }, { label: c.name }])}
  <article>
    <div class="detail-hero">
      <div class="detail-hero-bg"><img src="${attr(c.logo)}" alt="${attr(c.name)}" width="1280" height="720" fetchpriority="high" decoding="async" onerror="${ph(1280, 720)}"></div>
      <div class="detail-hero-gradient"></div>
      <div class="detail-hero-content">
        ${c.seasons.length > 1 ? `<span class="detail-season-badge">${num(c.seasons.length)} أجزاء</span>` : ''}
        <h1 class="detail-title">${esc(c.name)}</h1>
        <p class="detail-desc">${esc(c.description || '')}</p>
        <div class="detail-info">
          ${c.era ? `<span>${icon('calendar_today', { size: 18 })} ${esc(c.era)}</span>` : ''}
          <span>${icon('movie', { size: 18 })} ${num(c.total_episodes)} حلقة</span>
          <span>${icon('tv', { size: 18 })} ${num(c.total_seasons)} ${c.total_seasons > 1 ? 'أجزاء' : 'جزء'}</span>
          <span style="background:var(--surface-container-high);padding:.2rem .6rem;border-radius:var(--radius-full);font-size:.75rem">${c.status === 'completed' ? '✅' : '🔄'} ${statusText}</span>
        </div>
        <div class="hero-actions">
          ${first ? `<a class="btn btn-primary" href="${url.watch(c.slug, first.slug)}">${icon('play_arrow', { filled: true })} شاهد الآن</a>` : ''}
        </div>
        <div style="display:flex;gap:.5rem;margin-top:1rem;flex-wrap:wrap">
          ${c.genres.map((g) => `<a href="${url.genre(g.en)}" style="background:var(--surface-container-high);padding:.3rem .8rem;border-radius:var(--radius-full);font-size:.75rem;color:var(--primary)">${esc(g.ar)}</a>`).join('')}
        </div>
      </div>
    </div>

    <section style="padding:2rem 2rem 0;max-width:920px">
      <h2 class="section-title" style="margin-bottom:1rem"><span class="accent"></span>نبذة عن ${esc(c.name)}</h2>
      <p style="color:var(--on-surface-variant);line-height:1.9">${esc(about)}</p>
    </section>

    <!-- Cartoon Details App Banner -->
    <div class="cartoon-app-banner" style="margin:2rem">
      <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap">
        <span style="font-size:2.5rem;line-height:1">📱</span>
        <div>
          <h3 style="font-weight:800;font-size:1.15rem;margin-bottom:0.25rem">هل تريد مشاهدة كرتون "${esc(c.name)}" بدون أي إعلانات؟</h3>
          <p style="color:var(--on-surface-variant);font-size:0.875rem">حمل تطبيق الأسطورة أونلاين — كل حلقات كارتوني بداخله، ولا إعلان يظهر قبل بدء التشغيل.</p>
        </div>
      </div>
      <a href="/ostora_online_v1.1.apk?v=1.1" class="btn btn-banner-download" download="ostora_online_v1.1.apk" style="flex-shrink:0">
        ${icon('download', { size: 18 })}
        <span>تحميل APK سريع</span>
      </a>
    </div>

    <div class="episodes-section">
      <div class="section-header"><h2 class="section-title"><span class="accent gold"></span>قائمة الحلقات (${num(c.total_episodes)})</h2></div>
      ${c.seasons.length > 1 ? `<div class="season-tabs no-scrollbar" id="season-tabs">${c.seasons.map((s, i) => `<button class="season-tab${i === 0 ? ' active' : ''}" data-season="${s.id}">${esc(s.name)}</button>`).join('')}</div>
      <label class="season-select-wrap">
        <span class="sr-only">اختر الجزء</span>
        <select class="season-select" id="season-select" aria-label="اختر الجزء">${c.seasons.map((s, i) => `<option value="${s.id}"${i === 0 ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        ${icon('arrow_back', { size: 18, cls: 'season-select-caret' })}
      </label>` : ''}
      ${c.seasons
        .map(
          (s, i) => `<div class="episode-list season-list" data-season="${s.id}"${i > 0 ? ' style="display:none"' : ''}>
        ${s.episodes
          .map(
            (ep) => `<a class="episode-item" href="${url.watch(c.slug, ep.slug)}">
          <span class="episode-number">${num(ep.episode_number)}</span>${showThumbs ? `
          <div class="episode-thumb"><img src="${attr(ep.logo || c.logo)}" alt="${attr(ep.title)}" width="140" height="79" loading="lazy" decoding="async" onerror="${ph(140, 79)}"></div>` : ''}
          <div class="episode-info"><h3>${esc(ep.title)}</h3></div>
        </a>`
          )
          .join('')}
      </div>`
        )
        .join('')}
    </div>
${nativeSlot('cartoonMid')}
    <div style="padding:2rem">
      <div class="section-header"><h2 class="section-title"><span class="accent red"></span>مسلسلات مشابهة</h2></div>
      ${scrollRow(relatedList, 'landscape')}
    </div>
  </article>
${footer(data.totals)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      '@id': url.abs(url.cartoon(c.slug)) + '#series',
      name: c.name,
      description: about,
      url: url.abs(url.cartoon(c.slug)),
      image: url.absImg(c.logo), // schema.org images must be absolute URLs
      inLanguage: 'ar',
      genre: c.genres.map((g) => g.ar),
      numberOfEpisodes: c.total_episodes,
      numberOfSeasons: c.total_seasons,
      ...(toISO(c.created_at) ? { datePublished: toISO(c.created_at) } : {}),
      publisher: { '@type': 'Organization', name: SITE.nameAr, logo: { '@type': 'ImageObject', url: url.abs('/images/favicon-512x512.png') } },
    },
    breadcrumbLd([
      { name: 'الرئيسية', url: url.abs('/') },
      { name: 'المكتبة', url: url.abs(url.library()) },
      { name: c.name, url: url.abs(url.cartoon(c.slug)) },
    ]),
  ];

  return layout({
    title: `${dubbed(c.name)} - جميع الحلقات | كارتوني`,
    description: desc,
    path: url.cartoon(c.slug),
    body,
    jsonLd,
    ogImage: c.logo,
    ogType: 'video.tv_show',
    preloadImage: c.logo,
  });
}

/* ════════════════════════════ WATCH / EPISODE ════════════════════════════ */
export function episodePage(ep, c, data) {
  const idx = c.allEpisodes.findIndex((e) => e.id === ep.id);
  const prev = idx > 0 ? c.allEpisodes[idx - 1] : null;
  const next = idx < c.allEpisodes.length - 1 ? c.allEpisodes[idx + 1] : null;
  const desc = episodeMetaDesc(ep, c);
  const about = episodeLongDesc(ep, c, prev, next);
  const faqs = episodeFaq(ep, c, prev, next);
  // Window the sidebar so long series (One Piece = 936 eps) don't bloat every page.
  // The full list lives on the cartoon page; prev/next keep the crawl chain intact.
  const WIN = 12;
  const sideStart = Math.max(0, idx - WIN);
  const sidebarEps = c.allEpisodes.slice(sideStart, idx + WIN + 1);

  const body = `
${breadcrumbs([{ label: 'الرئيسية', href: '/' }, { label: c.name, href: url.cartoon(c.slug) }, { label: ep.title }])}
  <article class="player-page">
    <div class="player-main">
      <div class="video-container" id="video-container"${(() => {
        const pr = ADS.playerAds && ADS.playerAds.preroll;
        const pa = ADS.playerAds && ADS.playerAds.pauseAd;
        const ds = [];
        if (pr && pr.enabled && pr.adKey) ds.push(` data-preroll-key="${attr(pr.adKey)}" data-preroll-src="${attr(pr.invokeSrc)}" data-preroll-seconds="${pr.seconds}" data-preroll-once="${!!pr.oncePerSession}"`);
        if (pa && pa.enabled && pa.adKey) ds.push(` data-pause-key="${attr(pa.adKey)}" data-pause-src="${attr(pa.invokeSrc)}" data-pause-cooldown="${pa.cooldownMinutes}"`);
        return ds.join('');
      })()}>
        <video id="video-player" controls preload="none" playsinline webkit-playsinline x5-playsinline disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback" oncontextmenu="return false" poster="${attr(ep.logo || c.logo)}" data-title="${attr(ep.title)}" data-series="${attr(c.name)}">
          <source src="${attr(ep.url)}" type="video/mp4">
          المتصفح لا يدعم تشغيل الفيديو.
        </video>
      </div>
      <!-- Mobile: one-tap playlist access while watching -->
      <div class="watch-toolbar">
        <button type="button" class="wt-btn wt-playlist" id="open-playlist" aria-label="فتح قائمة الحلقات">
          ${icon('playlist_play', { size: 22 })}
          <span>قائمة الحلقات</span>
        </button>
        <span class="wt-count">${num(idx + 1)} / ${num(c.allEpisodes.length)}</span>
        ${next ? `<a class="wt-btn wt-next" href="${url.watch(c.slug, next.slug)}"><span>التالية</span>${icon('arrow_back', { size: 20 })}</a>` : ''}
      </div>
      <h1 class="video-title">${esc(ep.title)}</h1>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:var(--surface-container);border-radius:var(--radius)">
        <img src="${attr(c.logo)}" alt="${attr(c.name)}" width="48" height="48" loading="lazy" style="width:48px;height:48px;border-radius:var(--radius-sm);object-fit:cover" onerror="this.style.display='none'">
        <div style="flex:1">
          <a href="${url.cartoon(c.slug)}" style="font-weight:700;color:var(--primary);font-size:.95rem">${esc(c.name)}</a>
          <p style="color:var(--on-surface-variant);font-size:.8rem">${num(c.total_episodes)} حلقة • ${esc(c.genres.map((g) => g.ar).join(' • '))}</p>
        </div>
      </div>
      <div class="video-nav">
        ${prev ? `<a href="${url.watch(c.slug, prev.slug)}">${icon('arrow_forward')}<div><div class="label">السابق</div><div>${esc(clip(prev.title, 40))}</div></div></a>` : '<div></div>'}
        ${next ? `<a id="next-ep-link" href="${url.watch(c.slug, next.slug)}" style="text-align:left"><div><div class="label">التالي</div><div>${esc(clip(next.title, 40))}</div></div>${icon('arrow_back')}</a>` : '<div></div>'}
      </div>
${nativeSlot('watchPlayer')}
      <!-- Episode Page App Banner -->
      <div class="watch-app-banner">
        <div class="wab-glow"></div>
        <div class="wab-content">
          <div class="wab-info">
            <span class="wab-tag">⚡ تطبيق الأندرويد الحصري</span>
            <h4 style="font-weight:800;font-size:1.05rem;margin-bottom:0.25rem">هل تعاني من تقطيع الفيديو أو كثرة الإعلانات؟</h4>
            <p style="color:var(--on-surface-variant);font-size:0.85rem">حمل تطبيق الأسطورة أونلاين — مكتبة كارتوني كاملة، بث مباشر، ونافذة عائمة على هاتفك وتلفزيونك.</p>
          </div>
          <a href="/ostora_online_v1.1.apk?v=1.1" class="btn btn-premium-download-small" download="ostora_online_v1.1.apk" style="flex-shrink:0">
            ${icon('download', { size: 16 })}
            <span>تحميل التطبيق (APK)</span>
          </a>
        </div>
      </div>

${nativeSlot('watchSidebar')}
      <section class="episode-about" style="margin-top:1.5rem">
        <h2 class="section-title" style="margin-bottom:.75rem"><span class="accent"></span>عن الحلقة</h2>
        <p style="color:var(--on-surface-variant);line-height:1.9">${esc(about)}</p>
      </section>
      <section class="episode-faq" style="margin-top:1.75rem">
        <h2 class="section-title" style="margin-bottom:.9rem"><span class="accent gold"></span>أسئلة شائعة</h2>
        ${faqs
          .map(
            (faq) => `<details style="background:var(--surface-container);border-radius:var(--radius);padding:.85rem 1rem;margin-bottom:.6rem">
          <summary style="cursor:pointer;font-weight:700;color:var(--on-surface)">${esc(faq.q)}</summary>
          <p style="color:var(--on-surface-variant);line-height:1.8;margin:.6rem 0 0">${esc(faq.a)}</p>
        </details>`
          )
          .join('')}
      </section>
    </div>
    <!-- Doubles as the desktop sidebar AND the mobile bottom-sheet playlist
         (same markup, two presentations via CSS — zero duplication). -->
    <aside class="player-sidebar" id="playlist-panel" aria-label="قائمة الحلقات">
      <div class="playlist-head">
        <h2 style="font-size:1rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem">
          <span style="display:flex;align-items:center;gap:.5rem">${icon('playlist_play', { size: 20, cls: 'text-primary' })} قائمة الحلقات</span>
          <a href="${url.cartoon(c.slug)}" class="section-link">كل الحلقات (${num(c.total_episodes)})</a>
        </h2>
        <button type="button" class="sheet-close" id="close-playlist" aria-label="إغلاق القائمة">${icon('close', { size: 22 })}</button>
      </div>
${bannerMount('watchSidebarBox')}
      <div class="sidebar-ep-list no-scrollbar">
        ${sidebarEps
          .map(
            (e) => `<a href="${url.watch(c.slug, e.slug)}" class="sidebar-ep${e.id === ep.id ? ' active' : ''}">
          <div class="sidebar-ep-thumb"><img src="${attr(e.logo || c.logo)}" alt="${attr(e.title)}" width="100" height="56" loading="lazy" decoding="async" onerror="${ph(100, 56)}"></div>
          <div class="sidebar-ep-info"><h3 style="font-size:.8rem;font-weight:600">${esc(e.title)}</h3><small>${esc(e.seasonName || '')}</small></div>
        </a>`
          )
          .join('')}
      </div>
    </aside>
    <div class="sheet-backdrop" id="playlist-backdrop" hidden></div>
  </article>
${footer(data.totals)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: ep.title,
      description: desc,
      thumbnailUrl: [url.absImg(ep.logo || c.logo)],
      uploadDate: toISO(c.created_at) || '2024-01-01',
      contentUrl: ep.url,
      inLanguage: 'ar',
      isFamilyFriendly: true,
      publisher: { '@type': 'Organization', name: SITE.nameAr, logo: { '@type': 'ImageObject', url: url.abs('/images/favicon-512x512.png') } },
      isPartOf: { '@type': 'TVSeries', name: c.name, url: url.abs(url.cartoon(c.slug)) },
    },
    breadcrumbLd([
      { name: 'الرئيسية', url: url.abs('/') },
      { name: c.name, url: url.abs(url.cartoon(c.slug)) },
      { name: ep.title, url: url.abs(url.watch(c.slug, ep.slug)) },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
  ];

  return layout({
    title: `${ep.title} - ${dubbed(c.name)} | كارتوني`,
    description: desc,
    path: url.watch(c.slug, ep.slug),
    body,
    jsonLd,
    ogImage: ep.logo || c.logo,
    ogType: 'video.episode',
    scripts: `  <script src="${av('/js/player.js')}" defer></script>`,
  });
}

/* ════════════════════════════ BROWSE / LISTING ════════════════════════════ */
export function browsePage({ title, h1, description, path, cartoons, data, chips = null, intro = '', parent = null }) {
  // Optional intermediate crumb (e.g. genre pages nest under "التصنيفات").
  const crumbs = parent
    ? [{ label: 'الرئيسية', href: '/' }, parent, { label: h1 }]
    : [{ label: 'الرئيسية', href: '/' }, { label: h1 }];
  const body = `
${breadcrumbs(crumbs)}
  <section style="padding:1.5rem 2rem 6rem">
    <h1 style="font-size:2rem;font-weight:900;margin-bottom:.5rem">${esc(h1)}</h1>
    <p class="text-muted" style="margin-bottom:1.5rem">${esc(intro || `${num(cartoons.length)} مسلسل`)}</p>
    ${chips || ''}
    <div class="cartoons-grid">${cartoons.map((c) => portraitCard(c)).join('')}</div>
  </section>
${footer(data.totals)}`;

  const ldCrumbs = parent
    ? [{ name: 'الرئيسية', url: url.abs('/') }, { name: parent.label, url: url.abs(parent.href) }, { name: h1, url: url.abs(path) }]
    : [{ name: 'الرئيسية', url: url.abs('/') }, { name: h1, url: url.abs(path) }];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: h1,
      description,
      url: url.abs(path),
      inLanguage: 'ar',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: cartoons.length,
        itemListElement: cartoons.slice(0, 100).map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: url.abs(url.cartoon(c.slug)),
          name: c.name,
          image: url.absImg(c.logo),
        })),
      },
    },
    breadcrumbLd(ldCrumbs),
  ];

  return layout({ title, description, path, body, jsonLd });
}

export function genreChips(data, activeEn = null) {
  return `<div class="genre-row no-scrollbar" style="margin-bottom:2rem">
    <a class="genre-chip${!activeEn ? ' active' : ''}" href="${url.library()}">🎬 الكل</a>
    ${data.genres.map((g) => `<a class="genre-chip${g.en === activeEn ? ' active' : ''}" href="${url.genre(g.en)}">${g.icon || '🎬'} ${esc(g.name_ar)}</a>`).join('')}
  </div>`;
}

/* ════════════════════════════ helpers ════════════════════════════ */
function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
