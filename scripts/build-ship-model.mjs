// Builds public/models/kd-hang-tuah-exterior.glb: a historically informed, APPROXIMATE reconstruction of
// KD Hang Tuah (Phase 2: hull, superstructure, masts, guns, boats, railings, pennant marking, deck fittings,
// conceptual internal structure; Phase 3: corrected bridge levels, training bridge, main bridge, wheelhouse,
// engine room and generator room interiors, Y gun mountings). Run: node scripts/build-ship-model.mjs
//
// Units: metres. Axes: +x towards the bow, +y up, +z to starboard. y = 0 is the waterline; the
// origin is at mid-length. In the comments, "X" is the distance from the stern deck edge (0–103.5 m).
//
// From sources: length overall 103.5 m, beam 12.2 m, draught 4.9 m (SRC038 p.2); two shafts (SRC015).
// Positions along the ship: TLDM No. 1 deck plan (SRC038 p.28: fittings, deckhouse, boats, helideck)
// and No. 3 deck plan (SRC038 p.30: watertight bulkheads by frame number, machinery spaces).
// Heights and shapes: estimates from a profile drawing and photographs used only as internal
// modelling references. No image or texture is embedded. See research/model-notes.json.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'models', 'kd-hang-tuah-exterior.glb');

const LOA = 103.5, BEAM = 12.2, DRAUGHT = 4.9, MID = LOA / 2;
const X = (fromStern) => fromStern - MID;

// ---------------------------------------------------------------- materials (no textures)
// [r, g, b, metalness, roughness, opacity]
const MATERIALS = {
  hull_grey: [0.36, 0.39, 0.41, 0.25, 0.72],
  boot_black: [0.07, 0.08, 0.09, 0.1, 0.8],
  antifouling_red: [0.45, 0.17, 0.13, 0.05, 0.85],
  deck: [0.27, 0.29, 0.30, 0.1, 0.92],
  deck_marking: [0.86, 0.86, 0.84, 0.0, 0.85],
  superstructure: [0.47, 0.50, 0.52, 0.25, 0.66],
  mast_black: [0.10, 0.11, 0.12, 0.35, 0.6],
  gun_grey: [0.55, 0.58, 0.60, 0.4, 0.5],
  railing: [0.70, 0.72, 0.73, 0.5, 0.45],
  net: [0.22, 0.24, 0.25, 0.2, 0.9],
  boat_white: [0.84, 0.84, 0.80, 0.05, 0.6],
  boat_grey: [0.36, 0.38, 0.40, 0.05, 0.8],
  window: [0.05, 0.08, 0.11, 0.6, 0.2],
  bronze: [0.55, 0.42, 0.22, 0.85, 0.4],
  pennant_black: [0.06, 0.06, 0.07, 0.0, 0.8],
  pennant_light: [0.80, 0.81, 0.80, 0.0, 0.75],
  pennant_shadow: [0.12, 0.13, 0.14, 0.0, 0.8],
  internal_deck: [0.62, 0.70, 0.76, 0.0, 0.9, 0.55],
  internal_bulkhead: [0.30, 0.52, 0.68, 0.0, 0.9, 0.35],
  compartment_engine: [0.85, 0.45, 0.15, 0.0, 0.9, 0.45],
  compartment_machinery: [0.85, 0.65, 0.20, 0.0, 0.9, 0.40],
  compartment_other: [0.40, 0.60, 0.55, 0.0, 0.9, 0.35],
  shaft_conceptual: [0.65, 0.55, 0.30, 0.6, 0.4],
  // Phase 3 interiors (plain colours read from the 2026 photographs; no image is used)
  room_wall: [0.84, 0.82, 0.76, 0.0, 0.85],
  wood: [0.46, 0.22, 0.11, 0.05, 0.55],
  floor_slat: [0.24, 0.12, 0.08, 0.05, 0.7],
  floor_dark: [0.12, 0.12, 0.13, 0.05, 0.8],
  console_green: [0.68, 0.78, 0.74, 0.1, 0.6],
  console_grey: [0.60, 0.64, 0.64, 0.2, 0.55],
  compass_grey: [0.27, 0.29, 0.30, 0.4, 0.45],
  chair_black: [0.07, 0.07, 0.08, 0.0, 0.6],
  screen_dark: [0.03, 0.04, 0.05, 0.3, 0.25],
  curtain: [0.09, 0.10, 0.11, 0.0, 0.95],
  steering_green: [0.36, 0.46, 0.38, 0.2, 0.55],
  light_fitting: [0.95, 0.95, 0.92, 0.0, 0.35],
  engine_cream: [0.80, 0.72, 0.52, 0.25, 0.55],
  lagging: [0.86, 0.86, 0.83, 0.0, 0.85],
  floor_plate: [0.50, 0.52, 0.53, 0.6, 0.5],
  machinery_black: [0.07, 0.07, 0.08, 0.3, 0.5],
  pipe_blue: [0.12, 0.34, 0.62, 0.2, 0.5],
  pipe_red: [0.68, 0.12, 0.10, 0.2, 0.5],
  pipe_green: [0.14, 0.40, 0.24, 0.2, 0.5],
};
const MAT_INDEX = Object.fromEntries(Object.keys(MATERIALS).map((k, i) => [k, i]));

// ---------------------------------------------------------------- hull lines (estimates)
const SHEER = [[0, 4.12], [30, 4.12], [55, 4.3], [75, 4.6], [88, 5.05], [97, 5.35], [103.5, 5.75]];
const BREADTH = [[0, 0.84], [5, 0.875], [10, 0.905], [20, 0.95], [32, 0.99], [40, 1], [60, 1], [68, 0.98], [76, 0.935],
  [82, 0.875], [86, 0.81], [90, 0.725], [94, 0.6], [97, 0.475], [99.5, 0.33], [101.5, 0.18], [102.8, 0.07], [103.5, 0]];
// Raked transom aft; flat keel; rounded forefoot and raked stem forward (stem rake from the profile drawing).
const BOTTOM = [[0, 4.12], [1.2, 2.0], [2.3, 0.15], [3.2, -0.55], [4.5, -1.0], [7, -1.8], [10, -2.6], [14, -3.35], [18, -3.9],
  [23, -4.35], [28, -4.65], [36, -4.9], [86, -4.9], [90, -4.75], [93, -4.5], [95.5, -4.05], [97.5, -3.4], [99.2, -2.5],
  [100.6, -1.4], [101.4, -0.5], [101.8, 0.0], [102.5, 1.8], [103.1, 3.7], [103.5, 5.75]];
const FULL = [[0, 4.5], [6, 4], [14, 3.2], [30, 2.7], [70, 2.5], [84, 2.1], [92, 1.7], [103.5, 1.25]];
const lerpTable = (t, x) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return t[t.length - 1][1];
};
const sheer = (x) => lerpTable(SHEER, x);
const halfDeck = (x) => lerpTable(BREADTH, x) * BEAM / 2;
const bottom = (x) => lerpTable(BOTTOM, x);
const fullness = (x) => lerpTable(FULL, x);
// Waterline half-breadth: topsides flare more towards the bow (bow flare seen in the photographs).
const flare = (x) => (x < 70 ? 0.975 : x < 88 ? 0.975 - (x - 70) * 0.0045 : 0.894 - (x - 88) * 0.006);
const halfWL = (x) => halfDeck(x) * Math.max(0.78, flare(x));

function halfAt(x, y) {
  const yb = bottom(x), yd = sheer(x), bd = halfDeck(x);
  if (y <= yb) return 0;
  if (yb >= 0) return yd - yb < 1e-3 ? 0 : bd * Math.sqrt(Math.min(1, (y - yb) / (yd - yb)));
  if (y >= 0) { const bw = halfWL(x), t = y / yd; return bw + (bd - bw) * (t * (2 - t)); } // flare curves outwards
  const n = fullness(x), t = y / yb;
  return halfWL(x) * Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / n);
}
// Deck surface height at (x, z): sheer plus camber.
const deckY = (x, z) => { const w = Math.max(halfDeck(x), 0.05); return sheer(x) + 0.14 * (1 - Math.min(1, (z / w) ** 2)); };

const STATIONS = (() => {
  const s = [];
  for (let x = 0; x < 8; x += 0.4) s.push(x);
  for (let x = 8; x < 86; x += 1.2) s.push(x);
  for (let x = 86; x < 103.5; x += 0.35) s.push(x);
  s.push(103.5);
  return s;
})();

function hullBand(y0, y1, rows = 8) {
  const pos = [], idx = [];
  const ringLen = (rows + 1) * 2;
  STATIONS.forEach((x) => {
    const yb = bottom(x), yd = sheer(x);
    const lo = Math.max(y0, yb), hi = Math.min(y1, yd);
    for (let side = -1; side <= 1; side += 2) for (let r = 0; r <= rows; r++) {
      const y = hi <= lo ? lo : lo + (hi - lo) * (r / rows);
      pos.push(X(x), y, side * (hi <= lo ? 0 : halfAt(x, y)));
    }
  });
  for (let s = 0; s < STATIONS.length - 1; s++) for (let side = 0; side < 2; side++) for (let r = 0; r < rows; r++) {
    const a = s * ringLen + side * (rows + 1) + r, b = a + 1, c = a + ringLen, d = c + 1;
    if (side === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function keelStrip() {
  const pos = [], idx = [];
  STATIONS.forEach((x) => { const yb = bottom(x), w = halfAt(x, yb + 0.03) * 0.3; pos.push(X(x), yb, -w, X(x), yb, w); });
  for (let s = 0; s < STATIONS.length - 1; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function deck(x0, x1, cols = 8) {
  const pos = [], idx = [];
  const xs = STATIONS.filter((x) => x > x0 && x < x1); xs.unshift(x0); xs.push(x1);
  xs.forEach((x) => { const w = halfDeck(x); for (let c = 0; c <= cols; c++) { const z = -w + (2 * w * c) / cols; pos.push(X(x), deckY(x, z), z); } });
  for (let s = 0; s < xs.length - 1; s++) for (let c = 0; c < cols; c++) { const a = s * (cols + 1) + c, b = a + 1, cc = a + cols + 1, d = cc + 1; idx.push(a, b, cc, b, d, cc); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function transom() {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const x = 4.5 * (i / 14), y = bottom(x); pts.push([x, y, halfAt(x, Math.min(sheer(x), y + 0.05))]); }
  const pos = [], idx = [];
  pts.forEach(([x, y, w]) => pos.push(X(x), y, -w, X(x), y, w));
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Narrow rubbing strake along the deck edge (gives the deck edge a visible line).
function deckEdgeStrake() {
  const gs = [];
  for (const side of [-1, 1]) {
    const pts = STATIONS.filter((x) => x < 103.2).map((x) => new THREE.Vector3(X(x), sheer(x) - 0.08, side * (halfDeck(x) + 0.03)));
    gs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.07, 4, false));
  }
  return merge(...gs);
}

// ---------------------------------------------------------------- shape helpers
const clean = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); if (!n.attributes.normal) n.computeVertexNormals(); return n; };
const merge = (...gs) => mergeGeometries(gs.flat().filter(Boolean).map(clean), false);
const box = (x0, x1, y0, y1, halfWidth, z = 0) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, halfWidth * 2); g.translate(X((x0 + x1) / 2), (y0 + y1) / 2, z); return g; };
const rbox = (x0, x1, y0, y1, halfWidth, r = 0.15, z = 0) => { const g = new RoundedBoxGeometry(x1 - x0, y1 - y0, halfWidth * 2, 2, Math.min(r, (y1 - y0) / 2.2)); g.translate(X((x0 + x1) / 2), (y0 + y1) / 2, z); return g; };
const at = (g, x, y, z) => { g.translate(X(x), y, z); return g; };
const cyl = (r0, r1, h, seg = 16) => new THREE.CylinderGeometry(r1, r0, h, seg);
/** Thin member between two model-space points (railing bars, braces, lattice). */
function bar(a, b, r = 0.025, sides = 4) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  if (len < 1e-4) return null;
  const g = new THREE.CylinderGeometry(r, r, len, sides, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
const barrel = (len, r, x, y, z, elev = 0.05, dir = 1, seg = 10) => {
  const g = new THREE.CylinderGeometry(r, r * 1.12, len, seg);
  g.rotateZ(-Math.PI / 2 + elev); g.translate(len / 2 * Math.cos(elev), len / 2 * Math.sin(elev), 0);
  if (dir < 0) g.rotateY(Math.PI);
  return at(g, x, y, z);
};
/** Extrude a side-profile polygon (in X-from-stern, y) across the ship, half-width w. */
function profileBlock(pts, w, z = 0) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(X(x), y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: 2 * w, bevelEnabled: false });
  g.translate(0, 0, -w + z);
  return g;
}

