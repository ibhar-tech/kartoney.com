/**
 * HTML templates for every page type. Pure functions returning HTML strings.
 * Reuses the existing design-system class names from css/style.css.
 */
import { esc, attr, num, clip, seededPick } from './util.mjs';
import { icon } from './icons.mjs';
import { SITE, ADS, url, ERAS, TYPES } from './config.mjs';
import { longDesc, metaDesc } from './describe.mjs';

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

/* ════════════════════════════ LAYOUT ════════════════════════════ */
export function layout({ title, description, path, body, jsonLd = [], ogImage = null, ogType = 'website', preloadImage = null, extraHead = '' }) {
  const canonical = url.abs(path);
  const img = url.abs(ogImage || SITE.ogImage);
  return `<!DOCTYPE html>
<html class="dark" dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
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
${preloadImage ? `  <link rel="preload" as="image" href="${attr(preloadImage)}" fetchpriority="high">\n` : ''}  <link rel="stylesheet" href="/css/style.css">
${jsonLd.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${extraHead}
</head>
<body>
${topNav()}
${sidebar()}
${searchOverlay()}
  <main class="main-content">
${body}
  </main>
${bottomNav()}
  <script src="/js/main.js" defer></script>
  <script src="/js/widgets.js" defer></script>
</body>
</html>`;
}

