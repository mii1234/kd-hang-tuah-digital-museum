import type { DataIssue, HistoricalEvent } from './types';
import { parseHistoricalDate, type ParsedDate } from '../utils/dates';

/*
 * Timeline ordering for events whose dates have different precision ("1973", "May 1973", "16 May 1973").
 *
 * A pairwise rule ("use Display_Order when one date is vague, otherwise use the dates") is not
 * transitive and can give inconsistent orders. Instead, every event gets a fixed sort key, computed
 * once from the whole list, and events are sorted by comparing those keys element by element.
 * Comparing fixed tuples is always transitive, so the order is deterministic and does not depend on
 * the order of events in events.json.
 *
 * The rule, applied to the whole list:
 *   1. Events are ordered by year. Undated or malformed dates go last.
 *   2. In a year that contains at least one year-only event, the dates cannot say where that event
 *      belongs, so every event in that year is ordered by Display_Order (then month, day, Event_ID).
 *   3. Otherwise events are ordered by month. In a month that contains at least one month-only event,
 *      every event in that month is ordered by Display_Order (then day, Event_ID).
 *   4. Otherwise events are ordered by day, then Display_Order, then Event_ID.
 * Events without a Display_Order sort after those with one inside rules 2 and 3.
 *
 * Because rules 2 and 3 trust Display_Order, checkEventOrder() warns when Display_Order contradicts
 * dates that can be compared, or is missing where it is needed.
 */

type SortKey = [number, number, number, number, number, string];

const MISSING_ORDER = Number.MAX_SAFE_INTEGER;
const orderOf = (e: HistoricalEvent) => (typeof e.Display_Order === 'number' && Number.isFinite(e.Display_Order) ? e.Display_Order : MISSING_ORDER);

interface Parsed { e: HistoricalEvent; p: ParsedDate | null }

function groupFlags(items: Parsed[]) {
  const vagueYears = new Set<number>();
  const vagueMonths = new Set<string>();
  for (const { p } of items) {
    if (!p) continue;
    if (p.precision === 'year') vagueYears.add(p.year);
    else if (p.precision === 'month') vagueMonths.add(`${p.year}-${p.month}`);
  }
  return { vagueYears, vagueMonths };
}

export function buildSortKeys(events: HistoricalEvent[]): Map<HistoricalEvent, SortKey> {
  const items: Parsed[] = events.map((e) => ({ e, p: parseHistoricalDate(e.Date, e.Date_Precision) }));
  const { vagueYears, vagueMonths } = groupFlags(items);
  const keys = new Map<HistoricalEvent, SortKey>();
  for (const { e, p } of items) {
    const order = orderOf(e);
    const id = e.Event_ID ?? '';
    let key: SortKey;
    if (!p) key = [1, 0, order, 0, 0, id];                                             // undated: last
    else if (vagueYears.has(p.year)) key = [0, p.year, order, p.month ?? 0, p.day ?? 0, id];      // rule 2
    else if (vagueMonths.has(`${p.year}-${p.month}`)) key = [0, p.year, p.month ?? 0, order, p.day ?? 0, id]; // rule 3
    else key = [0, p.year, p.month ?? 0, p.day ?? 0, order, id];                          // rule 4
    keys.set(e, key);
  }
  return keys;
}

export function compareKeys(a: SortKey, b: SortKey): number {
  for (let i = 0; i < 5; i++) {
    const d = (a[i] as number) - (b[i] as number);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return a[5] < b[5] ? -1 : a[5] > b[5] ? 1 : 0;
}

export function sortEvents(events: HistoricalEvent[]): HistoricalEvent[] {
  const keys = buildSortKeys(events);
  return [...events].sort((a, b) => compareKeys(keys.get(a)!, keys.get(b)!));
}

/** Compares two dates only as far as both are known. Returns null when the dates cannot decide. */
function chronology(a: ParsedDate, b: ParsedDate): number | null {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month == null || b.month == null) return null;
  if (a.month !== b.month) return a.month - b.month;
  if (a.day == null || b.day == null) return null;
  return a.day !== b.day ? a.day - b.day : null;
}

/** Warnings for groups where Display_Order decides the order (rules 2 and 3). */
export function checkEventOrder(events: HistoricalEvent[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const items: Parsed[] = events.map((e) => ({ e, p: parseHistoricalDate(e.Date, e.Date_Precision) }));
  const { vagueYears, vagueMonths } = groupFlags(items);
  const groups = new Map<string, Parsed[]>();
  for (const it of items) {
    if (!it.p) continue;
    const g = vagueYears.has(it.p.year) ? `${it.p.year}` : vagueMonths.has(`${it.p.year}-${it.p.month}`) ? `${it.p.year}-${String(it.p.month).padStart(2, '0')}` : null;
    if (!g) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(it);
  }
  for (const [g, list] of groups) {
    for (const { e } of list) {
      if (orderOf(e) === MISSING_ORDER) {
        issues.push({ file: 'events.json', id: e.Event_ID, level: 'warning', message: `${g} contains an event dated only to ${g.length === 4 ? 'the year' : 'the month'}, so events in ${g} are ordered by Display_Order. This event has no Display_Order and is placed last in ${g}.` });
      }
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const a = list[i], b = list[j];
        if (orderOf(a.e) === MISSING_ORDER || orderOf(b.e) === MISSING_ORDER) continue;
        const c = chronology(a.p!, b.p!);
        if (c !== null && c > 0 && orderOf(a.e) < orderOf(b.e)) {
          issues.push({ file: 'events.json', id: a.e.Event_ID, level: 'warning', message: `Display_Order places ${a.e.Event_ID} (${a.e.Date}) before ${b.e.Event_ID} (${b.e.Date}), but its date is later. In ${g} the timeline follows Display_Order, so fix one of the two values.` });
        }
      }
    }
  }
  return issues;
}