/**
 * Guardrail along a polyline of model-space points: stanchions about every `spacing` metres and
 * `courses` horizontal bars, following the points' own heights (deck contour).
 */
function railing(path, { height = 1.0, courses = 3, spacing = 1.6, post = 0.03, rail = 0.018, closed = false } = {}) {
  const pts = path.map((p) => new THREE.Vector3(...p));
  if (closed) pts.push(pts[0].clone());
  // resample by arc length
  const samples = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = a.distanceTo(b), n = Math.max(1, Math.round(len / spacing));
    for (let k = 1; k <= n; k++) samples.push(a.clone().lerp(b, k / n));
  }
  const gs = [];
  for (const p of samples) gs.push(bar([p.x, p.y, p.z], [p.x, p.y + height, p.z], post, 4));
  for (let c = 1; c <= courses; c++) {
    const h = (height * c) / courses;
    for (let i = 1; i < samples.length; i++) { const a = samples[i - 1], b = samples[i]; gs.push(bar([a.x, a.y + h, a.z], [b.x, b.y + h, b.z], rail, 4)); }
  }
  return merge(...gs);
}
/** Deck-edge path between x0 and x1 on one side, set in from the edge by `inset`. */
const edgePath = (x0, x1, side, inset = 0.12, step = 1.2) => {
  const out = [];
  for (let x = x0; x <= x1 + 1e-6; x = Math.min(x1, x + step)) { const z = side * Math.max(0.05, halfDeck(x) - inset); out.push([X(x), deckY(x, z), z]); if (x === x1) break; }
  return out;
};
/** Rectangle path on a flat level (for platforms and roofs). */
const rectPath = (x0, x1, y, hw, open = []) => [[X(x0), y, -hw], [X(x1), y, -hw], [X(x1), y, hw], [X(x0), y, hw]];

/**
 * Prism lofted between a bottom and a top outline (same number of points, in X-from-stern and z),
 * for blocks that are both chamfered in plan and raked in profile (the main bridge).
 */
function prismLoft(bot, top, y0, y1) {
  const n = bot.length, pos = [], idx = [];
  for (const [x, z] of bot) pos.push(X(x), y0, z);
  for (const [x, z] of top) pos.push(X(x), y1, z);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + j, i, n + j, n + i); }
  for (let i = 1; i < n - 1; i++) { idx.push(0, i + 1, i); idx.push(n, n + i, n + i + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const flat = g.toNonIndexed(); flat.computeVertexNormals(); // flat-shaded faces (no smoothing across the corners)
  return flat;
}
/** The side faces of a lofted prism, as four corners (bottom start, bottom end, top end, top start). */
function loftFaces(bot, top, y0, y1) {
  const n = bot.length, cx = bot.reduce((s, p) => s + p[0], 0) / n, cz = bot.reduce((s, p) => s + p[1], 0) / n;
  return bot.map((_, i) => { const j = (i + 1) % n; return { a: new THREE.Vector3(X(bot[i][0]), y0, bot[i][1]), b: new THREE.Vector3(X(bot[j][0]), y0, bot[j][1]), c: new THREE.Vector3(X(top[j][0]), y1, top[j][1]), d: new THREE.Vector3(X(top[i][0]), y1, top[i][1]), centre: new THREE.Vector3(X(cx), (y0 + y1) / 2, cz) }; });
}
/** A rectangle laid on a lofted face (window panes), lifted off the face by `off` towards the outside. */
function facePatch(f, u0, u1, v0, v1, off = 0.03) {
  const P = (u, v) => f.a.clone().lerp(f.b, u).lerp(f.d.clone().lerp(f.c, u), v);
  const n = f.b.clone().sub(f.a).cross(f.d.clone().sub(f.a)).normalize();
  if (P(0.5, 0.5).sub(f.centre).dot(n) < 0) n.negate();
  const q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)].map((p) => p.addScaledVector(n, off));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(q.flatMap((p) => p.toArray()), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  return g;
}
/** Floor of parallel slats (fore-and-aft) between x0 and x1; `skip(x, z)` leaves openings. */
function slats(x0, x1, z0, z1, y, { pitch = 0.16, width = 0.11, h = 0.04, xAt = null, skip = null } = {}) {
  const gs = [];
  for (let z = z0 + width / 2; z <= z1 - width / 2 + 1e-6; z += pitch) {
    let [a, b] = xAt ? xAt(z) : [x0, x1];
    if (skip) { const r = skip(z); if (r) { if (r[0] - a > 0.1) gs.push(box(a, r[0], y, y + h, width / 2, z)); a = r[1]; } }
    if (b - a > 0.1) gs.push(box(a, b, y, y + h, width / 2, z));
  }
  return merge(...gs);
}
/** Simple pedestal chair: column, seat, back and armrests (photographs: black upholstered chairs). */
function chair(x, y, z, facing = 1, s = 1) {
  const back = facing > 0 ? -0.26 : 0.26;
  return merge(at(cyl(0.05, 0.05, 0.42 * s, 8), x, y + 0.21 * s, z), at(cyl(0.26, 0.3, 0.05, 12), x, y + 0.03, z),
    rbox(x - 0.27, x + 0.27, y + 0.42 * s, y + 0.56 * s, 0.28, 0.05, z),
    rbox(x + back - 0.05, x + back + 0.05, y + 0.56 * s, y + 1.25 * s, 0.26, 0.04, z),
    box(x - 0.22, x + 0.18, y + 0.68 * s, y + 0.73 * s, 0.03, z - 0.27), box(x - 0.22, x + 0.18, y + 0.68 * s, y + 0.73 * s, 0.03, z + 0.27));
}
/** Ring (torus) lying flat or upright, for brass rings and hand-wheels. */
const ring = (r, t, x, y, z, upright = false) => { const g = new THREE.TorusGeometry(r, t, 6, 28); if (!upright) g.rotateX(Math.PI / 2); return at(g, x, y, z); };
/** Horizontal pipe along x between x0 and x1 at (y, z). */
const pipeX = (x0, x1, y, z, r, seg = 10) => { const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg); g.rotateZ(Math.PI / 2); return at(g, (x0 + x1) / 2, y, z); };

/** Inclined ladder (stairs) between two points with side rails. */
function ladder(a, b, width = 0.7) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), n = Math.max(4, Math.round(d.length() / 0.28));
  const side = new THREE.Vector3(0, 0, width / 2);
  const gs = [bar(A.clone().sub(side).toArray(), B.clone().sub(side).toArray(), 0.035), bar(A.clone().add(side).toArray(), B.clone().add(side).toArray(), 0.035)];
  for (let i = 1; i < n; i++) { const p = A.clone().lerp(B, i / n); gs.push(bar(p.clone().sub(side).toArray(), p.clone().add(side).toArray(), 0.022)); }
  gs.push(bar(A.clone().sub(side).add(new THREE.Vector3(0, 0.9, 0)).toArray(), B.clone().sub(side).add(new THREE.Vector3(0, 0.9, 0)).toArray(), 0.02));
  gs.push(bar(A.clone().add(side).add(new THREE.Vector3(0, 0.9, 0)).toArray(), B.clone().add(side).add(new THREE.Vector3(0, 0.9, 0)).toArray(), 0.02));
  return merge(...gs);
}
/** Open lattice tower between two square sections (corner posts + cross bracing). */
function lattice(x, y0, y1, half0, half1, levels = 4, r = 0.05) {
  const gs = [];
  const corner = (y, h) => [[-h, -h], [h, -h], [h, h], [-h, h]].map(([dx, dz]) => [X(x) + dx, y, dz]);
  for (let l = 0; l < levels; l++) {
    const ya = y0 + ((y1 - y0) * l) / levels, yb = y0 + ((y1 - y0) * (l + 1)) / levels;
    const ha = half0 + ((half1 - half0) * l) / levels, hb = half0 + ((half1 - half0) * (l + 1)) / levels;
    const A = corner(ya, ha), B = corner(yb, hb);
    for (let i = 0; i < 4; i++) { gs.push(bar(A[i], B[i], r, 5)); gs.push(bar(A[i], B[(i + 1) % 4], r * 0.6, 4)); gs.push(bar(B[i], B[(i + 1) % 4], r * 0.6, 4)); }
  }
  return merge(...gs);
}

/** Vertical plate between two plan points (bulwarks, room walls). */
function plate(a, b, y, h, t = 0.06) {
  const [ax, az] = a, [bx, bz] = b, len = Math.hypot(bx - ax, bz - az);
  const g = new THREE.BoxGeometry(len, h, t);
  g.rotateY(-Math.atan2(bz - az, bx - ax));
  return at(g, (ax + bx) / 2, y + h / 2, (az + bz) / 2);
}
/** Octagonal bulwark of the former STD position / ceremonial platform on the 02 deck, open aft (p.32). */
function octagonBulwark() {
  const { cx, hx, hz, ch } = OCT, x0 = cx - hx, x1 = cx + hx;
  const pts = [[x0, -hz + ch], [x0 + ch, -hz], [x1 - ch, -hz], [x1, -hz + ch], [x1, hz - ch], [x1 - ch, hz], [x0 + ch, hz], [x0, hz - ch]];
  const gs = [];
  for (let i = 1; i < pts.length; i++) gs.push(plate(pts[i - 1], pts[i], ROOF02, 1.0, 0.07));
  return merge(...gs);
}
/**
 * Bofors 40 mm/L70 mounting as seen in the 2026 photographs: round pedestal, tall angular shield, long barrel
 * and a frame of tubes on each side of the shield. Trained aft (barrel towards the stern). Proportions are
 * estimated from the photographs (people for scale) and are approximate.
 */
function bofors40(x, y, z) {
  const lower = profileBlock([[x - 0.95, y + 0.6], [x + 0.85, y + 0.6], [x + 0.98, y + 1.25], [x + 0.8, y + 1.8], [x - 0.75, y + 1.8], [x - 1.0, y + 1.25]], 0.8, z);
  const upper = profileBlock([[x - 0.75, y + 1.8], [x + 0.8, y + 1.8], [x + 0.55, y + 2.3], [x - 0.35, y + 2.32]], 0.62, z);
  const gs = [
    at(cyl(0.86, 0.86, 0.08, 24), x, y + 0.04, z), at(cyl(0.72, 0.62, 0.55, 24), x, y + 0.33, z),
    lower, upper,
    barrel(3.0, 0.05, x - 0.95, y + 1.5, z, 0.05, -1), at(cyl(0.085, 0.085, 0.36, 10).rotateZ(Math.PI / 2), x - 3.88, y + 1.66, z),
  ];
  for (const t of [-1, 1]) {
    const zc = z + t * 1.13;
    for (const dy of [1.05, 1.36, 1.67]) for (const dz of [-0.11, 0.11]) gs.push(barrel(1.2, 0.055, x + 0.45, y + dy, zc + dz, 0.05, -1, 8));
    gs.push(box(x - 0.78, x - 0.72, y + 0.9, y + 1.85, 0.2, zc), box(x + 0.42, x + 0.48, y + 0.9, y + 1.85, 0.2, zc));
    gs.push(box(x - 0.2, x + 0.1, y + 0.95, y + 1.05, 0.33, z + t * 0.95)); // bracket to the shield
  }
  return merge(...gs);
}