/* ════════════════════════════ CHROME ════════════════════════════ */
function topNav() {
  return `  <nav class="top-nav" id="top-nav">
    <div style="display:flex;align-items:center;gap:2rem">
      <a href="/" class="nav-logo">${esc(SITE.nameAr)}</a>
      <ul class="nav-links">
        <li><a href="/" data-page="home">الرئيسية</a></li>
        <li><a href="${url.genresIndex()}" data-page="genre">التصنيفات</a></li>
        <li><a href="${url.category('classic')}" data-page="classic">كلاسيكي</a></li>
        <li><a href="${url.category('anime')}" data-page="anime">أنمي</a></li>
        <li><a href="${url.library()}" data-page="library">المكتبة</a></li>
      </ul>
    </div>
    <div class="nav-actions">
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
      <a href="/" class="sidebar-link">${icon('home', { filled: true })}<span>الرئيسية</span></a>
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
    <a href="/" class="bottom-nav-item" data-page="home">${icon('home', { filled: true })}<span>الرئيسية</span></a>
    <button onclick="openSearch()" class="bottom-nav-item" data-page="search" aria-label="بحث">${icon('search')}<span>بحث</span></button>
    <a href="${url.genresIndex()}" class="bottom-nav-item" data-page="genre">${icon('category')}<span>التصنيفات</span></a>
    <a href="${url.library()}" class="bottom-nav-item" data-page="library">${icon('video_library')}<span>المكتبة</span></a>
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

function adSlot() {
  if (!ADS.nativeBanner.enabled || !ADS.nativeBanner.containerId) return '';
  return `\n    <div class="ad-slot" style="margin:2rem auto;max-width:900px;text-align:center"><div id="${attr(ADS.nativeBanner.containerId)}"></div></div>`;
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
  ];

  return layout({
    title: SITE.titleAr + ' | Kartoney.com',
    description: SITE.descAr,
    path: '/',
    body,
    jsonLd,
    preloadImage: hero.logo,
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

    <div class="episodes-section">
      <div class="section-header"><h2 class="section-title"><span class="accent gold"></span>قائمة الحلقات (${num(c.total_episodes)})</h2></div>
      ${c.seasons.length > 1 ? `<div class="season-tabs no-scrollbar" id="season-tabs">${c.seasons.map((s, i) => `<button class="season-tab${i === 0 ? ' active' : ''}" data-season="${s.id}">${esc(s.name)}</button>`).join('')}</div>` : ''}
      ${c.seasons
        .map(
          (s, i) => `<div class="episode-list season-list" data-season="${s.id}"${i > 0 ? ' style="display:none"' : ''}>
        ${s.episodes
          .map(
            (ep) => `<a class="episode-item" href="${url.watch(c.slug, ep.slug)}">
          <span class="episode-number">${num(ep.episode_number)}</span>
          <div class="episode-thumb"><img src="${attr(ep.logo || c.logo)}" alt="${attr(ep.title)}" width="140" height="79" loading="lazy" decoding="async" onerror="${ph(140, 79)}"></div>
          <div class="episode-info"><h3 style="font-weight:700;font-size:.95rem">${esc(ep.title)}</h3></div>
        </a>`
          )
          .join('')}
      </div>`
        )
        .join('')}
    </div>
${adSlot()}
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
      name: c.name,
      description: about,
      url: url.abs(url.cartoon(c.slug)),
      image: c.logo,
      inLanguage: 'ar',
      genre: c.genres.map((g) => g.ar),
      numberOfEpisodes: c.total_episodes,
      numberOfSeasons: c.total_seasons,
    },
    breadcrumbLd([
      { name: 'الرئيسية', url: url.abs('/') },
      { name: 'المكتبة', url: url.abs(url.library()) },
      { name: c.name, url: url.abs(url.cartoon(c.slug)) },
    ]),
  ];

  return layout({
    title: `${c.name} مدبلج عربي - جميع الحلقات | كارتوني`,
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
  const desc = clip(`شاهد ${ep.title} من مسلسل ${c.name} مدبلجة بالعربية أونلاين بجودة عالية ومجاناً على كارتوني.`, 160);
  // Window the sidebar so long series (One Piece = 936 eps) don't bloat every page.
  // The full list lives on the cartoon page; prev/next keep the crawl chain intact.
  const WIN = 12;
  const sideStart = Math.max(0, idx - WIN);
  const sidebarEps = c.allEpisodes.slice(sideStart, idx + WIN + 1);

  const body = `
${breadcrumbs([{ label: 'الرئيسية', href: '/' }, { label: c.name, href: url.cartoon(c.slug) }, { label: ep.title }])}
  <article class="player-page">
    <div class="player-main">
      <div class="video-container" id="video-container">
        <video id="video-player" controls preload="none" playsinline poster="${attr(ep.logo || c.logo)}">
          <source src="${attr(ep.url)}" type="video/mp4">
          المتصفح لا يدعم تشغيل الفيديو.
        </video>
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
        ${next ? `<a href="${url.watch(c.slug, next.slug)}" style="text-align:left"><div><div class="label">التالي</div><div>${esc(clip(next.title, 40))}</div></div>${icon('arrow_back')}</a>` : '<div></div>'}
      </div>
${adSlot()}
    </div>
    <aside class="player-sidebar">
      <h2 style="font-size:1rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem">
        <span style="display:flex;align-items:center;gap:.5rem">${icon('playlist_play', { size: 20, cls: 'text-primary' })} قائمة الحلقات</span>
        <a href="${url.cartoon(c.slug)}" class="section-link">كل الحلقات (${num(c.total_episodes)})</a>
      </h2>
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
  </article>
${footer(data.totals)}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: ep.title,
      description: desc,
      thumbnailUrl: [ep.logo || c.logo],
      uploadDate: '2024-01-01',
      contentUrl: ep.url,
      embedUrl: url.abs(url.watch(c.slug, ep.slug)),
      inLanguage: 'ar',
      isPartOf: { '@type': 'TVSeries', name: c.name, url: url.abs(url.cartoon(c.slug)) },
    },
    breadcrumbLd([
      { name: 'الرئيسية', url: url.abs('/') },
      { name: c.name, url: url.abs(url.cartoon(c.slug)) },
      { name: ep.title, url: url.abs(url.watch(c.slug, ep.slug)) },
    ]),
  ];

  return layout({
    title: `${ep.title} - ${c.name} مدبلج عربي | كارتوني`,
    description: desc,
    path: url.watch(c.slug, ep.slug),
    body,
    jsonLd,
    ogImage: ep.logo || c.logo,
    ogType: 'video.episode',
  });
}

/* ════════════════════════════ BROWSE / LISTING ════════════════════════════ */
export function browsePage({ title, h1, description, path, cartoons, data, chips = null, intro = '' }) {
  const body = `
${breadcrumbs([{ label: 'الرئيسية', href: '/' }, { label: h1 }])}
  <section style="padding:1.5rem 2rem 6rem">
    <h1 style="font-size:2rem;font-weight:900;margin-bottom:.5rem">${esc(h1)}</h1>
    <p class="text-muted" style="margin-bottom:1.5rem">${esc(intro || `${num(cartoons.length)} مسلسل`)}</p>
    ${chips || ''}
    <div class="cartoons-grid">${cartoons.map((c) => portraitCard(c)).join('')}</div>
  </section>
${footer(data.totals)}`;

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
        itemListElement: cartoons.slice(0, 50).map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: url.abs(url.cartoon(c.slug)),
          name: c.name,
        })),
      },
    },
    breadcrumbLd([
      { name: 'الرئيسية', url: url.abs('/') },
      { name: h1, url: url.abs(path) },
    ]),
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
