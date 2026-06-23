"use client";

import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { type BreakdownDimension, useBreakdown } from "@/lib/api/hooks/use-breakdown";
import { inr } from "@/lib/format";
import { EASE } from "@/lib/motion/tokens";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

// Only these dimensions can click-to-filter, because their label IS the filter value
// (category_name / brand_name / channel code). Store/salesperson/region are display-only.
type ClickField = "categories" | "brands" | "channels";
type BreakdownView = "bars" | "donut";

const VIEWS: { key: BreakdownView; label: string }[] = [
  { key: "bars", label: "Bars" },
  { key: "donut", label: "Donut" },
];
// Distinct slice colors for the donut (the single-hue bars use the `color` prop instead).
const DONUT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function DonutTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; share: number } }>;
}) {
  if (!props.active || !props.payload?.length) return null;
  const p = props.payload[0].payload;
  return (
    <div className="border-border bg-card rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{p.label}</div>
      <div className="text-muted-foreground">
        <span className="text-foreground font-medium">{inr(p.value)}</span> · {p.share.toFixed(0)}%
      </div>
    </div>
  );
}

export function BreakdownBars({
  dimension,
  title,
  color = "var(--chart-1)",
  filterField,
  defaultView = "bars",
  className,
}: {
  dimension: BreakdownDimension;
  title: string;
  color?: string;
  filterField?: ClickField;
  defaultView?: BreakdownView;
  className?: string;
}) {
  const { filters, setFilters } = useFilters();
  const reduce = useReducedMotion();
  const [view, setView] = useState<BreakdownView>(defaultView);
  const { data, isLoading, isError } = useBreakdown(filters, dimension, 8);

  const items = data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => Math.abs(i.netRevenue)));
  const totalAbs = items.reduce((s, i) => s + Math.abs(i.netRevenue), 0) || 1;
  const selected = filterField ? filters[filterField] : [];

  const toggle = (label: string) => {
    if (!filterField) return;
    const current = filters[filterField];
    setFilters({
      [filterField]: current.includes(label) ? current.filter((v) => v !== label) : [...current, label],
    });
  };

  // Donut needs positive values; precompute share for the tooltip.
  const donutData = items.map((it) => ({
    label: it.label,
    value: Math.abs(it.netRevenue),
    share: (Math.abs(it.netRevenue) / totalAbs) * 100,
  }));

  return (
    <section className={cn("border-border bg-card shadow-card flex flex-col rounded-xl border p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        <Segmented value={view} onChange={setView} options={VIEWS} layoutId={`bd-${dimension}`} />
      </div>

      {/* Fixed-height chart area → every breakdown card is the same height (no blank-half). */}
      <div className="h-64">
        {isError ? (
          <p className="text-destructive text-xs">Failed to load</p>
        ) : isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground grid h-full place-items-center text-xs">No data in range</div>
        ) : view === "bars" ? (
          <ul className="flex h-full flex-col justify-center gap-1">
            {items.map((item, i) => {
              const isSelected = selected.includes(item.label);
              const width = `${(Math.abs(item.netRevenue) / max) * 100}%`;
              const bar = (
                <>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("truncate", isSelected && "text-primary font-medium")} title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono">{inr(item.netRevenue)}</span>
                  </div>
                  <div className="bg-muted mt-0.5 h-1.5 w-full overflow-hidden rounded-full">
                    <m.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width }}
                      transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE.out, delay: i * 0.03 }}
                    />
                  </div>
                </>
              );
              return (
                <li key={item.label}>
                  {filterField ? (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggle(item.label)}
                      className="hover:bg-muted/60 block w-full cursor-pointer rounded-md px-1 py-0.5 text-left"
                    >
                      {bar}
                    </button>
                  ) : (
                    <div className="px-1 py-0.5">{bar}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="88%"
                    paddingAngle={1.5}
                    stroke="none"
                    isAnimationActive={!reduce}
                    onClick={filterField ? (_, index) => toggle(items[index].label) : undefined}
                  >
                    {donutData.map((d, i) => (
                      <Cell
                        key={d.label}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        className={cn("outline-none", filterField && "cursor-pointer")}
                        opacity={selected.length > 0 && !selected.includes(d.label) ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 pt-2 text-[11px]">
              {donutData.map((d, i) => {
                const isSelected = selected.includes(d.label);
                const content = (
                  <>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className={cn("truncate", isSelected && "text-primary font-medium")}>{d.label}</span>
                  </>
                );
                return (
                  <li key={d.label} className="max-w-[8rem]">
                    {filterField ? (
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggle(d.label)}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {content}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
