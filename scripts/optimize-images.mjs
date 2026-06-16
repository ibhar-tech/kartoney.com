/**
 * Convert poster images to WebP — smaller files + faster decode → better LCP.
 * Prep step (committed output); not part of the Netlify build. Needs sharp:
 *   npm i sharp   (then)   npm run webp
 * Converts every .jpg/.jpeg/.png in public/images/posters/ to .webp and removes
 * the original, so the site ships WebP only. Safe to re-run (skips .webp).
 */
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'posters');

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('⚠️  sharp not installed — skipping WebP optimization. Run `npm i sharp` then `npm run webp`.');
  process.exit(0); // don't break `npm run images`
}

const files = readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (!files.length) {
  console.log('No JPEG/PNG posters to convert (already WebP).');
  process.exit(0);
}
console.log(`Converting ${files.length} images to WebP …`);

let before = 0, after = 0, ok = 0, fail = 0;
for (const f of files) {
  const src = join(DIR, f);
  const dest = src.replace(/\.(jpe?g|png)$/i, '.webp');
  try {
    before += statSync(src).size;
    await sharp(src).webp({ quality: 80 }).toFile(dest);
    after += statSync(dest).size;
    unlinkSync(src);
    ok++;
  } catch (e) {
    console.error('  ✖', f, e.message);
    fail++;
  }
}
console.log(`✅ ${ok} converted, ${fail} failed.`);
if (ok) console.log(`   ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB  (−${Math.round((1 - after / before) * 100)}%)`);
