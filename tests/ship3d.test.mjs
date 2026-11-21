// 3D Ship Explorer: the component data must follow the Verified-First rules, match the model file,
// and use the recorded dimensions without reinterpreting them. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (...p) => JSON.parse(await readFile(path.join(root, ...p), 'utf8'));
const MODEL = path.join(root, 'public', 'models', 'kd-hang-tuah-exterior.glb');

async function glbJson() {
  const b = await readFile(MODEL);
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(b.readUInt32LE(4), 2, 'glTF 2.0');
  const len = b.readUInt32LE(12);
  assert.equal(b.readUInt32LE(16), 0x4e4f534a, 'first chunk is JSON');
  return JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
}

test('3D model: a self-contained GLB under 4 MB, no textures or images, no external files', async () => {
  const s = await stat(MODEL);
  assert.ok(s.size > 50_000 && s.size < 4_000_000, `size ${s.size}`);
  const g = await glbJson();
  assert.ok(!g.images && !g.textures, 'no images or textures are embedded');
  assert.ok(g.buffers.every((b) => !b.uri), 'no external buffer');
  const tris = g.meshes.reduce((n, m) => n + (m.primitives[0].indices !== undefined ? g.accessors[m.primitives[0].indices].count : g.accessors[m.primitives[0].attributes.POSITION].count) / 3, 0);
  assert.ok(tris < 120_000, `${tris} triangles`);
  const names = await readdir(path.join(root, 'public', 'models'));
  assert.deepEqual(names, ['kd-hang-tuah-exterior.glb'], 'public/models holds only the model');
});

test('3D model: built to the recorded length overall, beam and draught', async () => {
  const g = await glbJson();
  const box = (names) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const m of g.meshes.filter((m) => names.includes(m.name))) {
      const a = g.accessors[m.primitives[0].attributes.POSITION];
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k]); max[k] = Math.max(max[k], a.max[k]); }
    }
    return { min, max };
  };
  const hull = box(['hull_topside', 'hull_boottop', 'hull_bottom']);
  assert.ok(Math.abs(hull.max[0] - hull.min[0] - 103.5) < 0.05, `length ${hull.max[0] - hull.min[0]}`);
  assert.ok(Math.abs(hull.max[2] - hull.min[2] - 12.2) < 0.05, `beam ${hull.max[2] - hull.min[2]}`);
  assert.ok(Math.abs(-hull.min[1] - 4.9) < 0.05, `draught ${-hull.min[1]}`);
});

test('3D model: shared hull, and the two configurations as separate node groups', async () => {
  const g = await glbJson();
  const node = (n) => g.nodes.find((x) => x.name === n);
  for (const n of ['shared', 'config_as_built', 'config_later']) assert.ok(node(n), n);
  const kids = (n) => node(n).children.map((i) => g.nodes[i].name);
  assert.ok(kids('shared').includes('hull_topside') && !kids('config_as_built').some((n) => n.startsWith('hull')) && !kids('config_later').some((n) => n.startsWith('hull')), 'one hull, shared');
  assert.ok(kids('config_as_built').includes('gun_4in_twin') && kids('config_as_built').includes('limbo_mk10') && kids('config_as_built').includes('std_director'));
  assert.ok(kids('config_later').includes('gun_57mm') && kids('config_later').includes('gun_40mm_port') && kids('config_later').includes('gun_40mm_starboard') && kids('config_later').includes('training_bridge'));
  assert.ok(!kids('config_later').includes('limbo_mk10') && !kids('config_as_built').includes('gun_57mm'));
});

