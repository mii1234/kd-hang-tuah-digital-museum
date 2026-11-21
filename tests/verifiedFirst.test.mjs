// Verified-First tests.  Run with:  npm test
// public/data must hold only records supported by their cited sources; research/data must keep every research record.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['events.json', 'sources.json', 'locations.json', 'voyages.json', 'route_points.json', 'ship.json', 'ship_components.json', 'gallery.json'];
const read = async (...p) => JSON.parse(await readFile(path.join(root, ...p), 'utf8'));
let server, checkVerifiedFirst, validateData, pub, res, arc, arc52, content, exteriorCitations = [];

before(async () => {
  server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  ({ checkVerifiedFirst } = await server.ssrLoadModule('/src/data/verifiedFirst.ts'));
  ({ validateData } = await server.ssrLoadModule('/src/data/validate.ts'));
  pub = {}; res = {}; arc = {}; arc52 = {};
  for (const f of FILES) {
    pub[f] = await read('public', 'data', f);
    res[f] = await read('research', 'data', f);
    arc[f] = await read('research', 'archive', 'proposal-v4', f);
    arc52[f] = await read('research', 'archive', 'proposal-v5.2', f);
  }
  content = await read('public', 'data', 'site_content.json');
  // Phase 3: sources cited only by the 3D Ship Explorer data count as cited.
  const ext = await read('public', 'data', 'ship_exterior.json');
  exteriorCitations = [...ext.Components, ...(ext.Spaces ?? []), ...ext.Dimensions, ...ext.Configurations, ext.Model].flatMap((x) => x.Source_IDs ?? []);
});
after(async () => { await server?.close(); });
let privateTerms = [];
before(async () => { privateTerms = (await read('research', 'private-checks.json')).Forbidden_In_Public_Data; });

function publicData(over = {}) {
  const clean = validateData({
    events: over.events ?? pub['events.json'], locations: over.locations ?? pub['locations.json'], voyages: pub['voyages.json'],
    routePoints: pub['route_points.json'], components: over.components ?? pub['ship_components.json'], gallery: pub['gallery.json'],
    sources: over.sources ?? pub['sources.json'],
  });
  return { ...clean, ship: over.ship ?? pub['ship.json'], content: over.content ?? content, extraCitations: exteriorCitations };
}
const errors = (issues) => issues.filter((i) => i.level === 'error');
const clone = (x) => JSON.parse(JSON.stringify(x));

test('the public data passes every Verified-First rule (no errors, no warnings)', () => {
  const issues = checkVerifiedFirst(publicData());
  assert.deepEqual(issues.map((i) => `${i.file} ${i.id}: ${i.message}`), []);
});

test('the checker rejects each kind of violation (negative controls)', () => {
  const ev = clone(pub['events.json']); ev[0].Verification = 'Disputed';
  assert.ok(errors(checkVerifiedFirst(publicData({ events: ev }))).some((i) => i.id === ev[0].Event_ID && /Only Verified/.test(i.message)), 'disputed event');
  const ev2 = clone(pub['events.json']); ev2[0].Source_IDs = ['SRC019'];
  assert.ok(errors(checkVerifiedFirst(publicData({ events: ev2 }))).some((i) => /not relied on/.test(i.message)), 'citation of a not-relied-on source');
  const ev3 = clone(pub['events.json']); ev3[0].Source_IDs = [];
  assert.ok(errors(checkVerifiedFirst(publicData({ events: ev3 }))).some((i) => /cites no source/.test(i.message)), 'uncited event');
  const loc = clone(pub['locations.json']); loc.find((l) => l.Verification === 'Illustrative').Description = 'Waters off Iceland.';
  assert.ok(errors(checkVerifiedFirst(publicData({ locations: loc }))).some((i) => /not a recorded position/.test(i.message)), 'unlabelled illustrative pin');
  const ship = clone(pub['ship.json']); ship.Specifications.find((s) => !s.Value).Value = '103.5 m';
  assert.ok(errors(checkVerifiedFirst(publicData({ ship }))).some((i) => /Only Verified/.test(i.message)), 'unconfirmed specification with a value');
  const src = clone(pub['sources.json']); src.find((s) => s.Relied_On === false).Relied_On = true;
  assert.ok(checkVerifiedFirst(publicData({ sources: src })).some((i) => i.level === 'warning' && /no public record cites it/.test(i.message)), 'uncited relied-on source');
  const c = clone(content); c.Planned_Opening.Status = 'Completed';
  assert.ok(errors(checkVerifiedFirst(publicData({ content: c }))).some((i) => i.id === 'Planned_Opening'), 'planned opening presented as completed');
});

