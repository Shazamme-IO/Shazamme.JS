/**
 * Reproducible build for the screening-question plugin.
 *
 * Reads the hand-edited sources (plugin.js, plugin.css), minifies them, and emits
 * all four deployable artifacts into dist/screening-question/<version>/:
 *   plugin.js  plugin.css  plugin.min.js  plugin.min.css
 *
 * The <version> is read from `const Version = '...'` in plugin.js so the artifact
 * path always matches what the source loads at runtime.
 *
 * Run: `npm run build`
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'plugin', 'screening-question');

const js = readFileSync(join(SRC, 'plugin.js'), 'utf8');
const css = readFileSync(join(SRC, 'plugin.css'), 'utf8');

const versionMatch = js.match(/const\s+Version\s*=\s*'([^']+)'/);
if (!versionMatch) {
  console.error('Could not find `const Version` in plugin.js');
  process.exit(1);
}
const version = versionMatch[1];

const outDir = join(ROOT, 'dist', 'screening-question', version);
mkdirSync(outDir, { recursive: true });

const minCss = new CleanCSS({ level: 2 }).minify(css);
if (minCss.errors.length) {
  console.error('CSS minify errors:', minCss.errors);
  process.exit(1);
}

const minJsResult = await minify(js, {
  compress: true,
  mangle: true,
  format: { comments: false },
});
if (minJsResult.error) {
  console.error('JS minify error:', minJsResult.error);
  process.exit(1);
}

const artifacts = {
  'plugin.js': js,
  'plugin.css': css,
  'plugin.min.js': minJsResult.code,
  'plugin.min.css': minCss.styles,
};

for (const [name, content] of Object.entries(artifacts)) {
  const path = join(outDir, name);
  writeFileSync(path, content);
  console.log(`  ${name.padEnd(16)} ${String(content.length).padStart(7)} bytes`);
}

console.log(`\nBuilt screening-question v${version} -> ${outDir}`);
console.log('Deploy: aws s3 cp <file> s3://shazamme.io-us-east-1-public-file/js/plugin/screening-question/' + version + '/  --profile sdk-deployer');
