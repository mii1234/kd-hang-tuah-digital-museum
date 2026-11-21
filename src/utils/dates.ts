import type { DatePrecision } from '../data/types';

// Accepted date strings: "1977", "1977-07" or "1977-07-22".
// A year-only date is never turned into an exact day: we keep the precision
// alongside the value and format it accordingly.
const DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

export interface ParsedDate {
  year: number;
  month: number | null; // 1-12
  day: number | null;
  precision: DatePrecision;
}

export function parseHistoricalDate(value: string | null | undefined, declared?: DatePrecision | null): ParsedDate | null {
  if (!value || typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : null;
  const day = m[3] ? Number(m[3]) : null;
  if (month !== null && (month < 1 || month > 12)) return null;
  if (day !== null) {
    const max = new Date(Date.UTC(year, month!, 0)).getUTCDate();
    if (day < 1 || day > max) return null;
  }
  const inferred: DatePrecision = day !== null ? 'day' : month !== null ? 'month' : 'year';
  // If the JSON declares a coarser precision than the string, respect the declaration
  // (e.g. "1977-01-01" with Date_Precision "year" is shown as "1977").
  const order: DatePrecision[] = ['year', 'month', 'day'];
  const precision = declared && order.indexOf(declared) < order.indexOf(inferred) ? declared : inferred;
  return {
    year,
    month: precision === 'year' ? null : month,
    day: precision === 'day' ? day : null,
    precision,
  };
}

/** Numeric key for chronological sorting. Less precise dates sort to the start of their period. */
export function dateSortKey(p: ParsedDate | null): number {
  if (!p) return Number.POSITIVE_INFINITY;
  return p.year * 10000 + (p.month ?? 0) * 100 + (p.day ?? 0);
}

/** Continuous value in years, used to position items on the time scrubber. Mid-period for vague dates. */
export function dateToYearFraction(p: ParsedDate | null): number | null {
  if (!p) return null;
  if (p.precision === 'year') return p.year + 0.5;
  if (p.precision === 'month') return p.year + (p.month! - 0.5) / 12;
  return p.year + (p.month! - 1) / 12 + (p.day! - 0.5) / 365;
}

const MONTHS: Record<'en' | 'ms', string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
};

export function formatHistoricalDate(value: string | null | undefined, precision?: DatePrecision | null, lang: 'en' | 'ms' = 'en'): string {
  const p = parseHistoricalDate(value, precision);
  if (!p) return value ? value : lang === 'ms' ? 'Tarikh tidak diketahui' : 'Date unknown';
  if (p.precision === 'year') return String(p.year);
  const month = MONTHS[lang][p.month! - 1];
  if (p.precision === 'month') return `${month} ${p.year}`;
  return `${p.day} ${month} ${p.year}`;
}

export function formatRange(start: string | null | undefined, end: string | null | undefined, precision?: DatePrecision | null, lang: 'en' | 'ms' = 'en'): string {
  const a = formatHistoricalDate(start, precision, lang);
  if (!end) return a;
  return `${a} – ${formatHistoricalDate(end, null, lang)}`;
}

export function precisionLabel(p: DatePrecision | null | undefined, lang: 'en' | 'ms'): string {
  if (!p || p === 'day') return '';
  if (lang === 'ms') return p === 'year' ? 'tahun sahaja' : 'bulan sahaja';
  return p === 'year' ? 'year only' : 'month only';
}

export function decadeOf(value: string): number | null {
  const p = parseHistoricalDate(value);
  return p ? Math.floor(p.year / 10) * 10 : null;
}