test('every public record also exists in the research register', () => {
  const key = { 'events.json': 'Event_ID', 'sources.json': 'Source_ID', 'locations.json': 'Location_ID', 'route_points.json': 'Route_Point_ID', 'ship_components.json': 'Component_ID', 'voyages.json': 'Voyage_ID' };
  for (const [f, k] of Object.entries(key)) {
    const ids = new Set(res[f].map((r) => r[k]));
    const missing = pub[f].filter((r) => !ids.has(r[k])).map((r) => r[k]);
    assert.deepEqual(missing, [], f);
  }
});

test('the v5.2 research register (archived) keeps every Proposal v4 record unchanged, apart from Public_Status/Public_Note and the approved D9 change', () => {
  const strip = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'Public_Status' || k === 'Public_Note' ? undefined : v)));
  for (const f of FILES) {
    let r = strip(arc52[f]); const a = clone(arc[f]);
    if (f === 'sources.json') {
      // v5.2 adds three sources for N4 (approved 16 October 2026); every v4 source is still present and unchanged.
      const added = r.slice(a.length).map((x) => x.Source_ID);
      assert.deepEqual(added, ['SRC035', 'SRC036', 'SRC037']);
      r = r.slice(0, a.length);
    }
    if (f === 'ship_components.json') {
      const cmp = a.find((c) => c.Component_ID === 'CMP036');
      assert.equal(cmp.Verification, 'Verified');
      cmp.Verification = 'Needs Verification'; // D9, approved 16 October 2026
    }
    assert.deepEqual(r, a, f);
  }
  const rec = (f) => (Array.isArray(res[f]) ? res[f] : []);
  for (const f of FILES.filter((x) => x !== 'ship.json')) {
    assert.ok(rec(f).every((x) => typeof x.Public_Status === 'string'), `${f}: every research record states its Public_Status`);
  }
});

// Undo every Change_Log entry (newest first) and drop records added in v6; the result must equal the archived v5.2 register.
function undo(x) {
  if (Array.isArray(x)) return x.filter((y) => !(y && Array.isArray(y.Change_Log) && y.Change_Log.some((c) => c.Field === '(record added)'))).map(undo);
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) {
    if (k === 'Change_Log') continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.Change_Log) && v.Change_Log.some((c) => c.Field === '(record added)')) continue;
    o[k] = undo(v);
  }
  for (const c of [...(x.Change_Log ?? [])].reverse()) {
    if (c.Field === '(record added)') continue;
    if (c.Before === '(absent)') delete o[c.Field]; else o[c.Field] = clone(c.Before);
  }
  return o;
}
test('Phase 2 (v6, v6.1): every change to the research register is logged — undoing the Change_Log gives back the v5.2 register exactly', () => {
  for (const f of FILES) assert.deepEqual(undo(clone(res[f])), arc52[f], f);
  for (const f of FILES) {
    for (const r of Array.isArray(res[f]) ? res[f] : []) for (const c of r.Change_Log ?? []) {
      assert.match(c.Version, /^(v6(\.[12])?|3d-p3)$/); // 3d-p3: sources added by the 3D Ship Explorer Phase 3 assert.ok(c.Evidence && c.Decision, `${f}: change without evidence or decision`);
    }
  }
});

