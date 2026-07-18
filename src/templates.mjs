/**
 * HTML templates for every page type. Pure functions returning HTML strings.
 * Reuses the existing design-system class names from css/style.css.
 */
import { esc, attr, num, clip, seededPick, toISO } from './util.mjs';
import { icon } from './icons.mjs';
import { SITE, ADS, url, ERAS, TYPES } from './config.mjs';
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
  <script defer src="/_vercel/insights/script.js"></script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
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
        <li><a href="/" data-page="landing">الرئيسية</a></li>
        <li><a href="/lives/" data-page="home">مسلسلات وبث مباشر</a></li>
        <li><a href="${url.genresIndex()}" data-page="genre">التصنيفات</a></li>
        <li><a href="${url.category('classic')}" data-page="classic">كلاسيكي</a></li>
        <li><a href="${url.category('anime')}" data-page="anime">أنمي</a></li>
        <li><a href="${url.library()}" data-page="library">المكتبة</a></li>
      </ul>
    </div>
    <div class="nav-actions" style="display:flex;align-items:center;gap:1.5rem">
      <a href="/yalashot_v01.apk" class="nav-download-badge" download="yalashot.apk">
        <span class="pulse-ring"></span>
        ${icon('download', { size: 16 })}
        <span>تحميل التطبيق الأندرويد 📱</span>
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
      <a href="/yalashot_v01.apk" class="sidebar-link" download="yalashot.apk" style="color:var(--primary);font-weight:700">${icon('download')}<span>تحميل التطبيق 📱</span></a>
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
    <a href="/yalashot_v01.apk" class="bottom-nav-item" download="yalashot.apk" style="color:var(--primary)">${icon('download')}<span>التطبيق</span></a>
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
    <!-- Premium App Promo Banner -->
    <div class="app-promo-banner">
      <div class="banner-glow"></div>
      <div class="banner-content">
        <div class="banner-text">
          <span class="banner-badge">🔥 تطبيق الأندرويد الحصري</span>
          <h2>حمل تطبيق يلا شوت وكارتوني بدون إعلانات!</h2>
          <p>استمتع بتجربة مشاهدة فائقة السرعة، بث مباشر للمباريات والمسلسلات، وبدون أي إعلانات منبثقة مزعجة على الإطلاق. تحميل مباشر وآمن.</p>
        </div>
        <div class="banner-actions">
          <a href="/yalashot_v01.apk" class="btn btn-banner-download" download="yalashot.apk">
            ${icon('download', { size: 18 })}
            <span>تحميل التطبيق مجاناً (APK)</span>
          </a>
          <a href="/" class="btn btn-banner-more">تفاصيل المزايا</a>
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
            <span>تطبيق كارتوني ويلا شوت الجديد مجاناً 📱</span>
          </div>
          <h1 class="landing-main-title">
            شاهد كرتونك المفضل<br>
            <span class="gradient-text">والبث المباشر بدون تقطيع!</span>
          </h1>
          <p class="landing-subtitle">
            هل سئمت من الإعلانات المزعجة وبطء البث؟ حمل تطبيق الأندرويد الحصري الآن لتجربة مشاهدة ممتعة وممتازة بجودة FHD ومزايا لا حصر لها، بالإضافة للبث المباشر لأكبر مباريات كرة القدم والمسلسلات.
          </p>
          
          <div class="landing-actions">
            <a href="/yalashot_v01.apk" class="btn btn-premium-download" download="yalashot.apk">
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
              <span class="stat-number">10M+</span>
              <span class="stat-lbl">مشاهدة</span>
            </div>
            <div class="app-stat-item">
              <span class="stat-number">4.9★</span>
              <span class="stat-lbl">تقييم المستخدمين</span>
            </div>
            <div class="app-stat-item">
              <span class="stat-number">0%</span>
              <span class="stat-lbl">إعلانات منبثقة</span>
            </div>
          </div>
        </div>

        <!-- Phone Mockup Container -->
        <div class="landing-hero-mockup">
          <div class="phone-mockup">
            <div class="phone-speaker"></div>
            <div class="phone-camera"></div>
            <div class="phone-screen">
              <div class="phone-status-bar">
                <span>10:29 AM</span>
                <div style="display:flex;gap:4px;align-items:center">
                  <span>5G</span>
                  <span style="display:inline-block;width:12px;height:12px;background:var(--primary);border-radius:2px"></span>
                </div>
              </div>
              <!-- Simulated App UI inside Phone Mockup -->
              <div class="mock-app-ui">
                <div class="mock-app-header">
                  <span class="logo">كارتوني 🔥</span>
                  <div class="app-badge-live">بث مباشر</div>
                </div>
                <div class="mock-app-hero">
                  <div class="mock-hero-badge">مباراة اليوم</div>
                  <div class="mock-match">
                    <span class="team">ريال مدريد</span>
                    <span class="score">vs</span>
                    <span class="team">برشلونة</span>
                  </div>
                  <div class="mock-play-btn">${icon('play_arrow', { size: 16, filled: true })}</div>
                </div>
                <div class="mock-section-title">مسلسلات حصرية بالتطبيق</div>
                <div class="mock-grid">
                  <div class="mock-card">
                    <div class="mock-card-img" style="background:linear-gradient(45deg, #121212, #2a2a2a)"></div>
                    <div class="mock-card-title">ون بيس</div>
                  </div>
                  <div class="mock-card">
                    <div class="mock-card-img" style="background:linear-gradient(45deg, #111, #333)"></div>
                    <div class="mock-card-title">كونان</div>
                  </div>
                  <div class="mock-card">
                    <div class="mock-card-img" style="background:linear-gradient(45deg, #1e1205, #ff980033)"></div>
                    <div class="mock-card-title">ناروتو</div>
                  </div>
                </div>
              </div>
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
          <span class="section-subtitle">لماذا تحتاج إلى تطبيق كارتوني يلا شوت؟</span>
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
            <p>انقر على زر "تنزيل التطبيق" لحفظ ملف <code style="color:var(--primary)">yalashot.apk</code> على جهازك بأمان تامة وبشكل مباشر من موقعنا.</p>
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
        <p class="cta-desc">حمل تطبيق كارتوني يلا شوت للأندرويد الآن، وافتح فصلاً جديداً من البث المباشر فائق السرعة والمشاهدة الآمنة بدون إعلانات.</p>
        <div class="cta-actions">
          <a href="/yalashot_v01.apk" class="btn btn-premium-download" download="yalashot.apk">
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
              <p>التطبيق متوافق مع كافة الهواتف والأجهزة اللوحية التي تعمل بنظام الأندرويد (إصدار Android 5.0 فما فوق)، وبحجم صغير جداً لا يستهلك من مساحة تخزين هاتفك.</p>
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
      'name': 'Kartoney Yala Shot App',
      'operatingSystem': 'ANDROID',
      'applicationCategory': 'EntertainmentApplication',
      'downloadUrl': SITE.url + '/yalashot_v01.apk',
      'fileSize': '4.5MB',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'ratingValue': '4.9',
      'ratingCount': '2450'
    }
  ];

  return layout({
    title: 'تحميل تطبيق يلا شوت وكارتوني للأندرويد APK - بث مباشر ومسلسلات مجاناً | كارتوني',
    description: 'تحميل تطبيق كارتوني يلا شوت للأندرويد APK برابط مباشر. شاهد آلاف حلقات الكرتون والأنمي المدبلج والبث المباشر لأهم مباريات كرة القدم بجودة عالية وبدون إعلانات.',
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
          <p style="color:var(--on-surface-variant);font-size:0.875rem">حمل تطبيق الأندرويد الرسمي الآن واستمتع بمشاهدة جميع حلقاتك المفضلة بجودة فائقة FHD وبدون أي نوافذ منبثقة مزعجة!</p>
        </div>
      </div>
      <a href="/yalashot_v01.apk" class="btn btn-banner-download" download="yalashot.apk" style="flex-shrink:0">
        ${icon('download', { size: 18 })}
        <span>تحميل APK سريع</span>
      </a>
    </div>

    <div class="episodes-section">
      <div class="section-header"><h2 class="section-title"><span class="accent gold"></span>قائمة الحلقات (${num(c.total_episodes)})</h2></div>
      ${c.seasons.length > 1 ? `<div class="season-tabs no-scrollbar" id="season-tabs">${c.seasons.map((s, i) => `<button class="season-tab${i === 0 ? ' active' : ''}" data-season="${s.id}">${esc(s.name)}</button>`).join('')}</div>` : ''}
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

      <!-- Episode Page App Banner -->
      <div class="watch-app-banner">
        <div class="wab-glow"></div>
        <div class="wab-content">
          <div class="wab-info">
            <span class="wab-tag">⚡ تطبيق الأندرويد الحصري</span>
            <h4 style="font-weight:800;font-size:1.05rem;margin-bottom:0.25rem">هل تعاني من تقطيع الفيديو أو كثرة الإعلانات؟</h4>
            <p style="color:var(--on-surface-variant);font-size:0.85rem">حمل تطبيق يلا شوت وكارتوني الآن لمشاهدة بدون إعلانات وبسرعة فائقة FHD بالإضافة للبث المباشر للمباريات!</p>
          </div>
          <a href="/yalashot_v01.apk" class="btn btn-premium-download-small" download="yalashot.apk" style="flex-shrink:0">
            ${icon('download', { size: 16 })}
            <span>تحميل التطبيق (APK)</span>
          </a>
        </div>
      </div>

${adSlot()}
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
      thumbnailUrl: [url.absImg(ep.logo || c.logo)],
      uploadDate: toISO(c.created_at) || '2024-01-01',
      contentUrl: ep.url,
      embedUrl: url.abs(url.watch(c.slug, ep.slug)),
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
