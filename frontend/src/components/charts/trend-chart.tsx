"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { type TrendBucket, useTrend } from "@/lib/api/hooks/use-trend";
import { inr, inrFull, num } from "@/lib/format";
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

export function TrendChart({ className }: { className?: string }) {
  const { filters } = useFilters();
  const [bucket, setBucket] = useState<TrendBucket>("day");
  const { data, isLoading, isError } = useTrend(filters, bucket);

  const points = (data?.points ?? []).map((p) => ({
    label: fmtBucket(p.bucket),
    netRevenue: p.netRevenue,
    units: p.units,
  }));
  const total = points.reduce((s, p) => s + p.netRevenue, 0);

  return (
    <section className={cn("border-border bg-card flex flex-col rounded-xl border p-4", className)}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-heading text-sm font-semibold">Revenue trend</h3>
          <p className="text-muted-foreground text-xs">{inr(total)} net</p>
        </div>
        <div className="flex gap-1">
          {(["day", "week"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={cn(
                "rounded-md px-2 py-1 text-xs capitalize",
                bucket === b
                  ? "bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted border",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="text-muted-foreground h-64 w-full text-xs">
        {isError ? (
          <div className="grid h-full place-items-center text-destructive">Failed to load trend</div>
        ) : isLoading ? (
          <div className="grid h-full place-items-center">Loading…</div>
        ) : points.length === 0 ? (
          <div className="grid h-full place-items-center">No data in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
              <Area
                type="monotone"
                dataKey="netRevenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#trendGrad)"
                dot={points.length === 1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