// Same rules as src/features/ship3d/exteriorData.ts → checkShipExterior (which npm run validate-data runs).
function componentErrors(d, sources, meshes) {
  const errs = [];
  const ids = new Set(d.Components.map((c) => c.Component_ID));
  if (ids.size !== d.Components.length) errs.push('duplicate IDs');
  for (const c of d.Components) {
    if (c.Verification !== 'Verified') errs.push(`${c.Component_ID}: not Verified`);
    if (!c.Source_IDs?.length) errs.push(`${c.Component_ID}: no source`);
    for (const s of c.Source_IDs ?? []) if (!sources.has(s) || sources.get(s).Relied_On === false) errs.push(`${c.Component_ID}: ${s} missing or not relied on`);
    if (!c.Meshes?.length || !c.Meshes.every((m) => meshes.has(m))) errs.push(`${c.Component_ID}: mesh missing`);
    if (!(c.Model_Accuracy?.trim().length > 10)) errs.push(`${c.Component_ID}: no accuracy note`);
    if (!['shared', 'as_built', 'later'].includes(c.Config)) errs.push(`${c.Component_ID}: bad config`);
    if (c.Counterpart_ID && !ids.has(c.Counterpart_ID)) errs.push(`${c.Component_ID}: counterpart missing`);
    if (!(c.Imagery ?? []).every((i) => i.Approved === true)) errs.push(`${c.Component_ID}: unapproved imagery`);
    if ((c.Anchor_Meshes ?? []).some((m) => !c.Meshes.includes(m))) errs.push(`${c.Component_ID}: anchor mesh not among its meshes`);
  }
  const used = d.Components.flatMap((c) => c.Meshes);
  if (new Set(used).size !== used.length) errs.push('a mesh is used by two components');
  return errs;
}
const fixtures = async () => ({
  d: await read('public', 'data', 'ship_exterior.json'),
  sources: new Map((await read('public', 'data', 'sources.json')).map((s) => [s.Source_ID, s])),
  meshes: new Set((await glbJson()).meshes.map((m) => m.name)),
});

test('3D explorer data: every component is Verified, cites relied-on sources and names meshes that exist', async () => {
  const { d, sources, meshes } = await fixtures();
  assert.deepEqual(componentErrors(d, sources, meshes), []);
  for (const cfg of d.Configurations) for (const s of cfg.Source_IDs) assert.ok(sources.get(s)?.Relied_On !== false);
});

test('3D explorer data rules reject an unsourced, unverified or unapproved component (negative control)', async () => {
  const { d, sources, meshes } = await fixtures();
  const bad = structuredClone(d);
  bad.Components[0].Source_IDs = ['SRC019']; // Wikipedia: listed but not relied on
  bad.Components[1].Verification = 'Needs Verification';
  bad.Components[2].Imagery = [{ Image_ID: 'X', Caption: 'x', Approved: false }];
  bad.Components[3].Meshes = ['no_such_mesh'];
  const errs = componentErrors(bad, sources, meshes);
  assert.equal(errs.length, 4, errs.join('; '));
});

test('3D explorer data: dimensions are the recorded figures; Height has no measurement line', async () => {
  const d = await read('public', 'data', 'ship_exterior.json');
  const ship = await read('public', 'data', 'ship.json');
  const spec = Object.fromEntries(ship.Specifications.map((s) => [s.Key, s.Value]));
  const dim = Object.fromEntries(d.Dimensions.map((x) => [x.Key, x]));
  assert.ok(spec.length.startsWith('103.5 m') && dim.length.Value_m === 103.5 && dim.length.Line === 'length_overall');
  assert.ok(spec.beam.startsWith('12.2 m') && dim.beam.Value_m === 12.2 && dim.beam.Line === 'beam_max');
  assert.ok(spec.draught.startsWith('4.9 m') && dim.draught.Value_m === 4.9 && dim.draught.Line === 'draught');
  assert.ok(spec.height.startsWith('22.05 m') && dim.height.Value_m === 22.05);
  assert.equal(dim.height.Line, null, 'what "Tinggi" measures is not recorded, so no line is drawn');
  for (const x of d.Dimensions) { assert.equal(x.Verification, 'Verified'); assert.ok(x.Source_IDs.includes('SRC038')); assert.ok(x.Mapping_Note.length > 20); }
});

test('3D explorer data: the later configuration is labelled as undated, and the comparison is not a dated claim', async () => {
  const d = await read('public', 'data', 'ship_exterior.json');
  const later = d.Configurations.find((c) => c.Config_ID === 'later');
  assert.equal(later.Label, 'Later TLDM configuration – exact change date unverified');
  assert.match(d.Comparison_Note, /not claim/i);
  assert.match(d.Comparison_Note, /same time/i);
  // no change date is invented for the guns
  const text = JSON.stringify(d);
  assert.ok(!/57 ?mm[^"]{0,80}\b(19[89]\d|20[0-2]\d)\b/.test(text.replace(/2000 as the last year[^"]*/g, '').replace(/2022/g, '')), 'no year attached to the 57 mm gun');
  assert.ok(d.Model.Note.includes('approximate') && d.Model.Note.includes('not an exact replica'));
});

