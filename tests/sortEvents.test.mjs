// Tests for timeline ordering with mixed-precision dates.  Run with:  npm test
// Uses Node's built-in test runner and loads the TypeScript module through Vite (no extra dependency).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let server, sortEvents, buildSortKeys, compareKeys, checkEventOrder, parseHistoricalDate, dateSortKey;

before(async () => {
  server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  ({ sortEvents, buildSortKeys, compareKeys, checkEventOrder } = await server.ssrLoadModule('/src/data/sortEvents.ts'));
  ({ parseHistoricalDate, dateSortKey } = await server.ssrLoadModule('/src/utils/dates.ts'));
});
after(async () => { await server?.close(); });

const ev = (id, date, order, precision) => ({ Event_ID: id, Date: date, Date_Precision: precision ?? null, Display_Order: order });
const ids = (list) => list.map((e) => e.Event_ID);
const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);

// Deterministic shuffle (mulberry32) so failures can be reproduced.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(list, seed) { const r = rng(seed); const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// A deliberately awkward fixture: every precision, shared years and months, ties, gaps and bad dates.
const FIXTURE = [
  ev('Y73', '1973', 9), ev('D73MAY', '1973-05-16', 8), ev('D73FEB', '1973-02-01', 10), ev('M73MAR', '1973-03', 7),
  ev('M76MAR', '1976-03', 11), ev('D76MAY', '1976-05-06', 12), ev('D76SEP', '1976-09-20', 13), ev('D76MAR12', '1976-03-12', 14),
  ev('Y77', '1977', 14), ev('M77APR', '1977-04', 15), ev('D77JUL', '1977-07-22', 16),
  ev('M77OCT', '1977-10', 2), ev('D77OCT14', '1977-10-14', 1), ev('D77OCT18', '1977-10-18', 3),
  ev('D80A', '1980-01-01', 5), ev('D80B', '1980-01-01', 5), ev('D80C', '1980-01-01', 4),
  ev('NOORD95', '1995', undefined), ev('D95', '1995-08-22', 25),
  ev('COARSE', '1999-06-15', 40, 'year'), ev('D99', '1999-02-02', 41),
  ev('BAD', '1977-13-01', 2), ev('NODATE', '', 1), ev('LATE', '2027', 99),
];

// ---------------------------------------------------------------------------------------------
test('the comparator proposed in the first CODE1 draft is NOT transitive (documents the bug)', () => {
  const old = (a, b) => {
    const pa = parseHistoricalDate(a.Date, a.Date_Precision), pb = parseHistoricalDate(b.Date, b.Date_Precision);
    if (pa && pb) {
      if (pa.year !== pb.year) return pa.year - pb.year;
      if (pa.precision === 'year' || pb.precision === 'year') return (a.Display_Order ?? 0) - (b.Display_Order ?? 0);
      if (pa.month !== pb.month) return (pa.month ?? 0) - (pb.month ?? 0);
      if (pa.precision === 'month' || pb.precision === 'month') return (a.Display_Order ?? 0) - (b.Display_Order ?? 0);
    }
    const d = dateSortKey(pa) - dateSortKey(pb);
    return d !== 0 ? d : (a.Display_Order ?? 0) - (b.Display_Order ?? 0);
  };
  const A = ev('A', '1973', 9), B = ev('B', '1973-05-16', 8), C = ev('C', '1973-02-01', 10);
  assert.ok(old(B, A) < 0, 'B before A');
  assert.ok(old(A, C) < 0, 'A before C');
  assert.ok(old(C, B) < 0, 'C before B  → cycle B < A < C < B');
});

test('new ordering is a strict total order on the fixture (reflexive, antisymmetric, transitive over all triples)', () => {
  const keys = buildSortKeys(FIXTURE);
  const c = (a, b) => compareKeys(keys.get(a), keys.get(b));
  let triples = 0;
  for (const a of FIXTURE) {
    assert.equal(c(a, a), 0);
    for (const b of FIXTURE) {
      assert.equal(sign(c(a, b)) + sign(c(b, a)), 0, `antisymmetry ${a.Event_ID}/${b.Event_ID}`);
      if (a !== b) assert.notEqual(c(a, b), 0, `distinct events never tie: ${a.Event_ID}/${b.Event_ID}`);
      for (const d of FIXTURE) {
        triples++;
        if (c(a, b) < 0 && c(b, d) < 0) assert.ok(c(a, d) < 0, `transitivity ${a.Event_ID} < ${b.Event_ID} < ${d.Event_ID}`);
      }
    }
  }
  assert.equal(triples, FIXTURE.length ** 3);
});

test('result is identical for 1,000 different input orders (deterministic)', () => {
  const expected = ids(sortEvents(FIXTURE));
  for (let seed = 1; seed <= 1000; seed++) assert.deepEqual(ids(sortEvents(shuffle(FIXTURE, seed))), expected, `seed ${seed}`);
});