// ---------------------------------------------------------------- pennant marking (painted on the hull)
// Hand-drawn block numerals (no font file is embedded). Glyph space: height 1, baseline 0.
const GLYPHS = {
  F: [[[0, 0], [0.17, 0], [0.17, 0.43], [0.47, 0.43], [0.47, 0.57], [0.17, 0.57], [0.17, 0.86], [0.53, 0.86], [0.53, 1], [0, 1]]],
  7: [[[0, 0.86], [0.42, 0.86], [0.12, 0], [0.3, 0], [0.62, 0.9], [0.62, 1], [0, 1]]],
  6: 'six',
};
function glyphShapes(ch) {
  if (GLYPHS[ch] !== 'six') return GLYPHS[ch].map((poly) => new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v))));
  const ring = new THREE.Shape(); ring.absarc(0.31, 0.31, 0.31, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0.31, 0.31, 0.15, 0, Math.PI * 2, true); ring.holes.push(hole);
  const stem = new THREE.Shape([[0, 0.3], [0.16, 0.3], [0.16, 0.62], [0.22, 0.77], [0.34, 0.86], [0.56, 0.86], [0.56, 1], [0.32, 1], [0.13, 0.92], [0.03, 0.77], [0, 0.6]].map(([u, v]) => new THREE.Vector2(u, v)));
  return [ring, stem];
}
/**
 * Text laid onto the hull side: each vertex is placed on the hull surface (halfAt) plus a small
 * offset, so the marking follows the flare and sheer like paint.
 */
function hullText(text, { side, centreX, centreY, height, slant = 0, offset = 0.025, spacing = 0.18, shift = [0, 0] }) {
  const widths = { F: 0.53, 7: 0.62, 6: 0.62 };
  const total = [...text].reduce((w, ch) => w + widths[ch] + spacing, -spacing) * height;
  const gs = [];
  let u = -total / 2;
  for (const ch of text) {
    for (const shape of glyphShapes(ch)) {
      const g = new THREE.ShapeGeometry(shape, 12);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const gu = p.getX(i) * height + u + p.getY(i) * height * slant + shift[0], gv = p.getY(i) * height - height / 2 + shift[1];
        // Reading direction: towards the bow on starboard, towards the stern on port.
        const x = centreX + (side > 0 ? gu : -gu), y = centreY + gv;
        p.setXYZ(i, X(x), y, side * (halfAt(x, y) + offset));
      }
      if (side < 0) { const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; } }
      g.computeVertexNormals();
      gs.push(g);
    }
    u += (widths[ch] + spacing) * height;
  }
  return merge(...gs);
}

// ---------------------------------------------------------------- parts
// group: shared | as_built | later | internal; layer extras for the explorer.
const parts = [];
const add = (name, mat, geom, group = 'shared', extras = {}) => { if (geom) parts.push({ name, mat, geom, group, extras }); };
const D = (x) => sheer(x);
// Deck levels of the superstructure (estimates): 01 deck = roof of the No. 1 deck house; 02 (signal) deck =
// roof of the 01 deck house and main bridge; 03 deck = roof of the 02 deck house. Phase 3 correction: the
// main bridge is on the 01 deck and the training bridge one level above it on the 02 deck (SRC038 pp.31–32).
const ROOF01 = 7.6, ROOF02 = 10.5, DECK03 = 12.7;
const FRAME_X = (f) => 101.8 - 1.372 * f;   // frame 0 at the stem waterline; spacing derived from the plan
// Training bridge on the 02 deck: frames 20 to about 16 on the 02 Signal Deck plan (p.32), about 5.6 m x 3.2 m;
// the exhibition-board sketch (SRC058) reads 2000 (extended) + 3600 (existing length).
const TB = { aft: 74.2, fwd: 79.8, half: 1.62, top: 12.95 };
// Former STD director position / ceremonial platform: octagonal enclosure forward of the training bridge (p.32).
const OCT = { cx: 81.5, hx: 2.35, hz: 2.6, ch: 0.9 };

// --- Hull and decks
add('hull_bottom', 'antifouling_red', merge(hullBand(-6, -0.3, 12), keelStrip()));
add('hull_boottop', 'boot_black', hullBand(-0.3, 0.6, 3));
add('hull_topside', 'hull_grey', merge(hullBand(0.6, 7, 10), transom()));
add('hull_deck_edge', 'hull_grey', deckEdgeStrake(), 'shared', { noEdges: true });
add('deck_flight', 'deck', deck(0, 34.6));
add('deck_main', 'deck', deck(34.6, 83.5));
add('deck_forecastle', 'deck', deck(83.5, 103.5, 10));

// Helideck markings (2022 photograph SRC038 p.26; circle position from the No. 1 deck plan p.28).
{
  const ring = new THREE.RingGeometry(3.6, 3.95, 64); ring.rotateX(-Math.PI / 2);
  const cl = new THREE.PlaneGeometry(29, 0.22); cl.rotateX(-Math.PI / 2);
  const tl = new THREE.PlaneGeometry(0.3, 10.2); tl.rotateX(-Math.PI / 2);
  add('deck_flight_marking', 'deck_marking', merge(at(ring, 21.7, D(21.7) + 0.16, 0), at(cl, 17, D(17) + 0.155, 0), at(tl, 25, D(25) + 0.155, 0)), 'shared', { noEdges: true });
}
// Helideck safety nets along both edges (2022 photograph SRC038 p.26): angled mesh panels.
{
  const gs = [];
  for (const side of [-1, 1]) {
    for (let x = 15; x < 34; x += 1.6) {
      const w = halfDeck(x), y = D(x);
      const panel = new THREE.PlaneGeometry(1.5, 1.1); panel.rotateX(side * -1.05); panel.rotateY(Math.PI / 2 * 0);
      gs.push(at(panel, x + 0.8, y + 0.35, side * (w + 0.45)));
      gs.push(bar([X(x), y, side * w], [X(x), y + 0.75, side * (w + 0.95)], 0.025));
    }
  }
  add('helideck_safety_nets', 'net', merge(...gs), 'shared', { noEdges: true });
}

// --- Forecastle fittings (No. 1 deck plan p.28; 2022 photographs p.26)
{
  // Breakwater: V-shaped plate ahead of the A gun, apex forward, with braces.
  const gs = [];
  const apex = 90.9, ends = 89.2, hw = 3.0, h = 0.75;
  for (const side of [-1, 1]) {
    const a = [X(apex), deckY(apex, 0), 0], b = [X(ends), deckY(ends, side * hw), side * hw];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const plate = new THREE.PlaneGeometry(len, h); plate.translate(len / 2, h / 2, 0);
    plate.rotateY(-Math.atan2(b[2] - a[2], b[0] - a[0]) * 1); plate.translate(a[0], a[1], a[2]);
    gs.push(plate);
    for (let k = 0.25; k < 1; k += 0.3) { const p = [a[0] + (b[0] - a[0]) * k, a[1] + h * 0.95, a[2] + (b[2] - a[2]) * k]; gs.push(bar(p, [p[0] - 0.7, a[1], p[2]], 0.03)); }
  }
  add('breakwater', 'hull_grey', merge(...gs));
  const fit = [];
  for (const s of [-1, 1]) fit.push(at(cyl(0.38, 0.3, 0.55, 14), 92.8, deckY(92.8, s * 0.9) + 0.27, s * 0.9));           // electric capstan (gypsies)
  for (const [x, inset] of [[85.0, 0.7], [93.6, 0.65]]) for (const s of [-1, 1]) { const z = s * (halfDeck(x) - inset); fit.push(at(cyl(0.14, 0.14, 0.45, 10), x - 0.25, deckY(x, z) + 0.22, z), at(cyl(0.14, 0.14, 0.45, 10), x + 0.25, deckY(x, z) + 0.22, z)); } // bollards
  for (const s of [-1, 1]) fit.push(at(cyl(0.32, 0.32, 0.12, 14), 98.6, deckY(98.6, s * 0.75) + 0.05, s * 0.75), at(cyl(0.16, 0.16, 0.1, 10), 95.0, deckY(95, s * 0.9) + 0.05, s * 0.9)); // hawse and deck pipes
  fit.push(at(cyl(0.05, 0.035, 3.2, 8), 102.6, D(102.6) + 1.6, 0)); // jackstaff
  add('forecastle_fittings', 'gun_grey', merge(...fit));
  // Anchor viewing platforms, port and starboard near the bow, with guardrails.
  const plat = [], rails = [];
  for (const s of [-1, 1]) {
    const x = 99.2, w = halfDeck(x), y = D(x) - 0.25;
    plat.push(box(x - 0.7, x + 0.7, y - 0.08, y, 0.45, s * (w + 0.4)));
    rails.push(railing([[X(x - 0.7), y, s * w], [X(x - 0.7), y, s * (w + 0.85)], [X(x + 0.7), y, s * (w + 0.85)], [X(x + 0.7), y, s * w]], { height: 0.95, courses: 2, spacing: 0.7 }));
  }
  add('anchor_viewing_platforms', 'hull_grey', merge(...plat));
  add('railing_anchor_platforms', 'railing', merge(...rails), 'shared', { noEdges: true });
}
// --- Quarterdeck fittings (No. 1 deck plan p.28)
{
  const fit = [at(cyl(0.38, 0.3, 0.55, 14), 5.1, D(5.1) + 0.27, 0)]; // electric capstan
  for (const x of [8.7, 14.2]) for (const s of [-1, 1]) { const z = s * (halfDeck(x) - 0.6); fit.push(at(cyl(0.14, 0.14, 0.45, 10), x - 0.25, D(x) + 0.22, z), at(cyl(0.14, 0.14, 0.45, 10), x + 0.25, D(x) + 0.22, z)); }
  fit.push(rbox(8.4, 11.0, D(9.7), D(9.7) + 1.7, 0.85, 0.08, 0.3)); // vent intake house
  fit.push(at(cyl(0.05, 0.035, 4.5, 8), 0.6, D(0.6) + 2.25, 0)); // ensign staff
  add('quarterdeck_fittings', 'gun_grey', merge(...fit));
}

