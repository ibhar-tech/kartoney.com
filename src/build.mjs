/**
 * Kartoney static-site generator.
 * Reads data/kartoney.db and emits a fully crawlable static site into dist/.
 */
import { writeFileSync, readFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asset } from './assets.mjs';
import { loadData } from './data.mjs';
import { SITE, ADS, url, ERAS, TYPES } from './config.mjs';
import { homePage, landingPage, cartoonPage, episodePage, browsePage, genreChips } from './templates.mjs';
import { num, esc, clip, toISO } from './util.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
const DB = join(ROOT, 'data', 'kartoney.db');

const t0 = Date.now();
let pageCount = 0;

/** Write an HTML page at a clean URL path (e.g. '/cartoon/x/' → dist/cartoon/x/index.html). */
function writePage(path, html) {
  const rel = path === '/' ? 'index.html' : join(path.replace(/^\/|\/$/g, ''), 'index.html');
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  pageCount++;
}

function writeFile(name, content) {
  const file = join(DIST, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function adsRuntime() {
  const natives = ADS.nativeBanners.filter((n) => n.enabled && n.containerId && n.scriptSrc);
  const banners = ADS.banners.filter((b) => b.enabled && b.adKey && b.invokeSrc);
  return `/* generated from src/config.mjs — edit ads there, not here */
(function(){var PU=${JSON.stringify(ADS.popunder.enabled ? ADS.popunder.scriptSrc : '')},SB=${JSON.stringify(ADS.socialBar.enabled ? ADS.socialBar.scriptSrc : '')},NB=${JSON.stringify(natives)},BN=${JSON.stringify(banners)};
function inject(src){var s=document.createElement('script');s.src=src;s.async=true;s.setAttribute('data-cfasync','false');document.body.appendChild(s);}
/* Popunder: at most once per browser session, and only after a real interaction. */
if(PU){var done=false;try{done=sessionStorage.getItem('kg_pu')==='1';}catch(e){}
if(!done){var fired=false;
function fire(){if(fired)return;fired=true;try{sessionStorage.setItem('kg_pu','1');}catch(e){}inject(PU);['click','touchstart','keydown','scroll'].forEach(function(e){window.removeEventListener(e,fire);});}
['click','touchstart','keydown','scroll'].forEach(function(e){window.addEventListener(e,fire,{passive:true});});setTimeout(fire,8000);}}
/* Social bar: after load, off the critical path. */
if(SB){window.addEventListener('load',function(){setTimeout(function(){inject(SB);},1500);});}
/* Native banners: the containers are server-rendered; load each unit's script
   only when its container scrolls near the viewport (CWV + viewability). */
if(NB.length&&'IntersectionObserver' in window){
var loaded={};
var io=new IntersectionObserver(function(entries){entries.forEach(function(en){
if(!en.isIntersecting)return;io.unobserve(en.target);
var id=en.target.id;if(!id||loaded[id])return;loaded[id]=1;
for(var i=0;i<NB.length;i++)if(NB[i].containerId===id){inject(NB[i].scriptSrc);break;}
});},{rootMargin:'500px 0px'});
NB.forEach(function(n){var d=document.getElementById(n.containerId);if(d)io.observe(d);});}
/* Banner units: each mounted inside its own iframe so the atOptions global of
   one unit can't clobber another's. A sticky anchor dismissed this session
   (kg_anchor_off) stays hidden and its iframe is never created. */
BN.forEach(function(b){
var host=document.querySelector('.ad-slot[data-banner="'+b.id+'"]');if(!host)return;
if(b.id==='mobileAnchor'){var off=false;try{off=sessionStorage.getItem('kg_anchor_off')==='1';}catch(e){}
if(off){host.style.display='none';return;}}
var f=document.createElement('iframe');
f.width=b.width;f.height=b.height;f.scrolling='no';f.title='إعلان';
f.setAttribute('frameborder','0');
f.style.cssText='border:0;display:block;margin:0 auto;max-width:100%;width:'+b.width+'px;height:'+b.height+'px;';
host.appendChild(f);
try{var d=f.contentDocument;d.open();d.write('<body style="margin:0"><script>var atOptions={"key":"'+b.adKey+'","format":"iframe","height":'+b.height+',"width":'+b.width+',"params":{}};<\\/script><script src="'+b.invokeSrc+'"><\\/script></body>');d.close();}catch(e){}
});
})();`;
}

/** Conservative CSS minifier: comments, whitespace, trailing semicolons.
 *  The stylesheet has no data-URI or content strings, so this is safe. */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function xmlUrl(loc, lastmod, changefreq, priority) {
  return `  <url><loc>${SITE.url}${loc}</loc><lastmod>${lastmod}</lastmod>${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`;
}

/** One <url> entry for the Google video sitemap (one per episode). */
function videoEntry(ep, c) {
  const title = ep.title || `${c.name} - الحلقة ${ep.episode_number}`;
  const desc = clip(`شاهد ${title} من مسلسل ${c.name} مدبلجة بالعربية أونلاين بجودة عالية ومجاناً على كارتوني.`, 200);
  const thumb = url.absImg(ep.logo || c.logo);
  const date = toISO(c.created_at);
  return `  <url>
    <loc>${SITE.url}${url.watch(c.slug, ep.slug)}</loc>
    <video:video>
      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>
      <video:title>${esc(title)}</video:title>
      <video:description>${esc(desc)}</video:description>
      <video:content_loc>${esc(ep.url)}</video:content_loc>${date ? `\n      <video:publication_date>${date}</video:publication_date>` : ''}
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
    </video:video>
  </url>`;
}

async function build() {
  if (!existsSync(DB)) throw new Error(`Database not found at ${DB}`);
  const data = await loadData(DB);

  // 1) Fresh dist + copy static assets
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  cpSync(PUBLIC, DIST, { recursive: true });

  // 2) Ad runtime (from config). Named neutrally — a file literally called
  //    "ads.js" is blocked by default ad-blocker filter lists.
  writeFile('js/widgets.js', adsRuntime());

  // 2.2) Minify the CSS in dist/ only (public/ stays readable). Runs before
  //      the bundle hash is computed so pages reference the minified bytes.
  const cssFile = join(DIST, 'css', 'style.css');
  writeFileSync(cssFile, minifyCss(readFileSync(cssFile, 'utf8')));

  // 2.5) Hash the CSS/JS bundle and stamp it into sw.js. Must run after the
  //      public/ copy and widgets.js, and before any page is rendered — pages
  //      embed the version via av() from assets.mjs.
  // ponytail: one hash for all three files. 66 KB total, so a CSS edit
  //           re-fetching main.js too is cheaper than three cache keys.
  const h = createHash('sha1');
  for (const f of ['css/style.css', 'js/main.js', 'js/widgets.js', 'js/player.js']) h.update(readFileSync(join(DIST, f)));
  asset.v = h.digest('hex').slice(0, 8);
  writeFile('sw.js', readFileSync(join(PUBLIC, 'sw.js'), 'utf8').replaceAll('__ASSET_V__', asset.v));

  // 3) Home (Landing Page)
  writePage('/', landingPage(data));

  // 3.5) Lives Page (Cartoon Catalog)
  writePage('/lives/', homePage(data));

  // 4) Cartoon + episode pages
  for (const c of data.cartoons) {
    writePage(url.cartoon(c.slug), cartoonPage(c, data));
    for (const ep of c.allEpisodes) {
      writePage(url.watch(c.slug, ep.slug), episodePage(ep, c, data));
    }
  }

  // 5) Library (all cartoons)
  writePage(
    url.library(),
    browsePage({
      title: 'كل مسلسلات الكرتون والأنمي - المكتبة الكاملة | كارتوني',
      h1: 'مكتبة الكرتون والأنمي',
      description: `تصفح كل مسلسلات الكرتون والأنمي المدبلجة بالعربية على كارتوني — ${num(data.totals.cartoons)} مسلسل و${num(data.totals.episodes)} حلقة مجاناً.`,
      path: url.library(),
      cartoons: data.cartoons,
      data,
      chips: genreChips(data, null),
      intro: `${num(data.totals.cartoons)} مسلسل • ${num(data.totals.episodes)} حلقة`,
    })
  );

  // 6) Genres index + each genre
  writePage(
    url.genresIndex(),
    browsePage({
      title: 'تصنيفات الكرتون والأنمي - أكشن، مغامرة، كوميدي والمزيد | كارتوني',
      h1: 'تصنيفات الكرتون والأنمي',
      description: 'تصفح مسلسلات الكرتون والأنمي حسب التصنيف: أكشن، مغامرة، رياضي، خيال علمي، غموض، عائلي، دراما، كوميدي والمزيد — مدبلجة بالعربية ومجاناً.',
      path: url.genresIndex(),
      cartoons: data.cartoons,
      data,
      chips: genreChips(data, null),
    })
  );
  for (const g of data.genres) {
    const list = data.byGenre(g.en);
    writePage(
      url.genre(g.en),
      browsePage({
        title: `كرتون وأنمي ${g.name_ar} مدبلج عربي - ${num(list.length)} مسلسل | كارتوني`,
        h1: `${g.icon || ''} كرتون ${g.name_ar}`,
        description: `شاهد أفضل مسلسلات الكرتون والأنمي من تصنيف ${g.name_ar} مدبلجة بالعربية أونلاين مجاناً — ${num(list.length)} مسلسل على كارتوني.`,
        path: url.genre(g.en),
        cartoons: list,
        data,
        chips: genreChips(data, g.en),
        intro: `${num(list.length)} مسلسل في تصنيف ${g.name_ar}`,
        parent: { label: 'التصنيفات', href: url.genresIndex() },
      })
    );
  }

  // 7) Types
  for (const ty of TYPES) {
    const list = data.byType(ty.key);
    if (!list.length) continue;
    writePage(
      url.category(ty.key),
      browsePage({
        title: `${ty.label} مدبلج عربي - ${num(list.length)} مسلسل | كارتوني`,
        h1: `${ty.emoji} ${ty.label}`,
        description: `شاهد أفضل مسلسلات ${ty.label} المدبلجة بالعربية أونلاين مجاناً — ${num(list.length)} مسلسل على كارتوني.`,
        path: url.category(ty.key),
        cartoons: list,
        data,
        intro: `${num(list.length)} مسلسل`,
      })
    );
  }

  // 8) Eras
  for (const era of ERAS) {
    const list = data.byEra(era.key);
    if (!list.length) continue;
    writePage(
      url.era(era.key),
      browsePage({
        title: `${era.label} - أفضل مسلسلات الكرتون | كارتوني`,
        h1: `${era.emoji} ${era.label}`,
        description: `استرجع ذكريات الطفولة مع أفضل ${era.label} المدبلجة بالعربية — ${num(list.length)} مسلسل أونلاين مجاناً على كارتوني.`,
        path: url.era(era.key),
        cartoons: list,
        data,
        intro: `${num(list.length)} مسلسل`,
      })
    );
  }

  // 9) Search index (tiny, for the overlay)
  const index = data.cartoons.map((c) => ({
    n: c.name,
    s: c.slug,
    e: c.era || '',
    ep: c.total_episodes,
    g: c.genres.map((g) => g.ar).join(' • '),
    l: c.logo || '',
  }));
  writeFile('search-index.json', JSON.stringify(index));

  // 10) Sitemaps (index + pages + episodes) and robots.txt
  const today = new Date().toISOString().slice(0, 10);
  const pageUrls = [
    xmlUrl('/', today, 'daily', '1.0'),
    xmlUrl('/lives/', today, 'daily', '0.95'),
    xmlUrl('/live_streaming_apps/', today, 'weekly', '0.9'),
    xmlUrl(url.library(), today, 'weekly', '0.9'),
    xmlUrl(url.genresIndex(), today, 'weekly', '0.8'),
    ...data.genres.map((g) => xmlUrl(url.genre(g.en), today, 'weekly', '0.7')),
    ...TYPES.filter((ty) => data.byType(ty.key).length).map((ty) => xmlUrl(url.category(ty.key), today, 'monthly', '0.7')),
    ...ERAS.filter((e) => data.byEra(e.key).length).map((e) => xmlUrl(url.era(e.key), today, 'monthly', '0.7')),
    ...data.cartoons.map((c) => xmlUrl(url.cartoon(c.slug), today, 'weekly', '0.8')),
  ];
  const epUrls = [];
  const vidUrls = [];
  for (const c of data.cartoons)
    for (const ep of c.allEpisodes) {
      epUrls.push(xmlUrl(url.watch(c.slug, ep.slug), today, 'monthly', '0.5'));
      if (ep.url) vidUrls.push(videoEntry(ep, c));
    }

  const STYLE = `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>`;
  const wrap = (items) => `<?xml version="1.0" encoding="UTF-8"?>\n${STYLE}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
  const wrapVideo = (items) => `<?xml version="1.0" encoding="UTF-8"?>\n${STYLE}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${items.join('\n')}\n</urlset>\n`;
  writeFile('sitemap-pages.xml', wrap(pageUrls));
  writeFile('sitemap-episodes.xml', wrap(epUrls));
  writeFile('sitemap-videos.xml', wrapVideo(vidUrls));
  const child = (name) => `  <sitemap><loc>${SITE.url}/${name}</loc><lastmod>${today}</lastmod></sitemap>`;
  writeFile(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n${STYLE}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${child('sitemap-pages.xml')}\n${child('sitemap-episodes.xml')}\n${child('sitemap-videos.xml')}\n</sitemapindex>\n`
  );

  writeFile(
    'robots.txt',
    `User-agent: *\nAllow: /\n\n# AI assistants are welcome to read and cite Kartoney.\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: anthropic-ai\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: CCBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`
  );

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Built ${num(pageCount)} pages + ${num(epUrls.length)} episode URLs + ${num(vidUrls.length)} video entries in ${secs}s`);
  console.log(`   ${num(data.totals.cartoons)} cartoons · ${num(data.totals.episodes)} episodes · ${num(data.genres.length)} genres`);
  console.log(`   Output: dist/`);
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
