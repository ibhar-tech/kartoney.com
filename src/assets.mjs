/**
 * Build-time asset version.
 *
 * style.css / main.js / widgets.js ship under fixed filenames but are served
 * `immutable, max-age=31536000`, and sw.js caches them cache-first — so without
 * a changing URL an edit never reaches a returning visitor. The `?v=` hash makes
 * each build a distinct cache key at both layers.
 *
 * Mutable holder: templates.mjs is imported before build.mjs has hashed dist/.
 */
export const asset = { v: 'dev' };

/** Version a same-origin asset path. */
export const av = (path) => `${path}?v=${asset.v}`;