test('3D explorer: the TLDM reference images used for modelling are not in the project', async () => {
  const inv = await read('research', 'tldm_reference_inventory.json');
  const names = new Set(inv.Items.map((i) => String(i.File).split('/').pop().split(' :: ').pop().toLowerCase()));
  for (const extra of ['f76-hms-mermaid-side view.jpg', 'kd_hang_tuah_labuan_20070915.jpg', 'pengenalan kd hang tuah f76.pptx.pdf']) names.add(extra);
  const walk = async (dir) => (await readdir(dir, { withFileTypes: true }).catch(() => [])).flatMap((e) => e.isDirectory() ? [] : [path.join(dir, e.name)]);
  const files = [...(await walk(path.join(root, 'public', 'models'))), ...(await walk(path.join(root, 'public', 'data')))];
  assert.deepEqual(files.filter((f) => names.has(path.basename(f).toLowerCase())), []);
});

// ---- Phase 2
async function glbMesh(name) {
  const b = await readFile(MODEL);
  const jl = b.readUInt32LE(12), g = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  const binStart = 20 + jl + 8;
  const m = g.meshes.find((x) => x.name === name);
  assert.ok(m, `mesh ${name} exists`);
  const acc = (i) => { const a = g.accessors[i], v = g.bufferViews[a.bufferView], off = binStart + (v.byteOffset ?? 0);
    const T = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
    const n = a.count * (a.type === 'VEC3' ? 3 : 1); return new T(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + n * T.BYTES_PER_ELEMENT)); };
  const p = m.primitives[0];
  return { pos: acc(p.attributes.POSITION), idx: p.indices !== undefined ? acc(p.indices) : null };
}
function pointTriDist(p, a, b, c) {
  // distance from p to triangle abc (Ericson, Real-Time Collision Detection 5.1.5)
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap); let q;
  if (d1 <= 0 && d2 <= 0) q = a; else {
    const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b; else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]; } else {
        const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c; else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]; } else {
              const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]; } } } } } }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

test('Phase 2: pennant marking on both sides of the forward hull, painted onto the hull surface', async () => {
  const hull = await glbMesh('hull_topside');
  const tris = [];
  for (let i = 0; i < hull.idx.length; i += 3) { const t = [0, 1, 2].map((k) => [hull.pos[hull.idx[i + k] * 3], hull.pos[hull.idx[i + k] * 3 + 1], hull.pos[hull.idx[i + k] * 3 + 2]]); if (t.some((v) => v[0] > 30)) tris.push(t); }
  for (const name of ['pennant_f76_port', 'pennant_f76_starboard', 'pennant_76_port', 'pennant_76_starboard']) {
    const { pos } = await glbMesh(name);
    let worst = 0, minX = Infinity, maxX = -Infinity, sideOk = true;
    for (let i = 0; i < pos.length; i += 3) {
      const p = [pos[i], pos[i + 1], pos[i + 2]]; minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      if (name.endsWith('port') ? p[2] >= 0 : p[2] <= 0) sideOk = false;
      if (i % 9 === 0) { let best = Infinity; for (const t of tris) if (Math.abs(t[0][0] - p[0]) < 2.5) best = Math.min(best, pointTriDist(p, ...t)); worst = Math.max(worst, best); }
    }
    assert.ok(sideOk, `${name} is on the ${name.endsWith('port') ? 'port' : 'starboard'} side`);
    assert.ok(minX > 30 && maxX < 46, `${name} is on the forward hull (model x ${minX.toFixed(1)}–${maxX.toFixed(1)})`);
    assert.ok(worst < 0.08, `${name} lies on the hull surface (largest gap ${worst.toFixed(3)} m)`);
  }
  const g = await glbJson();
  const kids = (n) => g.nodes.find((x) => x.name === n).children.map((i) => g.nodes[i].name);
  assert.ok(kids('config_as_built').includes('pennant_f76_port') && kids('config_later').includes('pennant_76_port'), 'F76 as built, 76 later (as in the photographs)');
  const d = await read('public', 'data', 'ship_exterior.json');
  const p = d.Components.find((c) => c.Name_MS === 'Nombor penant');
  assert.ok(p && p.Meshes.includes('pennant_f76_port') && p.Description.includes('F76'), 'the pennant number part keeps the TLDM term "nombor penant"');
});