test('Phase 2: new sources start at SRC038, are not duplicates, and trace to a file (and page or clipping) in the TLDM folder', () => {
  const src = res['sources.json'];
  const ids = src.map((s) => s.Source_ID);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate Source_ID');
  const titles = src.map((s) => s.Source_Title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, 'no duplicate source title');
  const added = src.slice(arc52['sources.json'].length).filter((s) => !/3D Phase 3/.test(s.Phase1_Ref ?? ''));
  assert.deepEqual(added.map((s) => s.Source_ID), Array.from({ length: 20 }, (_, i) => `SRC0${38 + i}`));
  // 3D Ship Explorer Phase 3: two exhibition boards and the site-visit photographs, added after SRC057
  const p3 = src.slice(arc52['sources.json'].length).filter((s) => /3D Phase 3/.test(s.Phase1_Ref ?? ''));
  assert.deepEqual(p3.map((s) => s.Source_ID), ['SRC058', 'SRC059', 'SRC060']);
  for (const s of p3) assert.match(s.Document_Reference, /gambar kdhangtuah\//, `${s.Source_ID}: file reference`);
  for (const s of added) assert.match(s.Document_Reference, /gambar kdhangtuah\//, `${s.Source_ID}: file reference`);
  assert.ok(added.every((s) => !/RESTRICTED|EQUIPMENT LIST|borang/i.test(JSON.stringify(s))), 'no restricted or personal file is a source');
});

test('Phase 2 decisions D-01 to D-08 are applied to the public data', () => {
  const ev = Object.fromEntries(pub['events.json'].map((e) => [e.Event_ID, e]));
  const loc = Object.fromEntries(pub['locations.json'].map((l) => [l.Location_ID, l]));
  // D-01
  assert.equal(ev.EVT016.Date, '1977-07-22'); assert.equal(ev.EVT016.Location_ID, 'LOC004'); assert.match(ev.EVT016.Description, /at Southampton on 22 July 1977/);
  for (const id of ['LOC004', 'LOC007', 'LOC008', 'LOC010']) assert.equal(loc[id].Verification, 'Verified', id);
  assert.equal(loc.LOC010.Country, 'United Arab Emirates'); assert.match(loc.LOC010.Description, /Abu Dhabi is in the United Arab Emirates/);
  assert.equal(loc.LOC018.Verification, 'Illustrative'); assert.match(loc.LOC018.Description, /not a recorded position/);
  assert.ok(!pub['route_points.json'].some((p) => p.Location_ID === 'LOC018'), 'Tunisia is a pin only, not a route stop');
  const stops = pub['voyages.json'][0].Route_Point_IDs;
  for (const id of ['RPT006', 'RPT012', 'RPT029']) assert.ok(stops.includes(id), id);
  assert.ok(res['route_points.json'].find((p) => p.Route_Point_ID === 'RPT029').Change_Log.some((c) => c.Field === 'Notes' ? false : true) && /Abu Dabi, Saudi Arabia/.test(arc52['route_points.json'].find((p) => p.Route_Point_ID === 'RPT029').Notes), 'map label preserved in research');
  // D-02
  assert.equal(ev.EVT015.Date, '1977-05-16'); assert.ok(ev.EVT015.Source_IDs.includes('SRC038'));
  assert.ok(res['events.json'].find((e) => e.Event_ID === 'EVT015').Alternative_Dates.some((a) => a.Date === '1977-04'), 'April kept in research');
  // D-03
  for (const id of ['EVT009', 'EVT012']) assert.ok(ev[id], id);
  assert.ok(!ev.EVT001, 'EVT001 has no confirmed date, so it stays off the timeline');
  const spec = Object.fromEntries(pub['ship.json'].Specifications.map((s) => [s.Key, s]));
  assert.equal(spec.length.Value, '103.5 m'); assert.equal(spec.draught.Value, '4.9 m'); assert.equal(spec.crew.Value, '', 'crew stays a placeholder (Disputed)');
  // D-04
  const svc = pub['ship.json'].Sections.find((s) => s.Section_ID === 'malaysian-service');
  assert.match(svc.Body, /Training Flotilla/); assert.match(svc.Body, /IMO/); assert.ok(svc.Source_IDs.includes('SRC038'));
  // D-05
  assert.ok(ev.EVT029 && ev.EVT029.Date === '2009-02-04' && ev.EVT029.End_Date === '2009-05-14' && ev.EVT029.Location_ID === null);
  assert.ok(!/singgah/.test(JSON.stringify(ev.EVT029)) && privateTerms.every((t) => !JSON.stringify(ev.EVT029).includes(t)), 'v6.1: no handover location or port calls');
  assert.ok(!loc.LOC026, 'v6.1: Aden pin withheld');
  // D-06
  assert.ok(!ev.EVT025); assert.equal(res['events.json'].find((e) => e.Event_ID === 'EVT025').Verification, 'Disputed');
  assert.ok(!JSON.stringify(pub).includes('22 August 1995'), 'disputed contract date not shown');
  // D-07
  const cmp = Object.fromEntries(pub['ship_components.json'].map((c) => [c.Component_ID, c]));
  assert.equal(cmp.CMP016.Component_Name_MS, 'Bilik Kuliah'); assert.equal(cmp.CMP035.Component_Name_MS, 'Anjungan Latihan');
  assert.ok(!cmp.CMP023.Component_Name_MS, 'uncertain name not applied');
  assert.ok(!cmp.CMP024, 'ship\'s office withheld: deck conflict');
  // D-08
  const co = pub['ship.json'].Commanding_Officers;
  assert.equal(co.Entries.length, 39); assert.match(co.Note, /may not be complete/);
  assert.equal(co.Gaps.length, 3); assert.equal(co.Overlaps.length, 2);
  assert.ok(!/N\/?\d{5,}|\b\d{6,}\b/.test(JSON.stringify(co)), 'no service numbers');
});

test('v6.1: public source descriptions contain no local paths, archive names or file names; the research register keeps them', () => {
  const pat = /\.(jpe?g|png|heic|pdf|docx?|zip|txt|xlsx)\b|::|gambar kdhangtuah|keratan akhbar|Desktop|IMG_\d/i;
  for (const s of pub['sources.json']) for (const k of ['Source_Title', 'Author_or_Organisation', 'Document_Reference', 'Verification_Notes', 'Rights_Status']) {
    assert.ok(!pat.test(s[k] ?? ''), `${s.Source_ID} ${k}: ${s[k]}`);
  }
  const r = Object.fromEntries(res['sources.json'].map((s) => [s.Source_ID, s]));
  for (const id of ['SRC038', 'SRC041', 'SRC052']) assert.match(r[id].Document_Reference, /gambar kdhangtuah\//, `${id}: original reference kept in research`);
});

test('v6.1: Malay corrections applied without changing dates', () => {
  const ev = Object.fromEntries(pub['events.json'].map((e) => [e.Event_ID, e]));
  assert.ok(!/bertembung|perlanggaran/i.test(ev.EVT012.Description_MS)); assert.match(ev.EVT012.Description_MS, /berhadapan/);
  assert.equal(ev.EVT015.Event_Title_MS, 'Mula berkhidmat dalam TLDM'); assert.equal(ev.EVT015.Date, '1977-05-16'); assert.equal(ev.EVT016.Date, '1977-07-22');
  assert.match(ev.EVT016.Description_MS, /nombor penant F76/); // TLDM spelling (SRC038 pp.2, 5)
  assert.equal(ev.EVT041.Event_Title_MS, 'Kerja slipping selesai'); // TLDM term kept
});

test('owner decisions D1–D9 are reflected in the public data', () => {
  const ev = Object.fromEntries(pub['events.json'].map((e) => [e.Event_ID, e]));
  const all = JSON.stringify(pub);
  // D1
  assert.equal(ev.EVT016.Date, '1977-07-22'); // D1 was superseded by D-01 (Phase 2): Southampton now rests on SRC038, SRC044 and SRC052
  // D2
  assert.match(ev.EVT019.Description, /members of the LLP/);
  assert.ok(!/Armed Forces Council/i.test(all));
  // D3 was superseded by D-01 (Phase 2); the map label is still preserved in the research register
  assert.ok(res['route_points.json'].some((p) => p.Route_Point_ID === 'RPT029' && /Abu Dabi, Saudi Arabia/.test(p.Notes)), 'discrepancy preserved in research');
  // D4
  const iceland = pub['locations.json'].find((l) => l.Location_ID === 'LOC006');
  assert.equal(iceland.Verification, 'Illustrative');
  assert.ok(iceland.Description.startsWith('Illustrative sea area — not a recorded position.'));
  // D5
  const svc = pub['ship.json'].Sections.find((s) => s.Section_ID === 'malaysian-service');
  assert.ok(['SRC006', 'SRC007'].every((s) => svc.Source_IDs.includes(s))); // D5 extended by D-04 (Phase 2)
  assert.match(svc.Body, /9 September 1984/); assert.match(svc.Body, /21st Frigate Squadron/);
  assert.ok(!/flagship|Rahmat|1992|1980s|Malindo|Kakadu|LIMA/.test(svc.Body));
  // D6
  assert.ok(!ev.EVT033, 'the planned opening is not on the timeline');
  assert.equal(content.Planned_Opening.Status, 'Planned');
  assert.deepEqual(content.Planned_Opening.Source_IDs, ['SRC012', 'SRC013', 'SRC014']);
  assert.ok(res['events.json'].some((e) => e.Event_ID === 'EVT033'));
  // D7
  const further = pub['sources.json'].filter((s) => s.Relied_On === false);
  assert.equal(further.length, 19); // 15 in v5.2, plus SRC053, SRC054, SRC057 (research only) and SRC055 (v6.1: no longer cited)
  assert.ok(further.some((s) => s.Source_ID === 'SRC026'), 'Wikipedia (Woodlands) is a further reference after N4');
  assert.equal(pub['sources.json'].length, res['sources.json'].length, 'every source is listed, relied on or not');
  // D8
  assert.ok(pub['events.json'].every((e) => e.Verification === 'Verified' && (e.Alternative_Dates ?? []).length === 0));
  for (const id of ['EVT011', 'EVT023', 'EVT025', 'EVT028', 'EVT042', 'EVT043', 'EVT044', 'EVT045']) assert.ok(!ev[id], id); // EVT012, EVT015 and EVT029 published by D-02, D-03, D-05
  // D9
  assert.ok(!pub['ship_components.json'].some((c) => c.Component_ID === 'CMP036'));
  assert.equal(res['ship_components.json'].find((c) => c.Component_ID === 'CMP036').Verification, 'Needs Verification');
});

test('details found unsupported in the audit are not published', () => {
  const all = JSON.stringify(pub);
  // Operational terms excluded by D-05 are listed in research/private-checks.json (never published), so tests/ does not itself list them.
  for (const phrase of ['full military honours', 'light helicopter', 'no hangar', 'Third Cod War', 'February 1966', 'Ops Fajar in', 'collisions with Icelandic', 'collision damage',
    'Duta Besar', 'Pesuruhjaya', 'RESTRICTED', ...privateTerms]) {
    assert.ok(!all.includes(phrase), `public data contains "${phrase}"`);
  }
  const colombo = pub['route_points.json'].find((p) => p.Route_Point_ID === 'RPT036');
  assert.equal(colombo.Date, '1977-10-09'); // the recorded departure (SRC041, SRC042), no longer only the planned ETD
  assert.ok(colombo.Source_IDs.includes('SRC041') && colombo.Source_IDs.includes('SRC042'));
});

test('research/ is not shipped: no research data file is under public/', async () => {
  const names = await readdir(path.join(root, 'public', 'data'));
  assert.ok(!names.some((n) => /research|archive/i.test(n)));
});

test('N4 applied to Woodlands and N5 not applied to Lumut; originals preserved in the research register', async () => {
  const cr = await read('research', 'data', 'coordinate_review.json');
  const rec = Object.fromEntries(cr.Records.map((r) => [r.Location_ID, r]));
  for (const r of cr.Records) {
    assert.ok(r.Evidence.length >= 2 && r.Evidence.every((e) => /^https:\/\//.test(e.URL)), `${r.Location_ID}: evidence with source URLs`);
    assert.ok(r.Evidence.some((e) => !/wikipedia\.org/.test(e.URL)), `${r.Location_ID}: at least one non-Wikipedia source`);
  }
  assert.equal(rec.LOC015.Decision.Outcome, 'Approved');
  assert.match(rec.LOC016.Status, /^Needs Verification/, 'the Lumut candidate is not upgraded');
  const pub = Object.fromEntries(pub_locs().map((l) => [l.Location_ID, l]));
  const resL = Object.fromEntries(res['locations.json'].map((l) => [l.Location_ID, l]));
  const v4 = Object.fromEntries(arc['locations.json'].map((l) => [l.Location_ID, l]));
  // N4
  assert.deepEqual([pub.LOC015.Latitude, pub.LOC015.Longitude], [1.452821, 103.7785]);
  assert.match(pub.LOC015.Description, /shore end of the former base jetty, now Woodlands Waterfront Jetty/);
  assert.match(pub.LOC015.Description, /not KD Hang Tuah's berth/);
  for (const s of ['SRC035', 'SRC036']) assert.ok(pub.LOC015.Source_IDs.includes(s), s);
  assert.ok(!pub.LOC015.Source_IDs.includes('SRC026'));
  assert.equal(pub_src().find((s) => s.Source_ID === 'SRC026').Relied_On, false);
  const stop = pub_rp().find((p) => p.Route_Point_ID === 'RPT046');
  assert.deepEqual([stop.Latitude, stop.Longitude], [1.452821, 103.7785], 'voyage end stop drawn at the same pin');
  assert.deepEqual([resL.LOC015.Latitude, resL.LOC015.Longitude], [v4.LOC015.Latitude, v4.LOC015.Longitude], 'original Woodlands coordinate kept in research');
  // N5
  assert.deepEqual([pub.LOC016.Latitude, pub.LOC016.Longitude], [v4.LOC016.Latitude, v4.LOC016.Longitude], 'Lumut public pin unchanged');
  assert.match(pub.LOC016.Description, /Provisional pin: .*not been independently verified/);
  assert.match(content.Home_Coordinates.Note, /not independently verified/);
  assert.ok(!JSON.stringify(pub_locs()).includes('4.237654') && !JSON.stringify(pub_locs()).includes('4.237655'), 'Lumut candidate not in public data');
});
const pub_locs = () => pub['locations.json'];
const pub_src = () => pub['sources.json'];
const pub_rp = () => pub['route_points.json'];

test('v6.2: every public place says what its coordinates represent, consistently with its description; the checker enforces it', () => {
  for (const l of pub['locations.json']) {
    assert.ok(l.Coordinate_Basis && l.Coordinate_Basis_MS, `${l.Location_ID}: Coordinate_Basis`);
    if (l.Verification === 'Illustrative') assert.match(l.Coordinate_Basis, /not a recorded position/);
    else assert.match(l.Coordinate_Basis, /not the ship's berth|base berth not recorded|not independently verified/, l.Location_ID);
  }
  const loc = clone(pub['locations.json']); delete loc[0].Coordinate_Basis;
  assert.ok(errors(checkVerifiedFirst(publicData({ locations: loc }))).some((i) => i.id === loc[0].Location_ID && /Coordinate_Basis/.test(i.message)), 'negative control');
});

test('v6.2: page texts with historical statements cite relied-on sources; the operational-terms list is present in research/', () => {
  const pts = content.Page_Text_Sources;
  for (const k of ['legacy_body', 'hero_intro', 'home_legacy_body', 'visit_body', 'ship_summary']) assert.ok(pts[k]?.length, k);
  const relied = new Set(pub['sources.json'].filter((s) => s.Relied_On).map((s) => s.Source_ID));
  for (const [k, ids] of Object.entries(pts)) for (const id of ids) assert.ok(relied.has(id), `${k}: ${id}`);
  assert.match(content.Home_Coordinates.Label, /provisional/);
  assert.ok(privateTerms.length >= 10);
});
