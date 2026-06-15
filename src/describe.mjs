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
