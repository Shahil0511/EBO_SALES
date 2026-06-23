"use client";

import { FilterGroup } from "@/components/filters/filter-group";
import { RangeCalendar } from "@/components/filters/range-calendar";
import {
  type DateRange,
  activeFyValue,
  activeMonthValue,
  datePresets,
  formatRangeLabel,
  fyOptions,
  fyRange,
  monthRange,
  recentMonths,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const selectClass =
  "border-border bg-background h-8 min-w-0 rounded-md border px-1.5 text-xs focus:outline-none";

export function DateRangeGroup({
  dateFrom,
  dateTo,
  onChange,
}: DateRange & { onChange: (r: DateRange) => void }) {
  const range = { dateFrom, dateTo };
  const presets = datePresets();
  const months = recentMonths(18);
  const fys = fyOptions(2021);

  const activePreset = presets.find((p) => {
    const r = p.range();
    return r.dateFrom === dateFrom && r.dateTo === dateTo;
  })?.key;
  const monthVal = activeMonthValue(range);
  const fyVal = activeFyValue(range);

  return (
    <FilterGroup title="Date range" defaultOpen>
      <div className="space-y-2">
        {/* Quick presets */}
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.range())}
              aria-pressed={activePreset === p.key}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                activePreset === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pick a whole month / financial year */}
        <div className="grid grid-cols-2 gap-1.5">
          <select
            aria-label="Select month"
            value={monthVal}
            onChange={(e) => {
              const m = months.find((x) => x.value === e.target.value);
              if (m) onChange(monthRange(m.year, m.month0));
            }}
            className={selectClass}
          >
            <option value="" disabled>
              Month…
            </option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Select financial year"
            value={fyVal === "" ? "" : String(fyVal)}
            onChange={(e) => {
              if (e.target.value) onChange(fyRange(Number(e.target.value)));
            }}
            className={selectClass}
          >
            <option value="" disabled>
              FY…
            </option>
            {fys.map((f) => (
              <option key={f.startYear} value={f.startYear}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Current selection + the calendar for a custom range */}
        <div className="text-foreground text-xs font-medium">{formatRangeLabel(range)}</div>
        <RangeCalendar dateFrom={dateFrom} dateTo={dateTo} onChange={onChange} />
      </div>
    </FilterGroup>
  );
}
