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
 * Adsterra ad units.
 *
 *  HOW TO ACTIVATE EACH UNIT
 *  -------------------------
 *  1. Adsterra dashboard → Websites → kartoney.com → "+ AD UNIT".
 *  2. Create the unit type, then "GET CODE".
 *  3. Paste the value(s) below and set enabled: true. Rebuild + deploy.
 *
 *  Nothing here is required for the site to work — every unit is opt-in.
 *  RECOMMENDED SETUP (Adsterra's best earners, in order):
 *    1. Popunder        — live below (keep it).
 *    2. Social Bar      — live below (keep it).
 *    3. Native Banner ×5 — create ONE unit per slot below. Each Adsterra
 *                          native unit has its own container id + invoke src,
 *                          so different series get different containers.
 *                          Slots render server-side only when enabled, and the
 *                          script loads lazily when the slot nears the viewport
 *                          (good for Core Web Vitals + viewability).
 *    4. iframe Banner ×2 — "Banner" units (300x250 sidebar / 320x100 mobile).
 *                          Each renders inside its own isolated iframe.
 */
export const ADS = {
  // 1) POPUNDER — fires once per browser session and only after the user
  //    interacts, so it doesn't tank Core Web Vitals.
  popunder: {
    enabled: true,
    scriptSrc: 'https://fortunateambiguous.com/7b/74/46/7b7446d8112cc38fb184092a760b792f.js',
  },

  // 2) SOCIAL BAR — Adsterra's highest-earning, least-intrusive format.
  socialBar: {
    enabled: true,
    scriptSrc: 'https://fortunateambiguous.com/15/cd/23/15cd2395d767864c96c9820d721fd326.js',
  },

  // 3) NATIVE BANNER — Adsterra allows only ONE Native Banner unit per
  //    website, but the same unit may be embedded on unlimited PAGES (just
     //    not twice on the same page). So paste the SAME containerId+scriptSrc
  //    into every slot that lives on a DIFFERENT page type:
  //      watchPlayer  → watch (episode) pages
  //      cartoonMid   → cartoon/series pages
  //      homeMid      → /lives/ homepage
  //      landingMid   → / landing page
  //    watchPlayer and watchSidebar share the watch page, so enable only ONE
  //    of them with the native unit — give the other to a Banner unit.
  //    From GET CODE: <div id="container-XXXX"> value → containerId,
  //    invoke script src → scriptSrc. minHeight (px) reserves space vs CLS.
  nativeBanners: [
    // Live unit (container c08a1921… on fortunateambiguous.com). Same unit on
    // four different page types; layout/font are configured in the Adsterra
    // dashboard (Expert mode) and apply server-side.
    // Best viewability on the site: right under the video, above the fold.
    { id: 'watchPlayer', enabled: true, containerId: 'container-c08a1921776ab3a71a6a88838d227a3b', scriptSrc: 'https://fortunateambiguous.com/c08a1921776ab3a71a6a88838d227a3b/invoke.js', minHeight: 120 },
    // Watch page, mid-content — use ONLY if watchPlayer is left off.
    { id: 'watchSidebar', enabled: false, containerId: '', scriptSrc: '', minHeight: 0 },
    // Cartoon page: between the episode list and "similar series".
    { id: 'cartoonMid', enabled: true, containerId: 'container-c08a1921776ab3a71a6a88838d227a3b', scriptSrc: 'https://fortunateambiguous.com/c08a1921776ab3a71a6a88838d227a3b/invoke.js' },
    // /lives/ homepage: between the content rows.
    { id: 'homeMid', enabled: true, containerId: 'container-c08a1921776ab3a71a6a88838d227a3b', scriptSrc: 'https://fortunateambiguous.com/c08a1921776ab3a71a6a88838d227a3b/invoke.js' },
    // App landing page (/): between the catalog teaser and install steps.
    { id: 'landingMid', enabled: true, containerId: 'container-c08a1921776ab3a71a6a88838d227a3b', scriptSrc: 'https://fortunateambiguous.com/c08a1921776ab3a71a6a88838d227a3b/invoke.js' },
  ],

  // 4) BANNER UNITS — Adsterra "Banner" format (classic iframe). Available
  //    sizes there: 468x60, 160x300, 320x50, 300x250, 160x600, 728x90.
  //    From GET CODE: the atOptions 'key' → adKey, the invoke.js src →
  //    invokeSrc, plus the unit's width/height. One instance per page.
  banners: [
    // Live: 300x250 unit (key 522f21ca…) in the watch-page episode sidebar.
    { id: 'watchSidebarBox', enabled: true, adKey: '522f21cac4b8add62d4f48119bec242f', invokeSrc: 'https://fortunateambiguous.com/522f21cac4b8add62d4f48119bec242f/invoke.js', width: 300, height: 250 },
    // Live: 320x50 unit (key f6f8326a…) as the sticky mobile anchor.
    { id: 'mobileAnchor', enabled: true, adKey: 'f6f8326a3201e7ca1ffde64dece4dd63', invokeSrc: 'https://fortunateambiguous.com/f6f8326a3201e7ca1ffde64dece4dd63/invoke.js', width: 320, height: 50, stickyMobile: true },
  ],

  // 5) PLAYER-LIFECYCLE ADS (public/js/player.js) — wired to the video
  //    player's state machine, per the koralive production playbook:
  //    first play of a session → preroll countdown overlay with a banner;
  //    every user pause → 300x250 pause ad, hidden on resume.
  //    Both need their own Adsterra "Banner" unit (300x250) — create two more
  //    units in the dashboard and paste key + invoke.js here. An empty adKey
  //    disables that slot gracefully (player behaves exactly as before).
  playerAds: {
    // Shows ONCE per browser session (oncePerSession: false → every episode).
    // Flow: user presses play → 5s countdown with the ad → «تشغيل الحلقة»
    // button appears → tap resumes playback inside the tap gesture (always
    // allowed by mobile browsers, unlike an automatic resume after 5s).
    preroll: { enabled: true, adKey: '', invokeSrc: '', width: 300, height: 250, seconds: 5, oncePerSession: true },
    // Shows when the viewer pauses mid-video; hides on resume. The ✕ close
    // starts a cooldown (minutes) so pausing often never feels punishing.
    pauseAd: { enabled: true, adKey: '', invokeSrc: '', width: 300, height: 250, cooldownMinutes: 5 },
  },
};

/**
 * Ad-blocker detection. The guard is inlined into <head> of every page (inline
 * scripts can't be URL-blocked). Three signals, two response tiers:
 *
 *  - COSMETIC (ad-bait div hidden) → browser extension → hard blocking overlay
 *    until the visitor whitelists the site.
 *  - NETWORK: our ad URLs AND a generic ad domain (googlesyndication) are both
 *    unreachable → AdGuard app/DNS, uBlock, Brave… → hard blocking overlay.
 *    Only OUR ad URLs unreachable → carrier/ISP filtering the visitor can't
 *    fix → governed by networkMode:
 *      'soft' (default) → dismissible notice, once per session.
 *      'hard'           → blocking overlay even for carrier filtering.
 *      'off'            → ignore the network signal entirely.
 *    (Real ad blockers always get the hard overlay in every mode except 'off'.)
 */
export const ADBLOCK = {
  enabled: true,
  relaxed: false,      // true → even the hard overlay becomes dismissible
  networkMode: 'soft',
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