// --- Superstructure: deckhouse on No. 1 deck (outline from the deck plan p.28), levels from the profile.
const DH = [ // [X from, X to, half-width] (deckhouse sides set in from the deck edge for the side passages)
  [34.6, 39.5, 3.3], [39.5, 51.2, 2.7], [51.2, 58.0, 3.4], [58.0, 76.0, 4.55], [76.0, 83.5, 4.3],
];
{
  const gs = DH.map(([a, b, w]) => rbox(a, b, D(a) - 0.05, ROOF01, w, 0.12));
  // roof overhang over the side passages (seen in the 2022 photograph 'LALUAN STBD')
  gs.push(box(58.0, 83.2, ROOF01 - 0.12, ROOF01, 4.95));
  gs.push(box(34.6, 58.0, ROOF01 - 0.12, ROOF01, 3.5));
  // 01 deck house (Phase 3 correction, 01 Deck plan SRC038 p.31: officers-under-training cabins and
  // wardroom, chart room and nav cabin). Its forward end is the main bridge, built separately below.
  gs.push(rbox(57.9, 78.5, ROOF01, ROOF02, 4.25, 0.15));
  // 02 deck house (02 Signal Deck plan p.32: lobby, A.C.A.D. room, training office, shipwright office and
  // store, vent unit space; frames 31 to 23½). Its roof is the 03 deck with the signalling-projector platform.
  gs.push(rbox(59.4, 69.6, ROOF02, DECK03, 2.7, 0.12));
  // funnel casing on the 01 roof
  gs.push(rbox(48.0, 57.9, ROOF01, 8.6, 2.6, 0.12));
  add('superstructure', 'superstructure', merge(...gs));
  // windows and doors (approximate layout)
  const win = [];
  for (const s of [-1, 1]) {
    for (let x = 60; x < 77.6; x += 2.2) win.push(box(x, x + 0.8, 8.6, 9.3, 0.02, s * 4.27));
    for (let x = 61; x < 82; x += 3.1) win.push(box(x, x + 0.45, 5.7, 6.2, 0.02, s * 4.57)); // scuttles on the deckhouse side
    for (const x of [45.5, 66.5, 79.5]) win.push(box(x, x + 0.75, D(x) + 0.05, D(x) + 1.95, 0.02, s * (DH.find(([a, b]) => x >= a && x < b)[2] + 0.02))); // doors
    win.push(box(65.6, 66.4, ROOF02 + 0.05, ROOF02 + 1.85, 0.02, s * 2.72)); // watertight doors, 02 deck house (W.T.D. on p.32)
  }
  add('superstructure_windows', 'window', merge(...win), 'shared', { noEdges: true });
}
// Main bridge (Phase 3 correction): the enclosed bridge at the forward end of the 01 deck (SRC038 p.31,
// about frames 17 to 13½), with chamfered forward corners as drawn on the plan and a window band that
// leans outwards (photograph 'GELADAK HALUAN', SRC038 p.26; exhibition board SRC058 front photograph).
// Its roof is the forward part of the 02 deck. Bridge wings with signalling-projector platforms on the
// 01 deck, port and starboard (p.31 '10" SP PLATFORM').
const BR = { aft: 78.5, side: 4.25, chamferBot: 81.6, frontBot: 83.45, frontTop: 84.2, chamferTop: 82.2, halfFront: 2.1 };
{
  const bot = [[BR.aft, -BR.side], [BR.chamferBot, -BR.side], [BR.frontBot, -BR.halfFront], [BR.frontBot, BR.halfFront], [BR.chamferBot, BR.side], [BR.aft, BR.side]];
  const top = [[BR.aft, -BR.side], [BR.chamferTop, -BR.side], [BR.frontTop, -BR.halfFront - 0.05], [BR.frontTop, BR.halfFront + 0.05], [BR.chamferTop, BR.side], [BR.aft, BR.side]];
  const body = prismLoft(bot, top, ROOF01, ROOF02);
  const roof = prismLoft(top.map(([x, z]) => [x + (x > BR.aft ? 0.12 : 0), z * 1.02]), top.map(([x, z]) => [x + (x > BR.aft ? 0.12 : 0), z * 1.02]), ROOF02 - 0.1, ROOF02 + 0.04);
  const wings = [-1, 1].map((s) => box(79.6, 82.0, ROOF01 - 0.12, ROOF01, 0.82, s * 5.07));
  add('bridge', 'superstructure', merge(body, roof, ...wings));
  // Windows: three on the front face, two on each chamfer, two on each side (approximate layout).
  const w = [];
  const faces = loftFaces(bot, top, ROOF01, ROOF02);
  const pane = (f, u0, u1) => w.push(facePatch(f, u0, u1, 0.42, 0.78, 0.03));
  [[0.06, 0.3], [0.38, 0.62], [0.7, 0.94]].forEach(([a, b]) => pane(faces[2], a, b));
  for (const f of [faces[1], faces[3]]) [[0.1, 0.44], [0.56, 0.9]].forEach(([a, b]) => pane(f, a, b));
  for (const f of [faces[0], faces[4]]) [[0.25, 0.47], [0.6, 0.82]].forEach(([a, b]) => pane(f, a, b));
  add('bridge_windows', 'window', merge(...w), 'shared', { noEdges: true });
}

// --- Funnel: lofted elliptical sections, raked after edge, black top band; louvre band.
{
  const sections = 18, around = 32, pos = [], idx = [];
  for (let j = 0; j <= sections; j++) {
    const t = j / sections, y = 8.6 + t * 6.5;
    const len = 2.95 - 0.75 * t, wid = 1.95 - 0.38 * t, cx = 52.95 + 0.7 * t;
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2;
      const sx = Math.cos(a), sz = Math.sin(a);
      const fwd = sx > 0 ? 0.92 : 1.0; // slightly fuller forward face
      pos.push(X(cx + sx * len * fwd), y, sz * wid);
    }
  }
  for (let j = 0; j < sections; j++) for (let i = 0; i < around; i++) { const a = j * (around + 1) + i, b = a + 1, c = a + around + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); f.setIndex(idx); f.computeVertexNormals();
  add('funnel', 'superstructure', f);
  const cap = new THREE.CylinderGeometry(1, 1, 1.0, 32, 1); cap.scale(2.22, 1, 1.59);
  const top = new THREE.CircleGeometry(1, 32); top.rotateX(-Math.PI / 2); top.scale(2.1, 1, 1.5);
  add('funnel_cap', 'mast_black', merge(at(cap, 53.62, 14.6, 0), at(top, 53.62, 15.08, 0)));
  const louv = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) louv.push(box(52.2 + k * 0.32, 52.4 + k * 0.32, 10.4, 11.6, 0.02, s * 1.88));
  add('funnel_louvres', 'mast_black', merge(...louv), 'shared', { noEdges: true });
}

// --- Foremast: solid lower tower, open lattice upper tower, platforms, yardarm, top pole.
{
  add('foremast', 'superstructure', merge(rbox(60.6, 64.2, ROOF02, 16.3, 1.75, 0.1)));
  add('foremast_upper', 'mast_black', merge(
    lattice(62.4, 16.3, 21.2, 1.3, 0.85, 4, 0.06),
    box(60.6, 64.3, 16.25, 16.4, 1.85), box(61.0, 63.9, 21.15, 21.3, 1.55),
    bar([X(62.4), 19.6, -4.6], [X(62.4), 19.6, 4.6], 0.07, 6),                  // yardarm
    bar([X(62.4), 19.6, -4.6], [X(62.4), 21.2, -1.0], 0.03), bar([X(62.4), 19.6, 4.6], [X(62.4), 21.2, 1.0], 0.03),
    at(cyl(0.07, 0.04, 2.6, 8), 62.4, 22.8, 0),
  ));
  add('railing_foremast_platforms', 'railing', merge(
    railing(rectPath(60.6, 64.3, 16.4, 1.82).map((p) => p), { height: 0.95, courses: 2, spacing: 0.9, closed: true }),
    railing(rectPath(61.0, 63.9, 21.3, 1.52), { height: 0.9, courses: 2, spacing: 0.9, closed: true }),
  ), 'shared', { noEdges: true });
}
// --- After mast (main mast)
{
  add('mainmast', 'superstructure', rbox(37.3, 39.3, ROOF01, 11.5, 0.95, 0.08));
  add('mainmast_upper', 'mast_black', merge(
    lattice(38.3, 11.5, 15.4, 0.85, 0.6, 3, 0.05), box(37.2, 39.4, 15.35, 15.5, 1.0),
    bar([X(38.3), 14.6, -3.4], [X(38.3), 14.6, 3.4], 0.06, 6),
    at(cyl(0.06, 0.035, 2.6, 8), 38.3, 16.8, 0),
  ));
}

// --- Railings on deck edges and platforms (approximate arrangement; 2022 photographs SRC038 pp.25–26)
add('railing_forecastle', 'railing', merge(
  railing([...edgePath(83.5, 102.3, -1)], {}), railing([...edgePath(83.5, 102.3, 1)], {}),
  railing([[X(102.3), deckY(102.3, -halfDeck(102.3) + 0.12), -halfDeck(102.3) + 0.12], [X(102.9), deckY(102.9, 0), 0], [X(102.3), deckY(102.3, halfDeck(102.3) - 0.12), halfDeck(102.3) - 0.12]], { spacing: 0.6 }),
), 'shared', { noEdges: true });
add('railing_main_deck_port', 'railing', railing(edgePath(34.6, 83.5, -1)), 'shared', { noEdges: true });
add('railing_main_deck_starboard', 'railing', railing(edgePath(34.6, 83.5, 1)), 'shared', { noEdges: true });
add('railing_quarterdeck', 'railing', merge(
  railing(edgePath(0.25, 15, -1), {}),
  railing(edgePath(0.25, 15, 1), {}),
  railing([[X(0.25), D(0.25) + 0.02, -halfDeck(0.25) + 0.12], [X(0.25), D(0.25) + 0.02, halfDeck(0.25) - 0.12]], {}),
), 'shared', { noEdges: true });
add('railing_01_deck', 'railing', merge(
  railing([[X(38.0), ROOF01, -3.45], [X(58.0), ROOF01, -3.45]], { height: 1.0 }),
  railing([[X(38.0), ROOF01, 3.45], [X(58.0), ROOF01, 3.45]], { height: 1.0 }),
  railing([[X(58.0), ROOF01, -4.85], [X(79.6), ROOF01, -4.85]], { height: 1.0 }),
  railing([[X(58.0), ROOF01, 4.85], [X(79.6), ROOF01, 4.85]], { height: 1.0 }),
), 'shared', { noEdges: true });
// 02 (signal) deck edge: the roof of the 01 deck house and of the main bridge, narrowing forward (p.32).
{
  const edge = (s) => [[X(57.9), ROOF02, s * 4.12], [X(81.9), ROOF02, s * 4.12], [X(83.95), ROOF02, s * 2.05]];
  add('railing_02_deck', 'railing', merge(
    railing(edge(-1), { height: 1.0 }), railing(edge(1), { height: 1.0 }),
    railing([[X(83.95), ROOF02, -2.05], [X(83.95), ROOF02, 2.05]], { height: 1.0 }),
    railing([[X(57.9), ROOF02, -4.12], [X(57.9), ROOF02, 4.12]], { height: 1.0 }),
    railing(rectPath(59.4, 69.6, DECK03, 2.6), { height: 0.95, courses: 2, spacing: 1.2, closed: true }), // 03 deck
  ), 'shared', { noEdges: true });
}
// Bridge wings on the 01 deck (p.31), port and starboard.
add('railing_bridge', 'railing', merge(
  ...[-1, 1].map((s) => railing([[X(79.6), ROOF01, s * 4.9], [X(79.6), ROOF01, s * 5.85], [X(82.0), ROOF01, s * 5.85], [X(82.0), ROOF01, s * 4.3]], { height: 1.0, spacing: 0.9 })),
), 'shared', { noEdges: true });
// Y gun position on the 01 deck, aft (01 Deck plan p.31: two circular 40 mm positions near the ship's sides).
// Platform extended outboard to carry the mountings at about ±3.9 m; mesh screens as in the 2022 and 2026
// photographs (later configuration only: they are not recorded for 1977).
const YG = { x0: 32.4, x1: 37.4, half: 5.15, gunX: 35.4, gunZ: 3.9 };
{
  const gs = [];
  const path = [[X(YG.x1), ROOF01, -YG.half], [X(YG.x0), ROOF01, -YG.half], [X(YG.x0), ROOF01, YG.half], [X(YG.x1), ROOF01, YG.half]];
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1], path[i]], len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const p = new THREE.PlaneGeometry(len, 1.1); p.translate(len / 2, 0.55, 0); p.rotateY(-Math.atan2(b[2] - a[2], b[0] - a[0])); p.translate(a[0], a[1], a[2]);
    gs.push(p);
  }
  const frame = [];
  for (let i = 1; i < path.length; i++) { const [a, b] = [path[i - 1], path[i]]; frame.push(railing([a, b], { height: 1.1, courses: 1, spacing: 1.25, post: 0.035, rail: 0.03 })); }
  add('y_gun_screens', 'net', merge(...gs), 'later', { noEdges: true });
  add('y_gun_screen_frames', 'railing', merge(...frame), 'later', { noEdges: true });
  const pillars = [-1, 1].flatMap((s) => [YG.x0 + 0.3, YG.x1 - 0.6].map((x) => at(cyl(0.11, 0.11, ROOF01 - D(x), 8), x, (ROOF01 + D(x)) / 2, s * (YG.half - 0.35))));
  add('y_gun_deck', 'deck', merge(box(YG.x0, YG.x1, ROOF01 - 0.1, ROOF01 + 0.06, YG.half), ...pillars), 'shared', { noEdges: true });
}
// Ladders: inclined ladders at the front of the superstructure, port and starboard ('GELADAK HALUAN'
// photograph); from the 01 deck up to the 02 deck at about frames 20 to 18½, port and starboard, outboard of
// the 02 deck edge (p.32 'LADDER'); and from the main deck to the 01 deck aft (estimate). Phase 2 also had two
// ladders at the after end of the 02 deck; the 02 deck plan shows none there, so they were removed.
add('ladders', 'railing', merge(
  ladder([X(86.0), D(86) + 0.1, -3.6], [X(83.6), ROOF01, -3.6]), ladder([X(86.0), D(86) + 0.1, 3.6], [X(83.6), ROOF01, 3.6]),
  ladder([X(FRAME_X(20.6)), ROOF01, -4.58], [X(FRAME_X(18.6)), ROOF02, -4.58], 0.58), ladder([X(FRAME_X(20.6)), ROOF01, 4.58], [X(FRAME_X(18.6)), ROOF02, 4.58], 0.58),
  ...[-1, 1].map((s) => box(FRAME_X(18.6), FRAME_X(18.1), ROOF02 - 0.06, ROOF02, 0.32, s * 4.55)),
  ladder([X(YG.x0 - 2.3), D(YG.x0 - 2.3) + 0.1, -2.4], [X(YG.x0), ROOF01, -2.4], 0.6),
), 'shared', { noEdges: true });

