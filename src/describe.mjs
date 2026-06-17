/**
 * Builds richer, unique Arabic descriptions for each series from structured DB
 * fields (genres, era, type, episode/season counts, status) + the existing short
 * tagline. No plot facts are invented — only real attributes are combined, with
 * rotating phrasing so the 107 series pages don't read as one template.
 */
import { num } from './util.mjs';

const ERA_PHRASE = {
  '80s': 'ثمانينات القرن الماضي',
  '90s': 'حقبة التسعينات الذهبية',
  '2000s': 'مطلع الألفية الجديدة',
  '2010s': 'العقد الأخير',
};

const TYPE_PHRASE = {
  anime: 'من أشهر مسلسلات الأنمي',
  classic: 'من روائع الكرتون الكلاسيكي',
  modern: 'من مسلسلات الكرتون الحديثة',
};

/** Pull the descriptive part out of "اسم - وصف قصير." → "وصف قصير." */
function tagline(c) {
  let d = (c.description || '').trim();
  if (!d) return '';
  const dash = d.indexOf(' - ');
  if (dash !== -1) d = d.slice(dash + 3).trim();
  if (d && !/[.!؟]$/.test(d)) d += '.';
  return d;
}

function genresList(c) {
  return c.genres.map((g) => g.ar).join('، ');
}

function seasonsPart(c) {
  return c.total_seasons > 1 ? ` موزّعة على ${num(c.total_seasons)} أجزاء` : '';
}

/** Full multi-sentence description for the page body + JSON-LD. */
export function longDesc(c) {
  const type = TYPE_PHRASE[c.type] || 'من مسلسلات الكرتون';
  const era = ERA_PHRASE[c.era] || '';
  const genres = genresList(c);
  const eps = `${num(c.total_episodes)} حلقة${seasonsPart(c)}`;
  const tag = tagline(c);
  const tagSp = tag ? ' ' + tag : '';
  const eraTo = era ? ` التي تعود إلى ${era}` : '';   // "...الأنمي التي تعود إلى التسعينات"
  const eraIn = era ? ` في ${era}` : '';              // "...الأنمي في التسعينات"
  const gComma = genres ? `، ضمن تصنيف ${genres}` : '';
  const gOf = genres ? ` من تصنيف ${genres}` : '';

  const variants = [
    `${c.name} ${type}${eraTo}، مدبلج بالكامل إلى اللغة العربية.${tagSp} يتألف المسلسل من ${eps}${gComma}. شاهد جميع حلقات ${c.name} كاملةً أونلاين بجودة عالية ومجاناً على كارتوني، بدون تسجيل أو اشتراك.`,
    `استمتع بمشاهدة ${c.name}، ${type}${eraIn}، مدبلجاً بالعربية.${tagSp} يضم ${eps}${gOf}، وجميع الحلقات متوفرة كاملة وبجودة عالية مجاناً على موقع كارتوني.`,
    `يُعد ${c.name} من الأعمال المميزة، وهو ${type}${eraIn}، معروض مدبلجاً بالعربية.${tagSp} يحتوي على ${eps}${gComma}. تابع كل حلقات ${c.name} أونلاين مجاناً وبجودة عالية على كارتوني.`,
  ];
  return variants[c.id % variants.length];
}

/** Concise ≤155-char meta description. */
export function metaDesc(c) {
  const genres = c.genres.slice(0, 2).map((g) => g.ar).join('، ');
  const parts = [`شاهد ${c.name} مدبلج عربي كامل`, `${num(c.total_episodes)} حلقة`];
  if (genres) parts.push(genres);
  let s = parts.join(' — ') + `. جميع الحلقات أونلاين بجودة عالية ومجاناً على كارتوني.`;
  if (s.length > 158) s = s.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return s;
}

/* ───────────────────────── EPISODE-LEVEL ─────────────────────────
 * Episode pages have no plot data in the DB, so — like the series text —
 * these combine only REAL facts (episode/season position, adjacent episodes,
 * series attributes) with rotating phrasing seeded by ep.id. The point is to
 * make each of the 8,611 pages genuinely distinct & useful, NOT to mass-produce
 * keyword filler (which Google's helpful-content system penalizes).        */

