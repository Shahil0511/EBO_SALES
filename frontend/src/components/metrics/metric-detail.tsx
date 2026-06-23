"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageCrumb } from "@/components/layout/page-crumb";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { type MetricKey, useMetricDetail } from "@/lib/api/hooks/use-metric-detail";
import { inr, inrFull, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

type Unit = "currency" | "number" | "percent";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DIM_LABELS: Record<string, string> = {
  store: "By store",
  category: "By category",
  brand: "By brand",
  channel: "By channel",
};

/** Compact, unit-aware format (₹ Cr/L · count · %). */
function fmt(value: number, unit: Unit): string {
  if (unit === "currency") return inr(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return num(value);
}
/** Full precision for tooltips. */
function fmtFull(value: number, unit: Unit): string {
  if (unit === "currency") return inrFull(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return num(value);
}
/** Short axis tick per unit. */
function axisTick(unit: Unit, v: number): string {
  const a = Math.abs(v);
  if (unit === "percent") return `${v.toFixed(0)}%`;
  if (unit === "currency") {
    if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (a >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
  }
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return String(v);
}
function fmtBucket(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

function DeltaPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(pct).toFixed(1)} percent vs previous period`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        up ? "bg-chart-3/15 text-chart-3" : "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function MetricDetail({ metric }: { metric: MetricKey }) {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useMetricDetail(filters, metric);
  const unit: Unit = data?.unit ?? "number";

  const points = (data?.trend ?? []).map((p) => ({ label: fmtBucket(p.bucket), value: p.value }));

  // The underlying records for this metric — returns are scoped to qty < 0.
  const txnExtra = metric === "returns_value" ? { qtyMax: -1 } : undefined;
  const txnTitle =
    metric === "returns_value"
      ? "Return transactions"
      : metric === "customers"
        ? "Customer transactions"
        : "Transactions";

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageCrumb title={data?.label ?? "Metric"} />
      {isError ? (
          <div className="border-border bg-card text-destructive rounded-xl border p-6 text-sm">
            Couldn&apos;t load this metric. Try going back to the dashboard.
          </div>
        ) : isLoading || !data ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </>
        ) : (
          <>
            {/* Headline */}
            <section className="border-border bg-card shadow-card rounded-xl border p-5">
              <p className="text-muted-foreground text-sm">{data.label}</p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <span className="font-heading text-3xl font-semibold tracking-tight">
                  <AnimatedNumber value={data.value} format={(n) => fmt(n, unit)} />
                </span>
                {data.delta?.pctChange != null && <DeltaPill pct={data.delta.pctChange} />}
              </div>
              {data.delta && (
                <p className="text-muted-foreground mt-1 text-xs">
                  vs <span className="text-foreground font-medium">{fmt(data.delta.previous ?? 0, unit)}</span>{" "}
                  in the previous period
                </p>
              )}
            </section>

            {/* Trend */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Trend over time</h3>
              <div className="text-muted-foreground h-64 w-full text-xs">
                {points.length === 0 ? (
                  <div className="grid h-full place-items-center">No data in this range</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                      <defs>
                        <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v: number) => axisTick(unit, v)}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <Tooltip
                        content={({ active, label, payload }) =>
                          active && payload?.length ? (
                            <div className="border-border bg-card rounded-md border px-3 py-2 text-xs shadow-md">
                              <div className="mb-0.5 font-medium">{label}</div>
                              <div className="text-foreground font-medium">
                                {fmtFull(Number(payload[0].value), unit)}
                              </div>
                            </div>
                          ) : null
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#metricGrad)"
                        dot={points.length === 1}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.breakdowns.map((group) => {
                const maxValue = Math.max(1, ...group.items.map((i) => Math.abs(i.value)));
                return (
                  <section key={group.dimension} className="border-border bg-card shadow-card rounded-xl border p-4">
                    <h3 className="font-heading mb-3 text-sm font-semibold">
                      {DIM_LABELS[group.dimension] ?? group.dimension}
                    </h3>
                    {group.items.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No data</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {group.items.map((item) => (
                          <li key={item.label}>
                            <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                              <span className="truncate" title={item.label}>
                                {item.label}
                              </span>
                              <span className="text-muted-foreground shrink-0 font-mono">
                                {fmt(item.value, unit)}
                                {unit !== "percent" && (
                                  <span className="text-muted-foreground/70"> · {item.share.toFixed(0)}%</span>
                                )}
                              </span>
                            </div>
                            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${(Math.abs(item.value) / maxValue) * 100}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            <TransactionsTable extraFilters={txnExtra} title={txnTitle} />
          </>
        )}
    </div>
  );
}