// --- Underwater: two shafts (SRC015) with A-brackets, propellers, rudder (2022 slipping photographs)
for (const side of [-1, 1]) {
  const blades = [];
  for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.08, 1.15, 0.42); b.translate(0, 0.62, 0); b.rotateX((k * Math.PI) / 2 + 0.3); blades.push(b); }
  const hub = new THREE.SphereGeometry(0.28, 12, 8); hub.scale(1.6, 1, 1);
  const prop = merge(hub, ...blades); prop.translate(X(9.4), -2.9, side * 2.6);
  const shaft = bar([X(9.4), -2.9, side * 2.6], [X(24), -3.55, side * 2.1], 0.17, 10);
  const bracket = merge(bar([X(10.6), -2.95, side * 2.6], [X(10.9), -1.1, side * 1.1], 0.09), bar([X(10.6), -2.95, side * 2.6], [X(10.9), -1.6, side * 3.4], 0.09));
  add(side < 0 ? 'propeller_port' : 'propeller_starboard', 'bronze', merge(prop, shaft, bracket));
}
add('rudder', 'antifouling_red', merge(profileBlock([[5.6, -1.3], [7.9, -1.3], [7.6, -3.9], [5.9, -4.0]], 0.16)));

// ---- As built (1977): twin 4-inch Mk16, STD above the bridge, Limbo Mk10, 1970s antenna, sea boats on davits.
{
  const y = deckY(88.5, 0);
  const shield = profileBlock([[86.6, y + 0.4], [90.2, y + 0.4], [90.6, y + 1.5], [89.9, y + 2.55], [86.9, y + 2.55], [86.6, y + 2.2]], 1.55);
  add('gun_4in_twin', 'gun_grey', merge(
    at(cyl(1.75, 1.75, 0.4, 24), 88.5, y + 0.2, 0), shield,
    barrel(4.3, 0.085, 90.4, y + 1.45, -0.46), barrel(4.3, 0.085, 90.4, y + 1.45, 0.46),
    at(cyl(0.16, 0.24, 0.35, 10).rotateZ(-Math.PI / 2), 90.65, y + 1.45, -0.46), at(cyl(0.16, 0.24, 0.35, 10).rotateZ(-Math.PI / 2), 90.65, y + 1.45, 0.46),
  ), 'as_built');
  // STD on the 02 deck above the main bridge (exhibition board SRC058: "located on top of the bridge"): the
  // STD compartment of 'existing length' 3.6 m (as drawn before its extension into the training bridge) and the
  // director on the octagonal position forward of it. Shape and height are approximate.
  add('std_director', 'gun_grey', merge(
    rbox(TB.fwd - 3.6, TB.fwd, ROOF02, 12.55, TB.half, 0.1),
    at(cyl(0.95, 0.95, 0.35, 20), OCT.cx, ROOF02 + 0.18, 0), at(cyl(0.75, 0.85, 0.75, 20), OCT.cx, ROOF02 + 0.72, 0),
    rbox(OCT.cx - 0.55, OCT.cx + 0.65, ROOF02 + 1.1, ROOF02 + 1.75, 0.6, 0.1), box(OCT.cx - 0.1, OCT.cx + 0.2, ROOF02 + 1.35, ROOF02 + 1.5, 1.35),
  ), 'as_built');
  add('std_position_bulwark', 'superstructure', octagonBulwark(), 'as_built');
  const ly = D(13.4);
  add('limbo_mk10', 'gun_grey', merge(
    box(11.7, 15.2, ly, ly + 0.45, 1.35),
    ...[-0.7, 0, 0.7].map((z) => barrel(2.0, 0.19, 14.4, ly + 0.55, z, 0.8, -1, 12)),
    box(13.9, 14.7, ly + 0.4, ly + 1.3, 1.25),
  ), 'as_built');
  const dish = new THREE.SphereGeometry(2.2, 24, 6, 0, Math.PI * 2, 0, 0.5); dish.scale(1, 0.45, 0.5); dish.rotateZ(Math.PI / 2 * 0);
  add('radar_antenna_early', 'mast_black', merge(at(dish, 62.4, 23.1, 0), at(cyl(0.18, 0.18, 1.6, 8), 62.4, 22.3, 0)), 'as_built');
  // Sea boats (Captain's Barge and Sea Boat Whaler, SRC038 p.13) on davits; which boat was on which side is not recorded.
  for (const [name, s] of [['boat_port', -1], ['boat_starboard', 1]]) {
    const hull = new THREE.CapsuleGeometry(1.05, 6.6, 6, 14); hull.rotateZ(Math.PI / 2); hull.scale(1, 0.62, 1);
    const canopy = rbox(42.3, 46.2, 7.85, 8.5, 0.75, 0.2, s * 4.35);
    add(name, 'boat_white', merge(at(hull, 44.3, 7.55, s * 4.35), canopy), 'as_built');
    add(`${name}_davits`, 'gun_grey', merge(...[40.6, 48.0].map((x) => merge(bar([X(x), D(x), s * 3.0], [X(x), 9.2, s * 3.6], 0.09), bar([X(x), 9.2, s * 3.6], [X(x), 9.0, s * 4.6], 0.08), bar([X(x), 9.0, s * 4.6], [X(x), 8.0, s * 4.6], 0.015)))), 'as_built');
  }
}
// ---- Later TLDM configuration: Bofors 57 mm/L70, training bridge, two Bofors 40 mm/L70 at Y, later antennas,
//      7.62 m RHIBs (from October 2001, SRC038 p.13) with boat cranes (SRC038 p.21 'CRANE', p.28 'FASSI CRANE').
{
  const y = deckY(87.3, 0);
  add('gun_57mm_well', 'gun_grey', merge(at(cyl(1.85, 1.85, 0.85, 28, 1), 87.3, y + 0.42, 0)), 'later');
  const turret = profileBlock([[85.7, y + 0.85], [88.6, y + 0.85], [89.5, y + 1.55], [89.1, y + 2.75], [86.2, y + 2.85], [85.6, y + 2.3]], 1.32);
  add('gun_57mm', 'gun_grey', merge(turret, rbox(85.6, 87.0, y + 0.85, y + 2.5, 1.45, 0.18),
    barrel(3.9, 0.075, 89.3, y + 1.8, 0, 0.03), at(cyl(0.11, 0.11, 0.45, 10).rotateZ(-Math.PI / 2), 93.0, y + 1.92, 0)), 'later');
  // Training bridge (Phase 3): on the 02 deck, one level above the main bridge (02 Signal Deck plan p.32,
  // frames 20 to about 16). Three forward windows, two windows on each side, doors at the after end
  // (exhibition-board sketch SRC058; board front photograph; 2026 site-visit photographs SRC060).
  {
    const roofLip = box(TB.aft - 0.05, TB.fwd + 0.05, TB.top - 0.06, TB.top + 0.02, TB.half + 0.05);
    add('training_bridge', 'superstructure', merge(rbox(TB.aft, TB.fwd, ROOF02, TB.top, TB.half, 0.08), roofLip), 'later');
    const w = [];
    for (const zc of [-1.02, 0, 1.02]) w.push(rbox(TB.fwd - 0.02, TB.fwd + 0.03, 11.55, 12.45, 0.4, 0.04, zc));
    for (const s of [-1, 1]) for (const [a, b] of [[2.14, 3.4], [4.03, 5.24]]) w.push(rbox(TB.aft + a, TB.aft + b, 11.6, 12.4, 0.025, 0.04, s * TB.half));
    add('training_bridge_windows', 'window', merge(...w), 'later', { noEdges: true });
    // after end: a watertight door (with its frame) beside the stairway (sketch: 'watertight & sliding doors')
    add('training_bridge_doors', 'gun_grey', merge(rbox(TB.aft - 0.06, TB.aft + 0.01, ROOF02 + 0.05, ROOF02 + 1.9, 0.42, 0.06, -0.92), box(TB.aft - 0.09, TB.aft - 0.05, ROOF02 + 0.9, ROOF02 + 1.0, 0.05, -0.6)), 'later');
    add('ceremonial_platform', 'superstructure', octagonBulwark(), 'later');
  }
  // Y gun: two Bofors 40 mm/L70 mountings, port and starboard, at about ±3.9 m from the centreline (01 Deck
  // plan p.31, approximate). Shape from the 2026 photographs (SRC060) and the exhibition-board photograph
  // 'Meriam (S1) Bofors 40mm/L70' (SRC059): round pedestal, tall angular shield, long barrel, a frame of
  // tubes on each side of the shield (function not stated in the sources). Barrels trained aft, as on the plan.
  for (const [name, s] of [['gun_40mm_port', -1], ['gun_40mm_starboard', 1]]) add(name, 'gun_grey', bofors40(YG.gunX, ROOF01 + 0.06, s * YG.gunZ), 'later');
  add('radar_antenna_later', 'mast_black', merge(
    at(cyl(0.2, 0.2, 1.0, 8), 62.4, 21.8, 0), box(62.1, 62.7, 22.3, 23.8, 1.8),
    ...[22.5, 23.0, 23.5].map((yy) => box(62.05, 62.75, yy, yy + 0.05, 1.82)),
    box(63.7, 64.1, 18.95, 19.15, 1.6), at(cyl(0.12, 0.12, 0.5, 8), 63.9, 18.7, 0),
  ), 'later');
  for (const [name, s] of [['boat_port', -1], ['boat_starboard', 1]]) {
    const tube = new THREE.CapsuleGeometry(0.45, 6.4, 6, 12); tube.rotateZ(Math.PI / 2);
    const tubes = merge(at(tube.clone(), 44.3, 7.75, s * 4.35 - 0.7), at(tube.clone(), 44.3, 7.75, s * 4.35 + 0.7));
    const hull = rbox(41.2, 47.2, 7.2, 7.75, 0.75, 0.25, s * 4.35);
    const console_ = rbox(43.8, 44.9, 7.75, 8.6, 0.4, 0.1, s * 4.35);
    const motors = [-0.35, 0.35].map((dz) => box(40.6, 41.1, 7.3, 8.4, 0.18, s * 4.35 + dz));
    add(`${name}_rhib`, 'boat_grey', merge(tubes, hull, console_, ...motors), 'later');
    add(`${name}_crane`, 'gun_grey', merge(at(cyl(0.3, 0.3, 1.6, 12), 49.6, ROOF01 + 0.8, s * 3.1), bar([X(49.6), ROOF01 + 1.6, s * 3.1], [X(46.0), ROOF01 + 3.0, s * 4.3], 0.16, 6), bar([X(46.0), ROOF01 + 3.0, s * 4.3], [X(44.3), ROOF01 + 2.2, s * 4.35], 0.12, 6)), 'later');
  }
}

