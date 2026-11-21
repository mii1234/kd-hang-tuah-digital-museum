// Checks every JSON file in public/data using the same rules the website uses.
// Run with:  npm run validate-data
// Exit code is 1 if any error is found, so it can also be used before publishing.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data');
const files = {
  events: 'events.json',
  locations: 'locations.json',
  voyages: 'voyages.json',
  routePoints: 'route_points.json',
  components: 'ship_components.json',
  gallery: 'gallery.json',
  sources: 'sources.json',
};

const raw = {};
let parseErrors = 0;
for (const [key, file] of Object.entries(files)) {
  try {
    raw[key] = JSON.parse(await readFile(path.join(dataDir, file), 'utf8'));
  } catch (e) {
    parseErrors++;
    console.error(`ERROR  ${file}: ${e.message}`);
    raw[key] = [];
  }
}
const extras = {};
for (const extra of ['ship.json', 'site_content.json']) {
  try {
    extras[extra] = JSON.parse(await readFile(path.join(dataDir, extra), 'utf8'));
  } catch (e) {
    parseErrors++;
    console.error(`ERROR  ${extra}: ${e.message}`);
  }
}

// Load the TypeScript validator through Vite so the rules are never duplicated.
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { validateData } = await server.ssrLoadModule('/src/data/validate.ts');
  const { checkEventOrder } = await server.ssrLoadModule('/src/data/sortEvents.ts');
  const { checkVerifiedFirst } = await server.ssrLoadModule('/src/data/verifiedFirst.ts');
  const result = validateData(raw);
  const { events, locations, routePoints } = result;
  const ship = extras['ship.json'] ?? {};
  const content = extras['site_content.json'] ?? {};
  // 3D Ship Explorer data (public/data/ship_exterior.json): checked by its own rules; its citations count as citations.
  let extData = null;
  try { extData = JSON.parse(await readFile(path.join(dataDir, 'ship_exterior.json'), 'utf8')); } catch { /* reported below */ }
  const extraCitations = extData ? [...extData.Components, ...(extData.Spaces ?? []), ...extData.Dimensions, ...extData.Configurations, extData.Model].flatMap((x) => x?.Source_IDs ?? []) : [];
  const vf = checkVerifiedFirst({ ...result, ship: { Historical_Names: [], Sections: [], Specifications: [], ...ship }, content, extraCitations });
  const { checkShipExterior } = await server.ssrLoadModule('/src/features/ship3d/exteriorData.ts');
  let exterior = [];
  try {
    const ext = JSON.parse(await readFile(path.join(dataDir, 'ship_exterior.json'), 'utf8'));
    exterior = checkShipExterior(ext, raw.sources).map((i) => ({ level: 'error', file: 'ship_exterior.json', id: i.id, message: i.message }));
  } catch (e) {
    exterior = [{ level: 'error', file: 'ship_exterior.json', message: e.message }];
  }
  const issues = [...result.issues, ...checkEventOrder(events), ...vf, ...exterior];
  for (const i of issues) {
    console.log(`${i.level === 'error' ? 'ERROR ' : 'WARN  '} ${i.file}${i.id ? ` (${i.id})` : ''}: ${i.message}`);
  }
  const errors = issues.filter((i) => i.level === 'error').length + parseErrors;
  const demo = [...events, ...locations, ...routePoints].filter((r) => r.Is_Demo_Data).length;
  console.log(`\n${events.length} events, ${locations.length} locations, ${routePoints.length} route points checked.`);
  console.log(`${demo} records are still marked as demo data.`);
  if (content.Verified_First) console.log(`Verified-First rules checked: ${vf.filter((i) => i.level === 'error').length} error(s), ${vf.filter((i) => i.level === 'warning').length} warning(s).`);
  console.log(errors ? `${errors} error(s) found.` : 'No errors found.');
  process.exitCode = errors ? 1 : 0;
} finally {
  await server.close();
}
