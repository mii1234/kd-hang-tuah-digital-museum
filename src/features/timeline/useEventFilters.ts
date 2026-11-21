import { useMemo, useState } from 'react';
import type { HistoricalEvent, MuseumData, Verification } from '../../data/types';
import { decadeOf } from '../../utils/dates';

export interface EventFilters {
  query: string;
  categories: string[]; // empty = all
  decade: number | null;
  status: Verification | null;
}

const EMPTY: EventFilters = { query: '', categories: [], decade: null, status: null };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function useEventFilters(data: MuseumData) {
  const [filters, setFilters] = useState<EventFilters>(EMPTY);

  const categories = useMemo(() => Array.from(new Set(data.events.map((e) => e.Event_Category))), [data.events]);
  const decades = useMemo(() => {
    const set = new Set<number>();
    data.events.forEach((e) => { const d = decadeOf(e.Date); if (d !== null) set.add(d); });
    return Array.from(set).sort((a, b) => a - b);
  }, [data.events]);

  const filtered = useMemo(() => {
    const q = norm(filters.query.trim());
    const terms = q ? q.split(/\s+/) : [];
    return data.events.filter((e: HistoricalEvent) => {
      if (filters.categories.length && !filters.categories.includes(e.Event_Category)) return false;
      if (filters.decade !== null && decadeOf(e.Date) !== filters.decade) return false;
      if (filters.status && e.Verification !== filters.status) return false;
      if (terms.length) {
        const loc = e.Location_ID ? data.locationById.get(e.Location_ID) : undefined;
        const hay = norm([e.Event_Title, e.Event_Title_MS, e.Description, e.Description_MS, e.Event_Category, e.Date, e.Event_ID, loc?.Location_Name, loc?.Location_Name_MS, loc?.Country].filter(Boolean).join(' '));
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [data, filters]);

  const active = filters.query !== '' || filters.categories.length > 0 || filters.decade !== null || filters.status !== null;

  return {
    filters,
    setQuery: (query: string) => setFilters((f) => ({ ...f, query })),
    toggleCategory: (c: string) => setFilters((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] })),
    setDecade: (decade: number | null) => setFilters((f) => ({ ...f, decade })),
    setStatus: (status: Verification | null) => setFilters((f) => ({ ...f, status })),
    clear: () => setFilters(EMPTY),
    active,
    categories,
    decades,
    filtered,
  };
}