test('Phase 2: railings are separate named parts that follow the deck levels', async () => {
  const g = await glbJson();
  const rails = g.meshes.filter((m) => m.name.startsWith('railing_')).map((m) => m.name);
  for (const n of ['railing_forecastle', 'railing_main_deck_port', 'railing_main_deck_starboard', 'railing_quarterdeck', 'railing_01_deck', 'railing_02_deck', 'railing_bridge', 'railing_foremast_platforms']) assert.ok(rails.includes(n), n);
  const yRange = (name) => { const m = g.meshes.find((x) => x.name === name), a = g.accessors[m.primitives[0].attributes.POSITION]; return [a.min[1], a.max[1]]; };
  const [mdLo, mdHi] = yRange('railing_main_deck_port'), [fcLo] = yRange('railing_forecastle'), [r1Lo] = yRange('railing_01_deck'), [r2Lo] = yRange('railing_02_deck');
  assert.ok(mdLo > 4.0 && mdLo < 4.7 && mdHi - mdLo < 2.0, `main-deck railing sits on the deck edge (${mdLo.toFixed(2)}–${mdHi.toFixed(2)} m)`);
  assert.ok(fcLo > 4.4, 'forecastle railing follows the sheer');
  assert.ok(r1Lo > 7.4 && r2Lo > 10.3, 'upper-deck railings sit on their own levels');
  const d = await read('public', 'data', 'ship_exterior.json');
  const comp = d.Components.find((c) => c.Meshes.includes('railing_forecastle'));
  assert.ok(comp && rails.every((r) => comp.Meshes.includes(r)), 'every railing group belongs to the railings part');
});

test('Phase 2: every model part belongs to exactly one component; structural and internal parts are conceptual', async () => {
  const g = await glbJson();
  const d = await read('public', 'data', 'ship_exterior.json');
  const used = d.Components.flatMap((c) => c.Meshes);
  assert.deepEqual(g.meshes.map((m) => m.name).filter((n) => !used.includes(n)), [], 'no unmapped mesh');
  const internalNodes = g.nodes.find((x) => x.name === 'internal_conceptual').children.map((i) => g.nodes[i].name);
  for (const c of d.Components.filter((x) => x.Layer === 'structural' || x.Layer === 'internal')) {
    assert.match(c.Model_Accuracy, /conceptual|approximate/i, `${c.Component_ID} says it is conceptual`);
    assert.ok(c.Meshes.every((m) => internalNodes.includes(m)), `${c.Component_ID} is in the internal group`);
  }
  const engine = d.Components.find((c) => c.Meshes.includes('compartment_engine_room'));
  assert.equal(engine.Related_Space_ID, 'CMP039');
  assert.match(engine.Model_Accuracy, /conceptual/i);
  // Phase 3: machinery appears only as interior parts of the engine room, labelled approximate (see the Phase 3 tests).
  const interiorNodes = g.nodes.find((x) => x.name === 'interior_spaces').children.map((i) => g.nodes[i].name);
  assert.ok(g.meshes.filter((m) => /engine|gearbox|generator/i.test(m.name) && !m.name.startsWith('compartment_')).every((m) => interiorNodes.includes(m.name)), 'machinery only in the interior group');
});

// ---------------------------------------------------------------- Phase 3
const meshInfo = (g, name) => {
  const m = g.meshes.find((x) => x.name === name); assert.ok(m, `mesh ${name}`);
  const a = g.accessors[m.primitives[0].attributes.POSITION];
  const node = g.nodes.find((n) => n.name === name);
  return { min: a.min, max: a.max, extras: node.extras };
};
const groupOf = (g, groupNode) => g.nodes.find((x) => x.name === groupNode).children.map((i) => g.nodes[i].name);
const MID = 103.5 / 2;

