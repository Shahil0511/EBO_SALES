// Date helpers for the date-range filter: ISO conversion, Indian-FY math, quick presets,
// and the month/FY dropdown lists. Ranges are inclusive "YYYY-MM-DD" local-date strings.

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DateRange = { dateFrom: string; dateTo: string };

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function monthShort(month0: number): string {
  return MONTHS_SHORT[month0];
}

/** Indian financial year start-year for a date (the FY begins 1 April). */
export function fyStartYear(d: Date): number {
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // month 3 === April
}

/** Full financial year, e.g. fyRange(2026) → 2026-04-01 … 2027-03-31. */
export function fyRange(startYear: number): DateRange {
  return { dateFrom: `${startYear}-04-01`, dateTo: `${startYear + 1}-03-31` };
}

export function fyLabel(startYear: number): string {
  return `FY ${startYear}–${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function monthRange(year: number, month0: number): DateRange {
  return {
    dateFrom: isoDate(new Date(year, month0, 1)),
    dateTo: isoDate(new Date(year, month0 + 1, 0)), // day 0 of next month = last day
  };
}

export function monthValue(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function monthLabel(year: number, month0: number): string {
  return `${MONTHS_SHORT[month0]} ${year}`;
}

/** "1 Apr 2026 – 23 Jun 2026" (or a single date when from === to). */
export function formatRangeLabel({ dateFrom, dateTo }: DateRange): string {
  const fmt = (s: string) => {
    const d = parseIso(s);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  };
  return dateFrom === dateTo ? fmt(dateFrom) : `${fmt(dateFrom)} – ${fmt(dateTo)}`;
}

function weekStartMonday(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday = 0
  return x;
}

/** Quick presets. To-date concepts (week/month/FY) end today; FY starts 1 April. */
export function datePresets(): { key: string; label: string; range: () => DateRange }[] {
  return [
    {
      key: "today",
      label: "Today",
      range: () => {
        const t = isoDate(new Date());
        return { dateFrom: t, dateTo: t };
      },
    },
    {
      key: "yesterday",
      label: "Yesterday",
      range: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const s = isoDate(d);
        return { dateFrom: s, dateTo: s };
      },
    },
    {
      key: "week",
      label: "This week",
      range: () => ({ dateFrom: isoDate(weekStartMonday(new Date())), dateTo: isoDate(new Date()) }),
    },
    {
      key: "month",
      label: "This month",
      range: () => {
        const n = new Date();
        return { dateFrom: isoDate(new Date(n.getFullYear(), n.getMonth(), 1)), dateTo: isoDate(n) };
      },
    },
    {
      key: "fy",
      label: "This FY",
      range: () => {
        const n = new Date();
        return { dateFrom: `${fyStartYear(n)}-04-01`, dateTo: isoDate(n) };
      },
    },
  ];
}

/** Recent months (newest first) for the month dropdown. */
export function recentMonths(count: number): { value: string; year: number; month0: number; label: string }[] {
  const n = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
    return {
      value: monthValue(d.getFullYear(), d.getMonth()),
      year: d.getFullYear(),
      month0: d.getMonth(),
      label: monthLabel(d.getFullYear(), d.getMonth()),
    };
  });
}

/** Financial years from `earliest` start-year up to the current FY (newest first). */
export function fyOptions(earliest: number): { startYear: number; label: string }[] {
  const current = fyStartYear(new Date());
  return Array.from({ length: current - earliest + 1 }, (_, i) => {
    const y = current - i;
    return { startYear: y, label: fyLabel(y) };
  });
}

/** The month value ("YYYY-MM") iff the range is exactly one whole calendar month, else "". */
export function activeMonthValue({ dateFrom, dateTo }: DateRange): string {
  const f = parseIso(dateFrom);
  const mr = monthRange(f.getFullYear(), f.getMonth());
  return mr.dateFrom === dateFrom && mr.dateTo === dateTo ? monthValue(f.getFullYear(), f.getMonth()) : "";
}

/** The FY start-year iff the range is exactly one whole financial year, else "". */
export function activeFyValue({ dateFrom, dateTo }: DateRange): number | "" {
  if (dateFrom.endsWith("-04-01") && dateTo.endsWith("-03-31")) {
    const sy = Number(dateFrom.slice(0, 4));
    if (fyRange(sy).dateTo === dateTo) return sy;
  }
  return "";
}
