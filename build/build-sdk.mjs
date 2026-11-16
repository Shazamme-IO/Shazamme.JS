/**
 * Reproducible build for the SDK (shazamme.js).
 *
 * Reads `const version = '...'` from shazamme.js, minifies with terser
 * (compress + mangle, the same settings that reproduce the committed 1.1.6 build)
 * and writes dist/sdk/shazamme-<version>.min.js.
 *
 * Run: `npm run build:sdk`
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minify } from 'terser';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'shazamme.js'), 'utf8');

const match = src.match(/const\s+version\s*=\s*'([^']+)'/);
if (!match) {
  console.error('Could not find `const version` in shazamme.js');
  process.exit(1);
}

const version = match[1];
const result = await minify(src, { compress: true, mangle: true, format: { comments: false } });

mkdirSync(join(ROOT, 'dist', 'sdk'), { recursive: true });

const out = join(ROOT, 'dist', 'sdk', `shazamme-${version}.min.js`);
writeFileSync(out, result.code);

console.log(`Built SDK v${version} -> ${out} (${result.code.length} bytes)`);