test('Phase 3: main bridge on the 01 deck, training bridge one level above it on the 02 deck, ceremonial platform forward of it', async () => {
  const g = await glbJson();
  const ROOF01 = 7.6, ROOF02 = 10.5;
  const br = meshInfo(g, 'bridge'), tb = meshInfo(g, 'training_bridge'), cp = meshInfo(g, 'ceremonial_platform'), sup = meshInfo(g, 'superstructure');
  assert.ok(Math.abs(br.min[1] - (ROOF01 - 0.12)) < 0.05 && br.max[1] < ROOF02 + 0.1, `main bridge spans the 01 deck level (${br.min[1].toFixed(2)}–${br.max[1].toFixed(2)} m)`);
  assert.ok(br.max[0] + MID > 83.9 && br.max[0] + MID < 84.6, 'main bridge front at the forward end of the 01 deck house');
  assert.ok(Math.abs(tb.min[1] - ROOF02) < 0.06 && tb.max[1] < 13.1, `training bridge stands on the 02 deck (${tb.min[1].toFixed(2)} m)`);
  const len = tb.max[0] - tb.min[0], wid = tb.max[2] - tb.min[2];
  assert.ok(Math.abs(len - 5.6) < 0.25 && Math.abs(wid - 3.24) < 0.2, `training bridge about 5.6 m x 3.2 m (${len.toFixed(2)} x ${wid.toFixed(2)})`);
  const frame = (f) => 101.8 - 1.372 * f - MID;
  assert.ok(Math.abs(tb.min[0] - frame(20)) < 0.4 && tb.max[0] < frame(15.8), 'training bridge at frames 20 to about 16 (02 Signal Deck plan)');
  assert.ok(cp.min[0] < tb.max[0] && cp.max[0] > tb.max[0] + 3 && Math.abs(cp.min[1] - ROOF02) < 0.05, 'ceremonial platform forward of the training bridge on the 02 deck');
  assert.ok(sup.max[1] < 12.8, 'no superstructure level above the 03 deck');
  // only one structure between the 01 and 02 decks at the bridge: nothing of the bridge reaches above the 02 deck
  assert.ok(groupOf(g, 'config_later').includes('training_bridge') && groupOf(g, 'config_later').includes('ceremonial_platform'));
  assert.ok(groupOf(g, 'config_as_built').includes('std_director') && !groupOf(g, 'config_as_built').includes('training_bridge'));
  const tbw = meshInfo(g, 'training_bridge_windows');
  assert.ok(tbw.max[0] >= tb.max[0] - 0.05 && tbw.min[1] > ROOF02 + 0.8 && tbw.max[2] >= tb.max[2] - 0.06, `training bridge windows are on its walls, above its floor (${tbw.min[1].toFixed(2)} m)`);
});

test('Phase 3: Y gun mountings at about ±3.9 m, later configuration only; no 40 mm guns in the 1977 configuration', async () => {
  const g = await glbJson();
  for (const [n, s] of [['gun_40mm_port', -1], ['gun_40mm_starboard', 1]]) {
    const m = meshInfo(g, n), zc = (m.min[2] + m.max[2]) / 2;
    assert.ok(Math.abs(zc - s * 3.9) < 0.25, `${n} centred at ${zc.toFixed(2)} m`);
    assert.ok(m.max[1] - m.min[1] > 2.0, `${n} has a tall shield`);
    assert.equal(m.extras.group, 'later');
  }
  const asBuilt = groupOf(g, 'config_as_built');
  assert.ok(!asBuilt.some((n) => /40mm|bofors|y_gun_screen/i.test(n)), 'no 40 mm gun or later screens in the As built group');
  const d = await read('public', 'data', 'ship_exterior.json');
  assert.ok(!d.Components.some((c) => c.Config === 'as_built' && /40 ?mm/i.test(c.Name)), 'no As built 40 mm component');
  const ab = d.Configurations.find((c) => c.Config_ID === 'as_built');
  assert.match(ab.Description, /40 mm guns are not shown/);
});

