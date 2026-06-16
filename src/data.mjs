/**
 * Loads data/kartoney.db (via sql.js — pure WASM, no native build) and assembles
 * a fully-linked in-memory object graph used by the generator.
 */
import initSqlJs from 'sql.js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { posterName, POSTER_URL_PREFIX } from './imageMap.mjs';

const require = createRequire(import.meta.url);

// Self-hosted posters (see imageMap.mjs). Any logo we downloaded is rewritten to
// a same-origin /images/posters/ path so ad-blockers can't blank the page; the
// rest fall back to their original remote URL.
const POSTER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'posters');
const localPosters = new Set(existsSync(POSTER_DIR) ? readdirSync(POSTER_DIR) : []);
function localImage(srcUrl) {
  const n = posterName(srcUrl);
  if (!n) return srcUrl;
  const webp = n.replace(/\.(jpe?g|png)$/i, '.webp'); // prefer the optimized WebP
  if (localPosters.has(webp)) return POSTER_URL_PREFIX + webp;
  if (localPosters.has(n)) return POSTER_URL_PREFIX + n;
  return srcUrl;
}

export async function loadData(dbPath) {
  const SQL = await initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });
  const db = new SQL.Database(readFileSync(dbPath));

  const rows = (sql) => {
    const res = db.exec(sql);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map((r) => Object.fromEntries(r.map((v, i) => [columns[i], v])));
  };

  // Normalize genre shape so it matches the per-cartoon genre objects ({ar, en, icon}).
  const genres = rows('SELECT * FROM genres ORDER BY id').map((g) => ({
    id: g.id,
    ar: g.name_ar,
    en: g.name_en,
    name_ar: g.name_ar,
    name_en: g.name_en,
    icon: g.icon,
    color: g.color,
  }));
  const cartoons = rows('SELECT * FROM cartoons ORDER BY sort_order, id');
  const cgRows = rows(
    `SELECT cg.cartoon_id, g.name_ar, g.name_en, g.icon
       FROM cartoon_genres cg JOIN genres g ON cg.genre_id = g.id`
  );
  const seasons = rows('SELECT * FROM seasons ORDER BY cartoon_id, season_number, id');
  const episodes = rows('SELECT * FROM episodes ORDER BY cartoon_id, season_id, episode_number, id');

  db.close();

  // ── Link genres onto cartoons ──
  const genresByCartoon = new Map();
  for (const row of cgRows) {
    if (!genresByCartoon.has(row.cartoon_id)) genresByCartoon.set(row.cartoon_id, []);
    genresByCartoon.get(row.cartoon_id).push({ ar: row.name_ar, en: row.name_en, icon: row.icon });
  }

  // ── Link episodes onto seasons ──
  const episodesBySeason = new Map();
  const episodesByCartoon = new Map();
  for (const ep of episodes) {
    if (!episodesBySeason.has(ep.season_id)) episodesBySeason.set(ep.season_id, []);
    episodesBySeason.get(ep.season_id).push(ep);
    if (!episodesByCartoon.has(ep.cartoon_id)) episodesByCartoon.set(ep.cartoon_id, []);
    episodesByCartoon.get(ep.cartoon_id).push(ep);
  }

  // ── Link seasons onto cartoons ──
  const seasonsByCartoon = new Map();
  for (const s of seasons) {
    s.episodes = episodesBySeason.get(s.id) || [];
    if (!seasonsByCartoon.has(s.cartoon_id)) seasonsByCartoon.set(s.cartoon_id, []);
    seasonsByCartoon.get(s.cartoon_id).push(s);
  }

  // ── Assemble cartoons + per-episode URL slugs ──
  const bySlug = new Map();
  const byId = new Map();
  for (const c of cartoons) {
    c.genres = genresByCartoon.get(c.id) || [];
    c.seasons = seasonsByCartoon.get(c.id) || [];
    c.allEpisodes = episodesByCartoon.get(c.id) || [];
    c.logo = localImage(c.logo);

    // Unique, human-readable episode slug within the cartoon: "<season>-<episode>".
    const used = new Set();
    for (const ep of c.allEpisodes) {
      ep.logo = localImage(ep.logo);
      const season = c.seasons.find((s) => s.id === ep.season_id);
      ep.seasonNumber = season ? season.season_number : 1;
      ep.seasonName = season ? season.name : '';
      let slug = `${ep.seasonNumber}-${ep.episode_number}`;
      if (used.has(slug)) slug = `${slug}-${ep.id}`;
      used.add(slug);
      ep.slug = slug;
      ep.cartoonSlug = c.slug;
      ep.cartoonName = c.name;
    }
    bySlug.set(c.slug, c);
    byId.set(c.id, c);
  }

  return {
    genres,
    cartoons,
    bySlug,
    byId,
    byGenre: (en) => cartoons.filter((c) => c.genres.some((g) => g.en === en)),
    byEra: (era) => cartoons.filter((c) => c.era === era),
    byType: (type) => cartoons.filter((c) => c.type === type),
    featured: cartoons.filter((c) => c.is_featured),
    popular: cartoons.filter((c) => c.is_popular),
    totals: {
      cartoons: cartoons.length,
      episodes: episodes.length,
      seasons: seasons.length,
      genres: genres.length,
    },
  };
}