// ---- Pennant marking (nombor penant). As built: 'F76' (Royal Navy-era references; kept in 1977, EVT016).
//      Later: '76' (TLDM photographs, 2007 and 2022). Painted on both sides of the forward hull.
for (const s of [-1, 1]) {
  const n = s < 0 ? 'port' : 'starboard';
  add(`pennant_f76_${n}`, 'pennant_black', hullText('F76', { side: s, centreX: 90.7, centreY: 3.25, height: 1.8 }), 'as_built', { noEdges: true });
  add(`pennant_76_shadow_${n}`, 'pennant_shadow', hullText('76', { side: s, centreX: 92.4, centreY: 3.35, height: 2.2, slant: 0.22, offset: 0.02, shift: [0.07, -0.07] }), 'later', { noEdges: true });
  add(`pennant_76_${n}`, 'pennant_light', hullText('76', { side: s, centreX: 92.4, centreY: 3.35, height: 2.2, slant: 0.22, offset: 0.03 }), 'later', { noEdges: true });
}

// ---- Internal structure (CONCEPTUAL): deck levels, watertight bulkheads (No. 3 deck plan, SRC038 p.30),
//      keel, machinery spaces and shaft lines. Deck heights are estimates.
const NO2 = 1.75, NO3 = -0.85, INNER_BOTTOM = -3.7;
const WTB = [2.5, 6, 8, 10.5, 14, 18.5, 24, 25.5, 30, 38, 44, 52, 58.5, 64.5, 69];
function sectionPlate(x, y0, y1, rows = 10) {
  const pos = [], idx = [];
  for (let r = 0; r <= rows; r++) { const y = y0 + ((y1 - y0) * r) / rows, w = Math.max(0, halfAt(x, Math.min(y, sheer(x) - 0.01)) - 0.03); pos.push(X(x), y, -w, X(x), y, w); }
  for (let r = 0; r < rows; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function levelPlate(x0, x1, y) {
  const pos = [], idx = [];
  const xs = STATIONS.filter((x) => x > x0 && x < x1 && bottom(x) < y); xs.unshift(x0); xs.push(x1);
  xs.forEach((x) => { const w = Math.max(0, halfAt(x, y) - 0.05); pos.push(X(x), y, -w, X(x), y, w); });
  for (let i = 0; i < xs.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Compartment volume between two frames, following the hull (from inner bottom to a deck). */
function compartment(xa, xb, y0, y1) {
  const xs = []; for (let x = xa; x < xb; x += 0.8) xs.push(x); xs.push(xb);
  const rows = 6, pos = [], idx = [], ring = (rows + 1) * 2;
  xs.forEach((x) => {
    for (let side = -1; side <= 1; side += 2) for (let r = 0; r <= rows; r++) { const y = y0 + ((y1 - y0) * r) / rows; pos.push(X(x), y, side * Math.max(0.1, halfAt(x, y) - 0.12)); }
  });
  for (let s = 0; s < xs.length - 1; s++) for (let side = 0; side < 2; side++) for (let r = 0; r < rows; r++) { const a = s * ring + side * (rows + 1) + r, b = a + 1, c = a + ring, d = c + 1; if (side === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return merge(g, sectionPlate(xa, y0, y1, rows), sectionPlate(xb, y0, y1, rows), levelPlate(xa, xb, y1), levelPlate(xa, xb, y0));
}
add('internal_deck_levels', 'internal_deck', merge(levelPlate(1.0, 101.0, NO2), levelPlate(3.0, 99.5, NO3)), 'internal', { layer: 'structural', noEdges: true });
add('internal_bulkheads', 'internal_bulkhead', merge(...WTB.map((f) => sectionPlate(FRAME_X(f), bottom(FRAME_X(f)) + 0.05, sheer(FRAME_X(f)) - 0.05, 12))), 'internal', { layer: 'structural', noEdges: true });
// (No keel or longitudinal members are modelled: their structure is not documented in the listed sources.)
add('compartment_engine_room', 'compartment_engine', compartment(FRAME_X(52), FRAME_X(44), INNER_BOTTOM, NO2), 'internal', { layer: 'internal', noEdges: true });
add('compartment_machinery_room', 'compartment_machinery', compartment(FRAME_X(44), FRAME_X(38), INNER_BOTTOM, NO2), 'internal', { layer: 'internal', noEdges: true });
add('compartment_machinery_control_room', 'compartment_other', compartment(FRAME_X(38), FRAME_X(35.5), NO3, NO2), 'internal', { layer: 'internal', noEdges: true });
add('compartment_generator_room', 'compartment_machinery', compartment(FRAME_X(35.5), FRAME_X(30), INNER_BOTTOM + 0.4, NO2), 'internal', { layer: 'internal', noEdges: true });
add('compartment_steering_gear', 'compartment_other', compartment(1.6, FRAME_X(69), Math.max(-1.6, bottom(4) + 0.3), NO2), 'internal', { layer: 'internal', noEdges: true });
add('compartment_cable_locker', 'compartment_other', compartment(FRAME_X(6), FRAME_X(3.5), -2.6, NO3), 'internal', { layer: 'internal', noEdges: true });
add('shaft_lines_conceptual', 'shaft_conceptual', merge(...[-1, 1].map((s) => bar([X(24), -3.55, s * 2.1], [X(FRAME_X(52)), -3.2, s * 1.6], 0.17, 10))), 'internal', { layer: 'internal', noEdges: true });

// ---- Phase 3 interiors (APPROXIMATE RECONSTRUCTIONS). Group 'interior'; each mesh names its space.
//      Positions come from the deck plans (SRC038 pp.29–32); visible forms from the 2026 site-visit photographs
//      (SRC060, internal modelling reference only) and the exhibition board (SRC058). Instruments, consoles and
//      panels are plain, unlabelled shapes: no label, screen content or control layout is reproduced.
//      The interiors show the present-day (later TLDM) arrangement seen in 2026, not the 1977 arrival.
const inside = (name, mat, geom, space) => add(name, mat, geom, 'interior', { layer: 'interior', space, noEdges: true });

// Main bridge, 01 deck (enclosed bridge, frames about 17 to 13½, p.31). Floor level ROOF01.
{
  const S = 'main_bridge', y = ROOF01 + 0.02, zMax = BR.side - 0.12;
  const frontAt = (z) => { const a = Math.abs(z); const t = Math.max(0, (a - BR.halfFront) / (BR.side - BR.halfFront)); return BR.frontBot - 0.15 - t * (BR.frontBot - BR.chamferBot); };
  inside('mb_floor_gratings', 'floor_slat', slats(BR.aft + 0.1, 0, -zMax, zMax, y, { xAt: (z) => [BR.aft + 0.1, frontAt(z) - 0.05] }), S);
  // window ledge (wood) with plain cabinets below, along the front, chamfers and forward sides
  const ledge = [], cab = [];
  const run = [[81.0, -zMax + 0.05], [BR.chamferBot - 0.15, -zMax + 0.05], [BR.frontBot - 0.5, -BR.halfFront + 0.1], [BR.frontBot - 0.5, BR.halfFront - 0.1], [BR.chamferBot - 0.15, zMax - 0.05], [81.0, zMax - 0.05]];
  for (let i = 1; i < run.length; i++) { cab.push(plate(run[i - 1], run[i], y, 0.95, 0.55)); ledge.push(plate(run[i - 1], run[i], y + 0.95, 0.05, 0.7)); }
  inside('mb_window_ledge', 'wood', merge(...ledge), S);
  inside('mb_front_cabinets', 'console_grey', merge(...cab), S);
  // conning console with three lever controls (AN05; generic shapes, no markings)
  const cx = 82.0, cz = -0.9;
  const levers = [-0.35, 0, 0.35].flatMap((dz) => [rbox(cx - 0.12, cx + 0.12, y + 1.04, y + 1.24, 0.09, 0.06, cz + dz), bar([X(cx), y + 1.2, cz + dz], [X(cx + 0.05), y + 1.55, cz + dz], 0.025), at(cyl(0.05, 0.05, 0.1, 8), cx + 0.05, y + 1.58, cz + dz)]);
  inside('mb_conning_console', 'console_grey', merge(profileBlock([[cx - 0.4, y], [cx + 0.4, y], [cx + 0.4, y + 0.95], [cx - 0.4, y + 1.08]], 0.65, cz)), S);
  inside('mb_conning_levers', 'machinery_black', merge(...levers), S);
  // compass pedestal with a brass ring (AN02, AN07; type not identified)
  inside('mb_compass_pedestal', 'console_green', merge(at(cyl(0.3, 0.3, 0.06, 16), 81.2, y + 0.03, 0.55), at(cyl(0.17, 0.2, 1.0, 14), 81.2, y + 0.55, 0.55), at(cyl(0.3, 0.26, 0.32, 18), 81.2, y + 1.2, 0.55)), S);
  inside('mb_compass_ring', 'bronze', ring(0.44, 0.025, 81.2, y + 1.32, 0.55), S);
  // two display consoles on cabinets (AN06, AN08; screens shown blank)
  const disp = [], scr = [];
  for (const [x, z, rot] of [[82.1, 2.55, 0], [80.2, -3.2, Math.PI / 2]]) {
    const body = merge(rbox(x - 0.3, x + 0.3, y, y + 1.0, 0.32, 0.03), rbox(x - 0.32, x + 0.06, y + 1.0, y + 1.6, 0.36, 0.04));
    body.translate(-X(x), 0, -z); body.rotateY(rot); body.translate(X(x), 0, z); disp.push(body);
    const s = box(x - 0.335, x - 0.325, y + 1.08, y + 1.52, 0.28); s.translate(-X(x), 0, -z); s.rotateY(rot); s.translate(X(x), 0, z); scr.push(s);
  }
  inside('mb_display_consoles', 'console_green', merge(...disp), S);
  inside('mb_display_screens', 'screen_dark', merge(...scr), S);
  inside('mb_chairs', 'chair_black', merge(chair(81.9, y, 1.55, 1, 1.15), chair(80.9, y, 3.2, 1, 1.15)), S);
  // chart desk (wood) in the after port corner and a dark curtain (AN13–AN15)
  inside('mb_chart_desk', 'wood', merge(box(BR.aft + 0.1, BR.aft + 1.7, y, y + 0.95, 0.35, -zMax + 0.35), box(BR.aft + 0.08, BR.aft + 1.72, y + 0.95, y + 1.0, 0.4, -zMax + 0.38)), S);
  inside('mb_curtain', 'curtain', box(BR.aft + 0.12, BR.aft + 0.17, y + 0.1, ROOF02 - 0.15, 0.45, -zMax + 1.35), S);
  // overhead: cable trays, vent duct, fluorescent fittings and plain equipment boxes (AN07, AN08, AN11, AN19)
  inside('mb_overhead', 'room_wall', merge(
    box(BR.aft + 0.3, 82.8, ROOF02 - 0.24, ROOF02 - 0.21, 0.12, -1.6), box(BR.aft + 0.3, 82.8, ROOF02 - 0.24, ROOF02 - 0.21, 0.12, 1.6),
    box(BR.aft + 0.3, 82.2, ROOF02 - 0.36, ROOF02 - 0.18, 0.15, 0.1),
    ...[[79.6, -2.6], [80.4, 2.4], [82.3, -2.0], [82.3, 1.4]].map(([x, z]) => box(x - 0.2, x + 0.2, ROOF02 - 0.45, ROOF02 - 0.25, 0.16, z)),
  ), S);
  inside('mb_light_fittings', 'light_fitting', merge(...[[79.5, -1.0], [79.5, 1.0], [81.3, -1.0], [81.3, 1.0], [82.6, 0]].map(([x, z]) => box(x - 0.6, x + 0.6, ROOF02 - 0.2, ROOF02 - 0.12, 0.08, z))), S);
}

// Training bridge, 02 deck (later TLDM configuration). Layout from the exhibition-board sketch (SRC058) and
// the 2026 photographs: desks along both sides, chart table aft, compass binnacle on the centreline, chairs,
// slatted floor, stairway entering from the after end, hatch in the deck head, plain display console.
{
  const S = 'training_bridge', y = ROOF02 + 0.02, zi = TB.half - 0.06;
  const stair = { x0: TB.aft + 0.15, x1: TB.aft + 1.35, hz: 0.39 };
  inside('tb_floor', 'floor_slat', slats(TB.aft + 0.06, TB.fwd - 0.06, -zi, zi, y, { pitch: 0.15, skip: (z) => (Math.abs(z) < stair.hz + 0.05 ? [stair.x0, stair.x1] : null) }), S);
  // chart table (sketch about 1800 long) on the port side aft, split A/C unit above it; desk and cabinet runs
  inside('tb_chart_table', 'wood', merge(box(TB.aft + 0.06, TB.aft + 1.86, y, y + 0.92, 0.28, -zi + 0.28), box(TB.aft + 0.04, TB.aft + 1.88, y + 0.92, y + 0.97, 0.32, -zi + 0.3)), S);
  inside('tb_desks', 'wood', merge(
    box(TB.aft + 2.0, TB.fwd - 0.75, y, y + 0.88, 0.26, -zi + 0.26), box(TB.aft + 1.98, TB.fwd - 0.73, y + 0.88, y + 0.93, 0.3, -zi + 0.28),
    box(TB.aft + 1.4, TB.fwd - 0.1, y, y + 0.88, 0.26, zi - 0.26), box(TB.aft + 1.38, TB.fwd - 0.08, y + 0.88, y + 0.93, 0.3, zi - 0.28),
    box(TB.fwd - 0.45, TB.fwd - 0.08, y, y + 0.88, 0.85, -0.3), box(TB.fwd - 0.47, TB.fwd - 0.06, y + 0.88, y + 0.93, 0.9, -0.3),
  ), S);
  inside('tb_ac_unit', 'console_grey', box(TB.aft + 0.25, TB.aft + 1.35, TB.top - 0.62, TB.top - 0.32, 0.1, -zi + 0.1), S);
  // standard compass binnacle on the centreline (LS01, LS02, AN205)
  inside('tb_binnacle', 'compass_grey', merge(at(cyl(0.32, 0.32, 0.05, 16), 78.4, y + 0.03, 0), at(cyl(0.15, 0.19, 1.05, 14), 78.4, y + 0.55, 0), at(cyl(0.3, 0.24, 0.3, 18), 78.4, y + 1.18, 0), at(cyl(0.27, 0.3, 0.12, 18), 78.4, y + 1.39, 0), box(78.25, 78.55, y + 0.5, y + 0.8, 0.12, 0.2)), S);
  inside('tb_chairs', 'chair_black', merge(chair(77.4, y, 0.85, 1, 1.15), chair(76.5, y, -0.75, 1, 1.05)), S);
  inside('tb_display_console', 'console_grey', merge(rbox(TB.fwd - 0.72, TB.fwd - 0.2, y, y + 0.95, 0.27, 0.03, -zi + 0.27), rbox(TB.fwd - 0.74, TB.fwd - 0.4, y + 0.95, y + 1.45, 0.3, 0.04, -zi + 0.3)), S);
  inside('tb_display_screen', 'screen_dark', box(TB.fwd - 0.755, TB.fwd - 0.745, y + 1.02, y + 1.38, 0.24, -zi + 0.3), S);
  // stairway from the after end, leading down to the deck below (its lower landing is not documented)
  inside('tb_stairway', 'railing', merge(
    ladder([X(stair.x1), y - 0.05, 0], [X(stair.x0), ROOF01 + 0.4, 0], 0.7),
    railing([[X(stair.x0), y, -stair.hz - 0.05], [X(stair.x1 + 0.1), y, -stair.hz - 0.05], [X(stair.x1 + 0.1), y, stair.hz + 0.05], [X(stair.x0), y, stair.hz + 0.05]], { height: 0.95, courses: 2, spacing: 0.6 }),
  ), S);
  inside('tb_deckhead_hatch', 'compass_grey', merge(ring(0.38, 0.04, TB.aft + 0.9, TB.top - 0.12, zi - 0.62), at(cyl(0.36, 0.36, 0.03, 18), TB.aft + 0.9, TB.top - 0.1, zi - 0.62)), S);
  inside('tb_ceiling_fittings', 'light_fitting', merge(
    ...[TB.aft + 2.2, TB.aft + 3.6, TB.aft + 5.0].map((x) => at(cyl(0.16, 0.16, 0.08, 14), x, TB.top - 0.14, 0)),
    ...[-0.8, 0.8].map((z) => box(TB.aft + 0.2, TB.fwd - 0.2, TB.top - 0.11, TB.top - 0.08, 0.025, z)),
  ), S);
}

// Wheelhouse, No. 2 deck (frames about 41 to 39 on the No. 2 deck plan, p.29; size approximate). Steering
// stand with a domed housing, a brass wheel and four gauges; a wall monitor; lagged pipes (WH01–WH13).
{
  const S = 'wheelhouse', x0 = 46.6, x1 = 50.0, hz = 1.6, y = NO2 + 0.02, top = sheer(48.3) - 0.3;
  inside('wh_floor', 'floor_slat', slats(x0 + 0.05, x1 - 0.05, -hz + 0.05, hz - 0.05, y, { pitch: 0.17, width: 0.12 }), S);
  inside('wh_walls', 'room_wall', merge(plate([x0, -hz], [x0, hz], y, top - y, 0.06), plate([x1, -hz], [x1, hz], y, top - y, 0.06), plate([x0, hz], [x1, hz], y, top - y, 0.06),
    ...[47.4, 48.3, 49.2].map((x) => box(x - 0.015, x + 0.015, y, top, 0.02, hz - 0.04))), S);
  const sx = 48.5, sz = 0.7;
  inside('wh_steering_stand', 'steering_green', merge(
    box(sx - 0.25, sx + 0.25, y, y + 0.35, 0.22, sz), rbox(sx - 0.28, sx + 0.28, y + 0.35, y + 1.05, 0.24, 0.05, sz),
    at(cyl(0.26, 0.26, 0.2, 18), sx, y + 1.15, sz), at(new THREE.SphereGeometry(0.26, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), sx, y + 1.25, sz),
    rbox(sx - 0.2, sx + 0.2, y + 0.85, y + 1.1, 0.12, 0.03, sz - 0.42), box(sx - 0.3, sx + 0.3, y + 0.98, y + 1.0, 0.36, sz),
  ), S);
  inside('wh_steering_wheel', 'bronze', merge(
    at(new THREE.TorusGeometry(0.42, 0.022, 6, 28).rotateY(Math.PI / 2), sx - 0.42, y + 1.0, sz),
    ...Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return bar([X(sx - 0.42), y + 1.0, sz], [X(sx - 0.42), y + 1.0 + 0.55 * Math.sin(a), sz + 0.55 * Math.cos(a)], 0.018); }),
    pipeX(sx - 0.45, sx - 0.28, y + 1.0, sz, 0.04),
  ), S);
  inside('wh_gauges', 'machinery_black', merge(box(sx - 0.05, sx + 0.05, y + 1.45, y + 1.65, 0.42, sz), ...[-0.3, -0.1, 0.1, 0.3].map((dz) => at(cyl(0.08, 0.08, 0.06, 12).rotateZ(Math.PI / 2), sx - 0.08, y + 1.55, sz + dz))), S);
  inside('wh_wall_monitor', 'screen_dark', box(47.0, 47.75, y + 1.5, y + 1.95, 0.03, hz - 0.08), S);
  inside('wh_overhead', 'lagging', merge(pipeX(x0 + 0.05, x1 - 0.05, top - 0.2, 1.25, 0.1), pipeX(x0 + 0.05, x1 - 0.05, top - 0.18, 0.85, 0.07), box(x0 + 0.05, x1 - 0.05, top - 0.08, top - 0.04, 0.2, 1.2)), S);
  inside('wh_light', 'light_fitting', box(47.6, 49.0, top - 0.12, top - 0.05, 0.1, -0.2), S);
  inside('wh_handrail', 'railing', merge(pipeX(x0 + 0.1, x1 - 0.1, y + 1.0, hz - 0.12, 0.025), ...[x0 + 0.3, 48.3, x1 - 0.3].map((x) => bar([X(x), y + 1.0, hz - 0.12], [X(x), y + 1.0, hz - 0.04], 0.02))), S);
}

// Engine room (frames 52 to 44, No. 3 deck plan p.30). Two main engines side by side (2026 photographs;
// SRC038 p.20 records 2 x Stork Wärtsilä 12V (SW 280)), each with a gearbox aft on its shaft line (p.20:
// 2 gearboxes). Engine envelopes are photo-estimated (people for scale) and approximate; the turbocharger end
// and the machinery spacing are estimated. Pipe runs are representative only, not the real routes.
{
  const S = 'engine_room', xa = FRAME_X(52), xb = FRAME_X(44), FP = -2.3, top = NO2 - 0.15;
  const hullZ = (x, y) => Math.max(0.5, halfAt(x, y) - 0.25);
  const E = { x0: 33.4, x1: 38.8, half: 0.78, z: 1.65 };
  // floor plates around the engines (left open alongside each engine so the seatings show), seams marked
  const fp = [], seams = [];
  const strip = (za, zb, x0 = xa + 0.15, x1 = xb - 0.15) => fp.push(box(x0, x1, FP - 0.04, FP, (zb - za) / 2, (za + zb) / 2));
  const zo = hullZ(36, FP);
  strip(-(E.z - E.half - 0.15), E.z - E.half - 0.15, E.x0 - 0.2, E.x1 + 0.2);                 // centre walkway between the engines
  for (const s of [-1, 1]) { const a = E.z + E.half + 0.15, b = zo; fp.push(box(xa + 0.15, xb - 0.15, FP - 0.04, FP, (b - a) / 2, s * (a + b) / 2)); }
  strip(-zo, zo, xa + 0.15, E.x0 - 0.2); strip(-zo, zo, E.x1 + 0.2, xb - 0.15);
  for (let x = xa + 1.2; x < xb; x += 1.2) seams.push(box(x - 0.01, x + 0.01, FP, FP + 0.005, zo, 0));
  inside('er_floor_plates', 'floor_plate', merge(...fp), S);
  inside('er_floor_plate_seams', 'machinery_black', merge(...seams), S);
  inside('er_walkway_rails', 'railing', merge(...[-1, 1].map((s) => railing([[X(E.x0 + 0.1), FP, s * (E.z - E.half - 0.12)], [X(E.x1 - 0.1), FP, s * (E.z - E.half - 0.12)]], { height: 1.0, courses: 2, spacing: 1.1 }))), S);
  for (const [name, s] of [['er_main_engine_port', -1], ['er_main_engine_starboard', 1]]) {
    const z = s * E.z, gs = [];
    gs.push(rbox(E.x0, E.x1, FP - 0.7, FP + 0.95, E.half, 0.06, z));                                      // crankcase and bedplate
    for (const t of [-1, 1]) { const b = new THREE.BoxGeometry(E.x1 - E.x0 - 0.4, 0.75, 0.62); b.rotateX(t * 0.42); gs.push(at(b, (E.x0 + E.x1) / 2, FP + 1.25, z + t * 0.36)); } // two cylinder banks (12V)
    gs.push(at(new THREE.CylinderGeometry(0.55, 0.55, 0.55, 24).rotateZ(Math.PI / 2), E.x1 + 0.45, FP + 1.75, z));      // turbocharger casing
    gs.push(pipeX(E.x1 - 0.2, E.x1 + 0.2, FP + 1.75, z, 0.3));
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; gs.push(box(E.x1 + 0.73, E.x1 + 0.76, FP + 1.75 + 0.3 * Math.sin(a) - 0.03, FP + 1.75 + 0.3 * Math.sin(a) + 0.03, 0.03, z + 0.3 * Math.cos(a))); } // ribbed intake
    gs.push(pipeX(E.x0 - 0.5, E.x0, FP + 0.25, z, 0.22));                                               // coupling to the gearbox
    add(name, 'engine_cream', merge(...gs), 'interior', { layer: 'interior', space: S, noEdges: true });
    const heads = [];
    for (const t of [-1, 1]) for (let k = 0; k < 6; k++) { const x = E.x0 + 0.55 + k * 0.82; const h = new THREE.BoxGeometry(0.5, 0.2, 0.42); h.rotateX(t * 0.42); heads.push(at(h, x, FP + 1.62 + 0.0, z + t * 0.52)); }
    add(`${name}_covers`, 'lagging', merge(...heads, pipeX(E.x0 + 0.3, E.x1 - 0.2, FP + 1.95, z, 0.17)), 'interior', { layer: 'interior', space: S, noEdges: true });
    add(`${name}_guard`, 'net', box(E.x1 - 0.1, E.x1 + 0.5, FP + 1.05, FP + 1.5, 0.5, z), 'interior', { layer: 'interior', space: S, noEdges: true });
  }
  // engine seatings (foundations) under each engine
  inside('er_engine_seatings', 'machinery_black', merge(...[-1, 1].flatMap((s) => [-1, 1].map((t) => box(E.x0 - 0.2, E.x1 + 0.2, FP - 1.2, FP - 0.65, 0.12, s * E.z + t * 0.6)))), S);
  // gearboxes (SRC038 p.22 'GEAR BOX': upper casing with two black filters), aft of the engines on the shaft lines
  inside('er_gearboxes', 'engine_cream', merge(...[-1, 1].flatMap((s) => [rbox(31.2, 32.9, -3.55, FP + 0.5, 0.7, 0.08, s * E.z), rbox(31.45, 32.65, FP + 0.5, FP + 0.9, 0.5, 0.06, s * E.z)])), S);
  inside('er_gearbox_filters', 'machinery_black', merge(...[-1, 1].flatMap((s) => [-0.2, 0.2].map((dz) => at(cyl(0.13, 0.13, 0.32, 12), 32.0, FP + 1.05, s * E.z + dz)))), S);
  inside('er_shafts', 'shaft_conceptual', merge(...[-1, 1].map((s) => pipeX(xa + 0.05, 31.1, -3.2, s * E.z, 0.15))), S);
  // overhead: lagged exhaust trunking rising from each turbocharger (its route beyond the room is not modelled),
  // white ventilation duct along both sides, fluorescent fittings (ER01–ER03)
  inside('er_exhaust_trunking', 'lagging', merge(...[-1, 1].flatMap((s) => [
    bar([X(E.x1 + 0.45), FP + 2.25, s * E.z], [X(E.x1 + 0.45), top - 0.4, s * E.z], 0.3, 14),
    bar([X(E.x1 + 0.45), top - 0.4, s * E.z], [X(xb - 0.3), top - 0.4, s * E.z], 0.3, 14),
  ])), S);
  inside('er_vent_ducts', 'room_wall', merge(box(xa + 0.3, xb - 0.3, top - 0.45, top - 0.15, 0.25, hullZ(36, top) - 0.5), ...[33.0, 36.5].map((x) => box(x - 0.3, x + 0.3, top - 0.75, top - 0.45, 0.25, hullZ(36, top) - 0.5))), S);
  inside('er_light_fittings', 'light_fitting', merge(...[31.5, 34.5, 37.5, 40.5].flatMap((x) => [-3.2, 0, 3.2].map((z) => box(x - 0.6, x + 0.6, top - 0.1, top - 0.04, 0.07, z)))), S);
  // plain local panels at the engines' forward ends (SRC038 p.22 'MAIN ENGINE'; ER01) — no gauges or labels
  inside('er_local_panels', 'console_grey', merge(...[-1, 1].map((s) => box(39.9, 40.3, FP, FP + 1.7, 0.4, s * (E.z + 1.05)))), S);
  // representative piping, valves and a pump on the starboard side (ER04: colour-coded pipes) — NOT real routes
  const pz = hullZ(36, -1.0) - 0.35;
  inside('er_pipes_blue', 'pipe_blue', merge(pipeX(xa + 0.4, xb - 0.4, -1.1, pz, 0.09), bar([X(40.2), -1.1, pz], [X(40.2), FP + 0.6, pz - 0.6], 0.09, 10)), S);
  inside('er_pipes_red', 'pipe_red', merge(pipeX(xa + 0.4, xb - 0.4, -0.65, pz, 0.06), bar([X(35.0), -0.65, pz], [X(35.0), top - 0.3, pz], 0.06, 10)), S);
  inside('er_pipes_green', 'pipe_green', merge(pipeX(xa + 0.4, xb - 0.4, -0.25, pz - 0.05, 0.075), ...[33.0, 37.0, 39.4].flatMap((x) => [at(new THREE.TorusGeometry(0.13, 0.018, 6, 20), x, -0.25, pz - 0.24), bar([X(x), -0.25, pz - 0.07], [X(x), -0.25, pz - 0.24], 0.02)])), S);
  inside('er_pump', 'pipe_blue', merge(at(cyl(0.22, 0.22, 0.5, 14), 40.2, FP + 0.25, pz - 0.6), at(cyl(0.16, 0.16, 0.35, 12), 40.2, FP + 0.68, pz - 0.6)), S);
}

// Generator room (frames 35½ to 30, No. 3 deck plan p.30). SRC038 p.20 records 3 generators (Wärtsilä SACM
// UD25 12V with Leroy Somer alternators). Their arrangement is not documented: three simple generator-set
// forms (engine, alternator, common base frame; ER05 and SRC038 p.22 'GENERATOR', 'ALTERNATOR').
{
  const S = 'generator_room', xa = FRAME_X(35.5), xb = FRAME_X(30), FP = -2.4, top = NO2 - 0.15;
  const zo = Math.max(0.5, halfAt(57, FP) - 0.25);
  inside('gr_floor_plates', 'floor_plate', box(xa + 0.15, xb - 0.15, FP - 0.04, FP, zo), S);
  const eng = [], alt = [], base = [], filt = [];
  for (const z of [-3.1, 0, 3.1]) {
    base.push(box(54.3, 59.3, FP, FP + 0.22, 0.62, z));
    eng.push(rbox(56.0, 59.1, FP + 0.22, FP + 1.0, 0.5, 0.05, z));
    for (const t of [-1, 1]) { const b = new THREE.BoxGeometry(2.8, 0.5, 0.42); b.rotateX(t * 0.45); eng.push(at(b, 57.55, FP + 1.2, z + t * 0.24)); }
    alt.push(at(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 22).rotateZ(Math.PI / 2), 55.2, FP + 0.85, z), box(54.8, 55.6, FP + 1.4, FP + 1.7, 0.3, z));
    filt.push(...[-0.22, 0.22].map((dz) => at(cyl(0.2, 0.2, 0.34, 14), 58.6, FP + 1.62, z + dz)));
  }
  inside('gr_generator_engines', 'engine_cream', merge(...eng), S);
  inside('gr_alternators', 'engine_cream', merge(...alt), S);
  inside('gr_base_frames', 'machinery_black', merge(...base, ...filt), S);
  inside('gr_light_fittings', 'light_fitting', merge(...[54.5, 57.0, 59.5].flatMap((x) => [-1.6, 1.6].map((z) => box(x - 0.6, x + 0.6, top - 0.1, top - 0.04, 0.07, z)))), S);
}

// ---------------------------------------------------------------- GLB writer (indexed geometry)
function writeGlb(parts, file) {
  const bin = []; let offset = 0;
  const bufferViews = [], accessors = [], meshes = [], nodes = [];
  const pushView = (typed, target) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), pad = (4 - (bytes.length % 4)) % 4;
    bin.push(bytes, Buffer.alloc(pad)); bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target }); offset += bytes.length + pad; return bufferViews.length - 1;
  };
  let triangles = 0;
  const groups = { shared: [], as_built: [], later: [], internal: [], interior: [] };
  for (const part of parts) {
    const g = mergeVertices(clean(part.geom), 1e-4);
    const pos = new Float32Array(g.attributes.position.array), nor = new Float32Array(g.attributes.normal.array);
    const count = pos.length / 3, index = g.index.array, tri = index.length / 3; triangles += tri;
    const idx = count < 65535 ? new Uint16Array(index) : new Uint32Array(index);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) { const v = pos[i * 3 + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
    const pv = pushView(pos, 34962), nv = pushView(nor, 34962), iv = pushView(idx, 34963);
    accessors.push({ bufferView: pv, componentType: 5126, count, type: 'VEC3', min, max }, { bufferView: nv, componentType: 5126, count, type: 'VEC3' }, { bufferView: iv, componentType: idx instanceof Uint16Array ? 5123 : 5125, count: index.length, type: 'SCALAR' });
    meshes.push({ name: part.name, primitives: [{ attributes: { POSITION: accessors.length - 3, NORMAL: accessors.length - 2 }, indices: accessors.length - 1, material: MAT_INDEX[part.mat] }] });
    nodes.push({ name: part.name, mesh: meshes.length - 1, extras: { group: part.group, ...part.extras } });
    groups[part.group].push(nodes.length - 1);
  }
  const groupNames = { shared: 'shared', as_built: 'config_as_built', later: 'config_later', internal: 'internal_conceptual', interior: 'interior_spaces' };
  const gi = Object.entries(groups).map(([k, children]) => { nodes.push({ name: groupNames[k], children }); return nodes.length - 1; });
  nodes.push({ name: 'kd_hang_tuah_exterior', children: gi, extras: {
    title: 'KD Hang Tuah: historically informed, approximate reconstruction (Phase 3)', units: 'metres', axes: '+x bow, +y up, +z starboard; y=0 waterline',
    dimensions: { length_overall_m: LOA, beam_m: BEAM, draught_m: DRAUGHT }, note: 'Not an exact replica. Internal structure is conceptual; interiors are approximate reconstructions. See research/model-notes.json and research/evidence-register.json.' } });
  const gltf = {
    asset: { version: '2.0', generator: 'kd-hang-tuah scripts/build-ship-model.mjs (phase 3)', copyright: 'KD Hang Tuah Museum Project — approximate reconstruction' },
    scene: 0, scenes: [{ name: 'KD Hang Tuah', nodes: [nodes.length - 1] }], nodes, meshes, accessors, bufferViews,
    materials: Object.entries(MATERIALS).map(([name, [r, g, b, m, ro, op]]) => ({ name, pbrMetallicRoughness: { baseColorFactor: [r, g, b, op ?? 1], metallicFactor: m, roughnessFactor: ro }, doubleSided: true, ...(op !== undefined ? { alphaMode: 'BLEND' } : {}) })),
    buffers: [{ byteLength: offset }],
  };
  const json = Buffer.from(JSON.stringify(gltf)), jpad = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(jpad, 0x20)]), binChunk = Buffer.concat(bin);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const ch = (buf, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(buf.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, buf]); };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([header, ch(jsonChunk, 0x4e4f534a), ch(binChunk, 0x004e4942)]));
  return { triangles: Math.round(triangles), meshes: meshes.length };
}

const info = writeGlb(parts, OUT);
console.log(`wrote ${OUT.replace(ROOT + '/', '')}: ${info.meshes} meshes, ${info.triangles} triangles`);