test('the full fixture sorts to the documented order', () => {
  assert.deepEqual(ids(sortEvents(FIXTURE)), [
    'M73MAR', 'D73MAY', 'Y73', 'D73FEB',                               // 1973 has a year-only event → Display_Order 7, 8, 9, 10
    'M76MAR', 'D76MAR12', 'D76MAY', 'D76SEP',                          // no year-only event; March has a month-only event → Display_Order inside March
    'D77OCT14', 'M77OCT', 'D77OCT18', 'Y77', 'M77APR', 'D77JUL',       // 1977 has a year-only event → Display_Order 1, 2, 3, 14, 15, 16
    'D80C', 'D80A', 'D80B',                                            // same day → Display_Order, then Event_ID
    'D95', 'NOORD95',                                                  // missing Display_Order goes last in its group
    'COARSE', 'D99',                                                   // '1999-06-15' declared year-only is treated as year-only
    'LATE',
    'NODATE', 'BAD',                                                   // undated / malformed last, by Display_Order
  ]);
});

test('same year: a year-only event is placed by Display_Order among exact dates', () => {
  const list = [ev('COMM', '1973-05-16', 8), ev('FAREAST', '1973', 9), ev('LATER', '1973-11-01', 10)];
  for (let s = 1; s <= 50; s++) assert.deepEqual(ids(sortEvents(shuffle(list, s))), ['COMM', 'FAREAST', 'LATER']);
  assert.deepEqual(checkEventOrder(list), []);
});

test('same month: a month-only event is placed by Display_Order among exact days', () => {
  const list = [ev('D14', '1977-10-14', 1), ev('MONTH', '1977-10', 2), ev('D18', '1977-10-18', 3)];
  for (let s = 1; s <= 50; s++) assert.deepEqual(ids(sortEvents(shuffle(list, s))), ['D14', 'MONTH', 'D18']);
  assert.deepEqual(checkEventOrder(list), []);
});

test('same year, different months, no year-only event: months decide, Display_Order cannot override them', () => {
  const list = [ev('MAY', '1976-05-06', 1), ev('MARCH', '1976-03', 2), ev('SEP', '1976-09-20', 3)];
  assert.deepEqual(ids(sortEvents(list)), ['MARCH', 'MAY', 'SEP']);
  assert.deepEqual(checkEventOrder(list), []);
});

test('all exact dates: chronology wins even when Display_Order disagrees', () => {
  const list = [ev('C', '1995-10-09', 1), ev('A', '1995-08-22', 3), ev('B', '1995-09-01', 2)];
  assert.deepEqual(ids(sortEvents(list)), ['A', 'B', 'C']);
});

test('different years: year always comes first', () => {
  const list = [ev('Y2', '1977', 1), ev('Y1', '1976-12-31', 99), ev('Y3', '1978-01', 0)];
  assert.deepEqual(ids(sortEvents(list)), ['Y1', 'Y2', 'Y3']);
});

test('same date ties: Display_Order, then Event_ID', () => {
  const list = [ev('B', '1980-01-01', 5), ev('A', '1980-01-01', 5), ev('C', '1980-01-01', 4)];
  assert.deepEqual(ids(sortEvents(list)), ['C', 'A', 'B']);
});

test('missing Display_Order in a Display_Order group: placed last in that group, with a warning', () => {
  const list = [ev('NOORD', '1995', undefined), ev('EXACT', '1995-08-22', 25)];
  assert.deepEqual(ids(sortEvents(list)), ['EXACT', 'NOORD']);
  const w = checkEventOrder(list);
  assert.equal(w.length, 1); assert.equal(w[0].id, 'NOORD'); assert.equal(w[0].level, 'warning');
});

test('Display_Order that contradicts comparable dates in a Display_Order group is reported', () => {
  const list = [ev('MAY', '1973-05-16', 8), ev('YEAR', '1973', 9), ev('FEB', '1973-02-01', 10)];
  assert.deepEqual(ids(sortEvents(list)), ['MAY', 'YEAR', 'FEB']);   // follows Display_Order, consistently
  const w = checkEventOrder(list);
  assert.equal(w.length, 1); assert.equal(w[0].id, 'MAY'); assert.match(w[0].message, /its date is later/);
});

test('undated and malformed dates sort last, by Display_Order then Event_ID', () => {
  const list = [ev('BAD', '1977-13-01', 2), ev('OK', '2000', 50), ev('NONE', '', 1), ev('NONE2', '', 1)];
  assert.deepEqual(ids(sortEvents(list)), ['OK', 'NONE', 'NONE2', 'BAD']);
});

test('does not modify the input array', () => {
  const list = [ev('B', '1999', 2), ev('A', '1998', 1)];
  const copy = ids(list);
  sortEvents(list);
  assert.deepEqual(ids(list), copy);
});

for (const [label, dir, count] of [['public events.json (30 Verified events)', ['public', 'data'], 30], ['research register events.json (all 45 records)', ['research', 'data'], 45]]) {
  test(`${label}: order matches Display_Order, no warnings, identical for 500 input orders`, async () => {
    const events = JSON.parse(await readFile(path.join(root, ...dir, 'events.json'), 'utf8'));
    assert.equal(events.length, count);
    if (count === 45) assert.deepEqual(events.map((e) => e.Display_Order).sort((a, b) => a - b), Array.from({ length: 45 }, (_, i) => i + 1), 'research Display_Order is 1–45');
    const sorted = ids(sortEvents(events));
    const byOrder = ids([...events].sort((a, b) => a.Display_Order - b.Display_Order));
    assert.deepEqual(sorted, byOrder);
    assert.deepEqual(checkEventOrder(events), []);
    for (let s = 1; s <= 500; s++) assert.deepEqual(ids(sortEvents(shuffle(events, s))), sorted, `seed ${s}`);
  });
}
