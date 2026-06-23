"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { type DateRange, isoDate, monthShort, parseIso } from "@/lib/dates";
import { cn } from "@/lib/utils";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthOf(s: string): { y: number; m: number } {
  const d = parseIso(s);
  return { y: d.getFullYear(), m: d.getMonth() };
}

/** A compact month-grid range picker. First click sets the start, second click the end
 * (auto-ordered); the shown month follows the latest selection. No external deps. */
export function RangeCalendar({ dateFrom, dateTo, onChange }: DateRange & { onChange: (r: DateRange) => void }) {
  const [view, setView] = useState(() => monthOf(dateTo || dateFrom));
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  // Follow external changes (presets / dropdowns) so the grid shows the new range.
  const [prevTo, setPrevTo] = useState(dateTo);
  if (dateTo !== prevTo) {
    setPrevTo(dateTo);
    setView(monthOf(dateTo || dateFrom));
  }

  const today = isoDate(new Date());
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(view.y, view.m, i + 1))),
  ];

  const step = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (day: string) => {
    if (!pendingStart) {
      setPendingStart(day);
      onChange({ dateFrom: day, dateTo: day });
    } else {
      const [lo, hi] = pendingStart <= day ? [pendingStart, day] : [day, pendingStart];
      setPendingStart(null);
      onChange({ dateFrom: lo, dateTo: hi });
    }
  };

  return (
    <div className="border-border bg-background rounded-lg border p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-6 place-items-center rounded"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-medium">
          {monthShort(view.m)} {view.y}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-6 place-items-center rounded"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="text-muted-foreground/70 grid grid-cols-7 text-center text-[10px]">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`e${i}`} />
          ) : (
            (() => {
              const isEnd = day === dateFrom || day === dateTo;
              const isMid = day > dateFrom && day < dateTo;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  aria-pressed={isEnd}
                  className={cn(
                    "grid h-7 place-items-center rounded text-xs tabular-nums transition-colors",
                    isEnd
                      ? "bg-primary text-primary-foreground font-medium"
                      : isMid
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-muted",
                    !isEnd && day === today && "ring-border ring-1",
                  )}
                >
                  {Number(day.slice(-2))}
                </button>
              );
            })()
          ),
        )}
      </div>
    </div>
  );
}
