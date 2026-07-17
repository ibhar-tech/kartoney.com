/**
 * Site-wide configuration. Edit this one file to change branding, URLs, or ads.
 */

export const SITE = {
  url: 'https://kartoney.com',          // canonical origin, no trailing slash
  nameAr: 'كارتوني',
  nameEn: 'Kartoney',
  titleAr: 'كارتوني - أكبر مكتبة كرتون وأنمي عربي مجاني',
  descAr: 'كارتوني - أكبر مكتبة كرتون عربي. شاهد آلاف الحلقات من أفضل مسلسلات الكرتون والأنمي المدبلجة بالعربية مجاناً.',
  locale: 'ar',
  themeColor: '#0e0e0e',
  ogImage: '/images/og-image.jpg',
};

/**
 * Adsterra ad units (BALANCED setup).
 *
 *  HOW TO ACTIVATE EACH UNIT
 *  -------------------------
 *  1. Adsterra dashboard → Websites → kartoney.com → "+ AD UNIT".
 *  2. Create the unit type, then "GET CODE".
 *  3. Paste the value(s) below and set enabled: true. Rebuild + deploy.
 *
 *  Nothing here is required for the site to work — every unit is opt-in.
 */
export const ADS = {
  // 1) POPUNDER — already live on your site (kept, but only fires once per session
  //    and only after the user interacts, so it doesn't tank Core Web Vitals).
  popunder: {
    enabled: true,
    scriptSrc: 'https://fortunateambiguous.com/7b/74/46/7b7446d8112cc38fb184092a760b792f.js',
  },

  // 2) SOCIAL BAR — Adsterra's highest-earning, least-intrusive format.
  //    Create a "Social Bar" unit, GET CODE, copy the script src URL here.
  socialBar: {
    enabled: true,
    scriptSrc: 'https://fortunateambiguous.com/15/cd/23/15cd2395d767864c96c9820d721fd326.js',
  },

  // 3) NATIVE / BANNER — one in-content block (we render its container only on
  //    cartoon + watch pages, mid-content, so it never blocks first paint).
  //    Create a "Native Banner" unit, GET CODE. Adsterra gives you a container
  //    <div id="container-XXXX"></div> + an invoke script src. Put both here.
  nativeBanner: {
    enabled: false,
    containerId: '', // e.g. 'container-abcdef123456'
    scriptSrc: '',   // e.g. 'https://pl12345.profitablecpmrate.com/abcdef123456/invoke.js'
  },
};

// ── URL builders (single source of truth for the whole site) ──────────
export const url = {
  home: () => '/',
  lives: () => '/lives/',
  cartoon: (slug) => `/cartoon/${slug}/`,
  watch: (slug, epSlug) => `/watch/${slug}/${epSlug}/`,
  genre: (en) => `/genre/${en}/`,
  genresIndex: () => '/genre/',
  category: (type) => `/category/${type}/`,
  era: (e) => `/era/${e}/`,
  library: () => '/library/',
  abs: (path) => SITE.url + path,
  // Absolute URL for an image path: same-origin posters get the origin prefix,
  // remote URLs (rare fallbacks) are returned unchanged. For JSON-LD / sitemaps.
  absImg: (p) => (p && p.startsWith('/') ? SITE.url + p : p || ''),
};

export const ERAS = [
  { key: '80s', label: 'كرتون الثمانينات', emoji: '📺' },
  { key: '90s', label: 'كرتون التسعينات', emoji: '🎮' },
  { key: '2000s', label: 'كرتون الألفية', emoji: '💿' },
  { key: '2010s', label: 'أنمي حديث', emoji: '🔥' },
];

export const TYPES = [
  { key: 'anime', label: 'أنمي', emoji: '🎌' },
  { key: 'classic', label: 'كرتون كلاسيكي', emoji: '📺' },
  { key: 'modern', label: 'كرتون حديث', emoji: '✨' },
];