test('Phase 3: interiors are separate, named, approximate parts of the later configuration, each in its space', async () => {
  const g = await glbJson();
  const d = await read('public', 'data', 'ship_exterior.json');
  const interior = groupOf(g, 'interior_spaces');
  const spaces = new Set(d.Spaces.map((s) => s.Space_ID));
  for (const s of ['main_bridge', 'training_bridge', 'wheelhouse', 'engine_room', 'generator_room']) {
    assert.ok(spaces.has(s), `space ${s}`);
    assert.ok(interior.some((n) => g.nodes.find((x) => x.name === n).extras.space === s), `${s} has interior meshes`);
    assert.ok(d.Components.some((c) => c.Space === s), `${s} has components`);
  }
  for (const n of interior) assert.ok(spaces.has(g.nodes.find((x) => x.name === n).extras.space), `${n} names its space`);
  for (const c of d.Components.filter((x) => x.Layer === 'interior')) {
    assert.equal(c.Config, 'later', `${c.Component_ID} belongs to the later configuration`);
    assert.match(c.Model_Accuracy, /approximate|representative/i, `${c.Component_ID} is labelled approximate`);
    assert.ok(c.Meshes.every((m) => interior.includes(m)), `${c.Component_ID} meshes are interior`);
    assert.ok(['Approximate reconstruction', 'Supported'].includes(c.Model_Status), `${c.Component_ID} model status`);
  }
  // the engine room: two main engines, two gearboxes; the generator room: three generator sets
  assert.ok(interior.includes('er_main_engine_port') && interior.includes('er_main_engine_starboard'));
  const eng = d.Components.find((c) => c.Meshes.includes('er_main_engine_port'));
  assert.match(eng.Model_Accuracy, /photo-estimated/i);
  const gens = d.Components.find((c) => c.Meshes.includes('gr_generator_engines'));
  assert.match(gens.Name, /three/i);
  const pipes = d.Components.find((c) => c.Meshes.includes('er_pipes_blue'));
  assert.match(pipes.Model_Accuracy, /not the real pipe routes/i);
  for (const s of d.Spaces) assert.ok(d.Components.some((c) => c.Component_ID === s.Component_ID), `${s.Space_ID} opens from ${s.Component_ID}`);
  // the engine room machinery sits between the engine room's bulkheads (frames 52 and 44)
  const frame = (f) => 101.8 - 1.372 * f - MID;
  for (const n of interior.filter((x) => x.startsWith('er_') && x !== 'er_shafts')) { const m = meshInfo(g, n); assert.ok(m.min[0] > frame(52) - 0.05 && m.max[0] < frame(44) + 0.05, `${n} inside the engine room`); }
});

test('Phase 3: no photograph, file name, face, label or screen content in the public model or data', async () => {
  const g = await glbJson();
  assert.ok(!g.images && !g.textures && !g.samplers, 'no images or textures in the GLB');
  const pub = await Promise.all(['ship_exterior.json', 'sources.json'].map((f) => readFile(path.join(root, 'public', 'data', f), 'utf8')));
  const glbText = JSON.stringify(g);
  for (const text of [...pub, glbText]) {
    assert.ok(!/WhatsApp|IMG_\d|\.heic|\.jpe?g|gambar kdhangtuah|\bAN\d{2}\b|\bWH\d{2}\b|\bER0\d\b|\bJR\d{2}\b/i.test(text), 'no private file names or internal photo IDs');
  }
  const ext = JSON.parse(pub[0]);
  for (const c of ext.Components.filter((x) => /console|panel|monitor|display/i.test(x.Name))) assert.match(`${c.Name} ${c.Model_Accuracy}`, /unlabelled|plain|blank/i, `${c.Component_ID} is plain and unlabelled`);
  assert.ok(!ext.Components.some((c) => /unidentified/i.test(c.Name) && c.Layer !== 'interior'), 'the unidentified deck structure is not published as an identified part');
});

test('Phase 3: exhibition-board statements are recorded as such; the evidence register covers every Phase 3 component', async () => {
  const d = await read('public', 'data', 'ship_exterior.json');
  const src = await read('public', 'data', 'sources.json');
  for (const id of ['SRC058', 'SRC059']) assert.match(src.find((s) => s.Source_ID === id).Source_Type, /^Secondary/);
  assert.match(src.find((s) => s.Source_ID === 'SRC060').Rights_Status, /not published/i);
  for (const c of d.Components.filter((x) => x.Source_IDs.includes('SRC058'))) {
    if (/1998|2000|3600|1800/.test(`${c.Description} ${c.History}`)) assert.match(`${c.Description} ${c.History}`, /Stated on the exhibition board/, `${c.Component_ID} attributes the board`);
  }
  const reg = await read('research', 'evidence-register.json');
  const regIds = new Set(reg.Components.map((r) => r.Component_ID));
  for (const c of d.Components.filter((x) => x.Layer === 'interior' || ['EXT05', 'EXT06', 'EXT07', 'EXT13', 'EXT14', 'EXT21', 'EXT24'].includes(x.Component_ID))) assert.ok(regIds.has(c.Component_ID), `${c.Component_ID} in the evidence register`);
  for (const r of reg.Components) assert.ok(['Supported', 'Approximate Reconstruction', 'Pending Verification'].includes(r.Status), `${r.Component_ID} status`);
  assert.ok(reg.Components.some((r) => /Unidentified Deck Structure/.test(r.Name) && r.Status === 'Pending Verification'), 'the unidentified structure is registered as pending');
});
