// Guards against publishing photographs that have not been approved.  Run with:  npm test
// The list of withheld images lives in research/reference_images.json. These tests fail if any of them
// could reach the public site through public/, the built dist/ folder, a data file or the dev server config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|tiff?|bmp|avif)$/i;

async function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p)); else out.push(p);
  }
  return out;
}

async function withheld() {
  const ref = JSON.parse(await readFile(path.join(root, 'research', 'reference_images.json'), 'utf8'));
  const own = (ref.Own_Photographs_Unpublished ?? []).map((o) => path.basename(o.Project_Copy));
  const others = (ref.Images ?? []).map((r) => path.basename(r.File));
  const research = (await walk(path.join(root, 'research'))).filter((f) => IMAGE_EXT.test(f)).map((f) => path.basename(f));
  return new Set([...own, ...others, ...research].map((n) => n.toLowerCase()));
}

test('no withheld or reference-only image exists anywhere under public/', async () => {
  const names = await withheld();
  const found = (await walk(path.join(root, 'public'))).filter((f) => names.has(path.basename(f).toLowerCase()));
  assert.deepEqual(found.map((f) => path.relative(root, f)), []);
});

test('no withheld or reference-only image exists in the built dist/ folder', async () => {
  const names = await withheld();
  const files = await walk(path.join(root, 'dist'));
  const found = files.filter((f) => names.has(path.basename(f).toLowerCase()));
  assert.deepEqual(found.map((f) => path.relative(root, f)), []);
  const researchCopies = files.filter((f) => f.split(path.sep).includes('research'));
  assert.deepEqual(researchCopies.map((f) => path.relative(root, f)), [], 'dist/ must not contain a research folder');
});

test('no data file points at a withheld image or at research/', async () => {
  const names = await withheld();
  const dataDir = path.join(root, 'public', 'data');
  for (const f of (await readdir(dataDir)).filter((n) => n.endsWith('.json'))) {
    const text = await readFile(path.join(dataDir, f), 'utf8');
    const urls = [...text.matchAll(/"([^"]*\.(?:jpe?g|png|gif|webp|heic|tiff?|bmp|avif))"/gi)].map((m) => m[1]);
    for (const u of urls) {
      assert.ok(!names.has(path.basename(u).toLowerCase()), `${f} references withheld image ${u}`);
      assert.ok(!/(^|\/)research\//.test(u), `${f} references a research path ${u}`);
    }
  }
});

test('the development server refuses to serve research/', async () => {
  const cfg = await readFile(path.join(root, 'vite.config.ts'), 'utf8');
  assert.match(cfg, /deny:\s*\[[^\]]*'\*\*\/research\/\*\*'/, "vite.config.ts server.fs.deny must include '**/research/**'");
});

test('the original research photographs are still present (not deleted)', async () => {
  const ref = JSON.parse(await readFile(path.join(root, 'research', 'reference_images.json'), 'utf8'));
  for (const o of ref.Own_Photographs_Unpublished ?? []) {
    const s = await stat(path.join(root, o.Project_Copy));
    assert.ok(s.size > 0, `${o.Project_Copy} is empty`);
  }
});

test('Phase 2: none of the TLDM photographs reviewed (research inventory) is under public/ or dist/, or referenced by the public data', async () => {
  const inv = JSON.parse(await readFile(path.join(root, 'research', 'tldm_reference_inventory.json'), 'utf8'));
  assert.ok(inv.Items.length > 600 && inv.Items.every((i) => /^UNPUBLISHED/.test(i.Publication_Status)));
  const names = new Set(inv.Items.map((i) => String(i.File).split('/').pop().split(' :: ').pop().toLowerCase()));
  const files = [...(await walk(path.join(root, 'public'))), ...(await walk(path.join(root, 'dist')))];
  assert.deepEqual(files.filter((f) => names.has(path.basename(f).toLowerCase())).map((f) => path.relative(root, f)), []);
  const data = (await Promise.all((await readdir(path.join(root, 'public', 'data'))).map((n) => readFile(path.join(root, 'public', 'data', n), 'utf8')))).join('\n');
  assert.ok(!/(gambar kdhangtuah|Album F76\/|OP FAJAR 3_08|keratan akhbar)[^"]*\.(jpe?g|png|heic)/i.test(data.replace(/"Document_Reference": "[^"]*"/g, '')), 'no TLDM image path outside source references');
});

test('v6.2: no blocked file (the third-party hero image of the original project) is under public/ or dist/, under any name', async () => {
  const ref = JSON.parse(await readFile(path.join(root, 'research', 'reference_images.json'), 'utf8'));
  const blocked = new Set((ref.Blocked_Public_Files ?? []).map((b) => b.Sha256));
  assert.ok(blocked.size >= 1);
  const files = [...(await walk(path.join(root, 'public'))), ...(await walk(path.join(root, 'dist')))];
  const hits = [];
  for (const f of files) if (blocked.has(createHash('sha256').update(await readFile(f)).digest('hex'))) hits.push(path.relative(root, f));
  assert.deepEqual(hits, []);
});