function episodeFacts(ep, c, prev, next) {
  const total = c.allEpisodes.length;
  const idx = c.allEpisodes.findIndex((e) => e.id === ep.id);
  const position = idx >= 0 ? idx + 1 : ep.episode_number;
  const type = TYPE_PHRASE[c.type] || 'من مسلسلات الكرتون';
  const era = ERA_PHRASE[c.era] ? ` الذي يعود إلى ${ERA_PHRASE[c.era]}` : '';
  const genres = genresList(c);
  const seasonPart = c.total_seasons > 1 ? ` من ${ep.seasonName || 'الجزء ' + num(ep.seasonNumber)}` : '';
  return { total, position, type, era, genres, seasonPart, prev, next };
}

/** Multi-sentence, fact-only episode description for the page body. */
export function episodeLongDesc(ep, c, prev, next) {
  const f = episodeFacts(ep, c, prev, next);
  const tag = tagline(c);
  const tagSp = tag ? ` ${tag}` : '';
  const gPart = f.genres ? ` ضمن تصنيف ${f.genres}` : '';

  const intro = `«${ep.title}» هي الحلقة رقم ${num(ep.episode_number)}${f.seasonPart} من مسلسل ${c.name}، ${f.type}${f.era}، المدبلج بالكامل إلى اللغة العربية.`;
  const count = `وهي الحلقة ${num(f.position)} من إجمالي ${num(f.total)} حلقة${gPart}.`;

  const nb = [];
  if (f.prev) nb.push(`تأتي بعد حلقة «${f.prev.title}»`);
  if (f.next) nb.push(`${f.prev ? 'و' : ''}يليها «${f.next.title}»`);
  const nbSp = nb.length ? ` ${nb.join(' ')}.` : '';

  const watch = `شاهد «${ep.title}» كاملةً بجودة عالية ومجاناً على كارتوني، بدون تسجيل أو اشتراك.`;

  const variants = [
    `${intro}${tagSp} ${count}${nbSp} ${watch}`,
    `${intro} ${count}${nbSp}${tagSp} ${watch}`,
    `تابع «${ep.title}» من ${c.name}، ${f.type}${f.era}، مدبلجة بالعربية. ${count}${nbSp}${tagSp} ${watch}`,
  ];
  return variants[ep.id % variants.length];
}

/** Concise ≤155-char meta description for an episode page. */
export function episodeMetaDesc(ep, c) {
  const variants = [
    `شاهد ${ep.title} من ${c.name} مدبلجة بالعربية أونلاين بجودة عالية ومجاناً على كارتوني — الحلقة كاملة بدون تسجيل.`,
    `${ep.title} — ${c.name} مدبلج عربي. شاهد الحلقة كاملةً أونلاين بجودة عالية ومجاناً على كارتوني، بدون اشتراك.`,
  ];
  let s = variants[ep.id % variants.length];
  if (s.length > 158) s = s.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return s;
}

/** Page-specific FAQ (real Q&A) — visible on-page and mirrored in FAQPage JSON-LD. */
export function episodeFaq(ep, c, prev, next) {
  const faqs = [
    {
      q: `هل ${ep.title} مدبلجة بالعربية؟`,
      a: `نعم، ${ep.title} من مسلسل ${c.name} متوفرة مدبلجة بالكامل إلى اللغة العربية بجودة عالية على كارتوني.`,
    },
    {
      q: `كيف أشاهد ${ep.title}؟`,
      a: `شغّل الفيديو مباشرةً من المشغّل في أعلى هذه الصفحة — المشاهدة مجانية تماماً وبدون تسجيل أو اشتراك.`,
    },
    {
      q: `كم عدد حلقات ${c.name}؟`,
      a: `يضم مسلسل ${c.name} ${num(c.total_episodes)} حلقة${c.total_seasons > 1 ? ` موزعة على ${num(c.total_seasons)} أجزاء` : ''}، وجميعها متوفرة كاملةً على كارتوني.`,
    },
  ];
  if (next) {
    faqs.push({
      q: `ما الحلقة التالية بعد ${ep.title}؟`,
      a: `الحلقة التالية هي «${next.title}»، ويمكنك متابعتها مباشرةً بعد انتهاء هذه الحلقة من زر «التالي».`,
    });
  }
  return faqs;
}
