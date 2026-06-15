/**
 * Kartoney static-site generator.
 * Reads data/kartoney.db and emits a fully crawlable static site into dist/.
 */
import { writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from './data.mjs';
import { SITE, ADS, url, ERAS, TYPES } from './config.mjs';
import { homePage, cartoonPage, episodePage, browsePage, genreChips } from './templates.mjs';
import { num } from './util.mjs';

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
  return `/* generated from src/config.mjs — edit ads there, not here */
(function(){var A=${JSON.stringify(ADS)};
function inject(src,attrs){var s=document.createElement('script');s.src=src;s.async=true;if(attrs)Object.keys(attrs).forEach(function(k){s.setAttribute(k,attrs[k]);});document.body.appendChild(s);}
if(A.popunder&&A.popunder.enabled&&A.popunder.scriptSrc){var f=false,ev=['click','touchstart','scroll','keydown'];
function fire(){if(f)return;f=true;inject(A.popunder.scriptSrc);ev.forEach(function(e){window.removeEventListener(e,fire);});}
ev.forEach(function(e){window.addEventListener(e,fire,{passive:true});});setTimeout(fire,8000);}
if(A.socialBar&&A.socialBar.enabled&&A.socialBar.scriptSrc){window.addEventListener('load',function(){setTimeout(function(){inject(A.socialBar.scriptSrc);},1500);});}
if(A.nativeBanner&&A.nativeBanner.enabled&&A.nativeBanner.scriptSrc&&A.nativeBanner.containerId){window.addEventListener('load',function(){if(!document.getElementById(A.nativeBanner.containerId))return;setTimeout(function(){inject(A.nativeBanner.scriptSrc,{'data-cfasync':'false'});},1200);});}
})();`;
}

function xmlUrl(loc, lastmod, changefreq, priority) {
  return `  <url><loc>${SITE.url}${loc}</loc><lastmod>${lastmod}</lastmod>${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`;
}

async function build() {
  if (!existsSync(DB)) throw new Error(`Database not found at ${DB}`);
  const data = await loadData(DB);

  // 1) Fresh dist + copy static assets
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  cpSync(PUBLIC, DIST, { recursive: true });

  // 2) Ad runtime (from config)
  writeFile('js/ads.js', adsRuntime());

  // 3) Home
  writePage('/', homePage(data));

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
    xmlUrl(url.library(), today, 'weekly', '0.9'),
    xmlUrl(url.genresIndex(), today, 'weekly', '0.8'),
    ...data.genres.map((g) => xmlUrl(url.genre(g.en), today, 'weekly', '0.7')),
    ...TYPES.filter((ty) => data.byType(ty.key).length).map((ty) => xmlUrl(url.category(ty.key), today, 'monthly', '0.7')),
    ...ERAS.filter((e) => data.byEra(e.key).length).map((e) => xmlUrl(url.era(e.key), today, 'monthly', '0.7')),
    ...data.cartoons.map((c) => xmlUrl(url.cartoon(c.slug), today, 'weekly', '0.8')),
  ];
  const epUrls = [];
  for (const c of data.cartoons) for (const ep of c.allEpisodes) epUrls.push(xmlUrl(url.watch(c.slug, ep.slug), today, 'monthly', '0.5'));

  const wrap = (items) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
  writeFile('sitemap-pages.xml', wrap(pageUrls));
  writeFile('sitemap-episodes.xml', wrap(epUrls));
  writeFile(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE.url}/sitemap-pages.xml</loc><lastmod>${today}</lastmod></sitemap>\n  <sitemap><loc>${SITE.url}/sitemap-episodes.xml</loc><lastmod>${today}</lastmod></sitemap>\n</sitemapindex>\n`
  );

  writeFile(
    'robots.txt',
    `User-agent: *\nAllow: /\n\n# AI assistants are welcome to read and cite Kartoney.\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: anthropic-ai\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: CCBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`
  );

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ Built ${num(pageCount)} pages + ${num(epUrls.length)} episode URLs in ${secs}s`);
  console.log(`   ${num(data.totals.cartoons)} cartoons · ${num(data.totals.episodes)} episodes · ${num(data.genres.length)} genres`);
  console.log(`   Output: dist/`);
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
