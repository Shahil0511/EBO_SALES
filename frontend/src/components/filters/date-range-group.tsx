"use client";

import { FilterGroup } from "@/components/filters/filter-group";

type Range = { dateFrom: string; dateTo: string };

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const PRESETS: { key: string; label: string; range: () => Range }[] = [
  { key: "7", label: "7d", range: () => ({ dateFrom: isoDate(daysAgo(6)), dateTo: isoDate(new Date()) }) },
  { key: "30", label: "30d", range: () => ({ dateFrom: isoDate(daysAgo(29)), dateTo: isoDate(new Date()) }) },
  { key: "90", label: "90d", range: () => ({ dateFrom: isoDate(daysAgo(89)), dateTo: isoDate(new Date()) }) },
  {
    key: "mtd",
    label: "Month",
    range: () => {
      const now = new Date();
      return { dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: isoDate(now) };
    },
  },
  {
    key: "ytd",
    label: "Year",
    range: () => {
      const now = new Date();
      return { dateFrom: isoDate(new Date(now.getFullYear(), 0, 1)), dateTo: isoDate(now) };
    },
  },
];

const inputClass =
  "border-border bg-background h-8 flex-1 rounded-md border px-2 text-xs focus:outline-none";

export function DateRangeGroup({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (range: Range) => void;
}) {
  return (
    <FilterGroup title="Date range" defaultOpen>
      <div className="mb-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.range())}
            className="border-border hover:bg-muted rounded-full border px-2.5 py-1 text-xs"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          className={inputClass}
        />
        <span className="text-muted-foreground text-xs">→</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          className={inputClass}
        />
      </div>
    </FilterGroup>
  );
}
