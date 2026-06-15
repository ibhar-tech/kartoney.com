/**
 * Kartoney.com — Database Layer
 * Uses sql.js (SQLite compiled to WebAssembly) to query data in-browser.
 */

let db = null;
let dbReady = false;
const dbReadyCallbacks = [];

/**
 * Initialize the database
 */
async function initDB() {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const response = await fetch('./data/kartoney.db');
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    dbReady = true;

    // Notify any waiting callbacks
    dbReadyCallbacks.forEach(cb => cb());
    dbReadyCallbacks.length = 0;

    console.log('✅ Kartoney DB initialized');
    return db;
  } catch (err) {
    console.error('❌ Failed to initialize DB:', err);
    throw err;
  }
}

/**
 * Wait for DB to be ready
 */
function onDBReady(callback) {
  if (dbReady) {
    callback();
  } else {
    dbReadyCallbacks.push(callback);
  }
}

/**
 * Execute a query and return results as array of objects
 */
function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * Execute a query and return first result
 */
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}


// ══════════════════════════════════════════════
// API Functions
// ══════════════════════════════════════════════

/**
 * Get all genres
 */
function getGenres() {
  return query('SELECT * FROM genres ORDER BY id');
}

/**
 * Get featured cartoons (for hero section)
 */
function getFeaturedCartoons() {
  return query(`
    SELECT c.*,
           GROUP_CONCAT(g.name_ar, ' • ') as genres_ar
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
    WHERE c.is_featured = 1
    GROUP BY c.id
    ORDER BY RANDOM()
    LIMIT 5
  `);
}

/**
 * Get popular cartoons (for "Most Watched")
 */
function getPopularCartoons(limit = 10) {
  return query(`
    SELECT c.*,
           GROUP_CONCAT(g.name_ar, ' • ') as genres_ar
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
    WHERE c.is_popular = 1
    GROUP BY c.id
    ORDER BY c.total_episodes DESC
    LIMIT ?
  `, [limit]);
}

/**
 * Get all cartoons with optional filtering
 */
function getCartoons({ genre, type, era, search, limit, offset } = {}) {
  let sql = `
    SELECT c.*,
           GROUP_CONCAT(DISTINCT g.name_ar) as genres_ar
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
  `;

  const conditions = [];
  const params = [];

  if (genre) {
    conditions.push(`EXISTS (
      SELECT 1 FROM cartoon_genres cg2
      JOIN genres g2 ON cg2.genre_id = g2.id
      WHERE cg2.cartoon_id = c.id AND g2.name_en = ?
    )`);
    params.push(genre);
  }
  if (type) {
    conditions.push('c.type = ?');
    params.push(type);
  }
  if (era) {
    conditions.push('c.era = ?');
    params.push(era);
  }
  if (search) {
    conditions.push('c.name LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY c.id ORDER BY c.sort_order';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }
  }

  return query(sql, params);
}

/**
 * Get cartoons by genre
 */
function getCartoonsByGenre(genreEn, limit = 20) {
  return getCartoons({ genre: genreEn, limit });
}

/**
 * Get cartoons by era
 */
function getCartoonsByEra(era, limit = 20) {
  return getCartoons({ era, limit });
}

/**
 * Get a single cartoon by slug
 */
function getCartoonBySlug(slug) {
  return queryOne(`
    SELECT c.*,
           GROUP_CONCAT(DISTINCT g.name_ar) as genres_ar,
           GROUP_CONCAT(DISTINCT g.name_en) as genres_en
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
    WHERE c.slug = ?
    GROUP BY c.id
  `, [slug]);
}

/**
 * Get cartoon by ID
 */
function getCartoonById(id) {
  return queryOne(`
    SELECT c.*,
           GROUP_CONCAT(DISTINCT g.name_ar) as genres_ar,
           GROUP_CONCAT(DISTINCT g.name_en) as genres_en
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);
}

/**
 * Get seasons for a cartoon
 */
function getSeasons(cartoonId) {
  return query(
    'SELECT * FROM seasons WHERE cartoon_id = ? ORDER BY season_number',
    [cartoonId]
  );
}

/**
 * Get episodes for a season
 */
function getEpisodes(seasonId) {
  return query(
    'SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number',
    [seasonId]
  );
}

/**
 * Get all episodes for a cartoon
 */
function getAllEpisodes(cartoonId) {
  return query(
    'SELECT e.*, s.season_number, s.name as season_name FROM episodes e JOIN seasons s ON e.season_id = s.id WHERE e.cartoon_id = ? ORDER BY s.season_number, e.episode_number',
    [cartoonId]
  );
}

/**
 * Get a single episode by ID
 */
function getEpisodeById(episodeId) {
  return queryOne('SELECT * FROM episodes WHERE id = ?', [episodeId]);
}

/**
 * Get next/previous episodes
 */
function getAdjacentEpisodes(episodeId, cartoonId) {
  const current = getEpisodeById(episodeId);
  if (!current) return { prev: null, next: null };

  const allEps = getAllEpisodes(cartoonId);
  const idx = allEps.findIndex(e => e.id === episodeId);

  return {
    prev: idx > 0 ? allEps[idx - 1] : null,
    next: idx < allEps.length - 1 ? allEps[idx + 1] : null
  };
}

/**
 * Search cartoons by name
 */
function searchCartoons(q, limit = 20) {
  return query(`
    SELECT c.*,
           GROUP_CONCAT(DISTINCT g.name_ar) as genres_ar
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
    WHERE c.name LIKE ? OR c.slug LIKE ? OR c.source_file LIKE ? OR c.description LIKE ?
    GROUP BY c.id
    ORDER BY c.is_popular DESC, c.total_episodes DESC
    LIMIT ?
  `, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit]);
}

/**
 * Search episodes by title
 */
function searchEpisodes(q, limit = 10) {
  return query(`
    SELECT e.*, c.name as cartoon_name, c.slug as cartoon_slug
    FROM episodes e
    JOIN cartoons c ON e.cartoon_id = c.id
    WHERE e.title LIKE ?
    LIMIT ?
  `, [`%${q}%`, limit]);
}

/**
 * Get random cartoons (for suggestions)
 */
function getRandomCartoons(limit = 10, excludeId = null) {
  let sql = `
    SELECT c.*,
           GROUP_CONCAT(DISTINCT g.name_ar) as genres_ar
    FROM cartoons c
    LEFT JOIN cartoon_genres cg ON c.id = cg.cartoon_id
    LEFT JOIN genres g ON cg.genre_id = g.id
  `;
  const params = [];

  if (excludeId) {
    sql += ' WHERE c.id != ?';
    params.push(excludeId);
  }

  sql += ' GROUP BY c.id ORDER BY RANDOM() LIMIT ?';
  params.push(limit);

  return query(sql, params);
}

/**
 * Get stats
 */
function getStats() {
  return {
    cartoons: queryOne('SELECT COUNT(*) as c FROM cartoons').c,
    episodes: queryOne('SELECT COUNT(*) as c FROM episodes').c,
    genres: queryOne('SELECT COUNT(*) as c FROM genres').c
  };
}
