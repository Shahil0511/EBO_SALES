"use client";

import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { type TrendBucket, useTrend } from "@/lib/api/hooks/use-trend";
import { inr, inrFull, num } from "@/lib/format";
import { DURATION_MS, SPRING } from "@/lib/motion/tokens";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtBucket(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

function shortAxis(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return String(v);
}

function ChartTooltip(props: {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: { netRevenue: number; units: number } }>;
}) {
  if (!props.active || !props.payload?.length) return null;
  const point = props.payload[0].payload;
  return (
    <div className="border-border bg-card rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="mb-0.5 font-medium">{props.label}</div>
      <div className="text-muted-foreground">
        Net <span className="text-foreground font-medium">{inrFull(point.netRevenue)}</span>
      </div>
      <div className="text-muted-foreground">
        Units <span className="text-foreground font-medium">{num(point.units)}</span>
      </div>
    </div>
  );
}

type ChartType = "area" | "bar" | "line";
const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: "area", label: "Area" },
  { key: "bar", label: "Bars" },
  { key: "line", label: "Line" },
];
const BUCKETS: { key: TrendBucket; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
];

/** A segmented control with a sliding `layoutId` pill. Generic over the option key. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  layoutId: string;
}) {
  return (
    <div className="bg-muted/60 flex gap-0.5 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "relative rounded-md px-2.5 py-1 text-xs transition-colors",
            value === o.key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.key && (
            <m.span
              layoutId={layoutId}
              className="bg-primary absolute inset-0 rounded-md"
              transition={SPRING.layout}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TrendChart({ className }: { className?: string }) {
  const { filters } = useFilters();
  const [bucket, setBucket] = useState<TrendBucket>("day");
  const [chartType, setChartType] = useState<ChartType>("area");
  const reduce = useReducedMotion();
  // Draw the chart ONCE (on first load); later data updates snap (onAnimationEnd flips this).
  const [hasAnimated, setHasAnimated] = useState(false);
  const { data, isLoading, isError } = useTrend(filters, bucket);

  const points = (data?.points ?? []).map((p) => ({
    label: fmtBucket(p.bucket),
    netRevenue: p.netRevenue,
    units: p.units,
  }));
  const total = points.reduce((s, p) => s + p.netRevenue, 0);

  // Shared animation props for whichever series is active.
  const anim = {
    isAnimationActive: !reduce && !hasAnimated,
    animationDuration: DURATION_MS.chart,
    animationEasing: "ease-out" as const,
    animationBegin: 80,
    onAnimationEnd: () => setHasAnimated(true),
  };

  return (
    <section className={cn("border-border bg-card shadow-card flex flex-col rounded-xl border p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold">Revenue trend</h3>
          <p className="text-muted-foreground text-xs">
            <AnimatedNumber value={total} format={inr} /> net
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Segmented value={chartType} onChange={setChartType} options={CHART_TYPES} layoutId="trendType" />
          <Segmented value={bucket} onChange={setBucket} options={BUCKETS} layoutId="trendBucket" />
        </div>
      </div>
      <div className="text-muted-foreground h-64 w-full text-xs">
        {isError ? (
          <div className="grid h-full place-items-center text-destructive">Failed to load trend</div>
        ) : isLoading ? (
          <Skeleton className="size-full rounded-lg" />
        ) : points.length === 0 ? (
          <div className="grid h-full place-items-center">No data in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={shortAxis}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              {chartType === "area" && (
                <Area
                  type="monotone"
                  dataKey="netRevenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={points.length === 1}
                  {...anim}
                />
              )}
              {chartType === "bar" && (
                <Bar dataKey="netRevenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} {...anim} />
              )}
              {chartType === "line" && (
                <Line
                  type="monotone"
                  dataKey="netRevenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  {...anim}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
