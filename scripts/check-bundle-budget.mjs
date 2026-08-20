import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'dist/.vite/manifest.json'), 'utf8'));
const javascript = [...new Set(Object.values(manifest)
  .map((entry) => entry.file)
  .filter((file) => typeof file === 'string' && file.endsWith('.js')))];
const assets = await Promise.all(javascript.map(async (file) => ({
  file,
  bytes: (await stat(resolve(root, 'dist', file))).size,
})));
const maximumChunk = Number(process.env.BUNDLE_MAX_CHUNK_BYTES || 600 * 1024);
const maximumTotal = Number(process.env.BUNDLE_MAX_TOTAL_JS_BYTES || 1_200 * 1024);
const total = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const oversized = assets.filter((asset) => asset.bytes > maximumChunk);
if (oversized.length > 0 || total > maximumTotal) {
  const details = oversized.map((asset) => `${asset.file}: ${asset.bytes} bytes`).join('\n');
  throw new Error(
    `Dashboard JavaScript bundle budget exceeded. Total ${total}/${maximumTotal} bytes.` +
    (details ? `\nOversized chunks:\n${details}` : '')
  );
}
console.log(`Bundle budget passed: ${assets.length} chunks, ${total} JavaScript bytes`);
