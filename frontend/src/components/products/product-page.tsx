"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageCrumb } from "@/components/layout/page-crumb";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreakdown } from "@/lib/api/hooks/use-breakdown";
import { useProductDetail } from "@/lib/api/hooks/use-product-detail";
import { useSummary } from "@/lib/api/hooks/use-summary";
import { useTrend } from "@/lib/api/hooks/use-trend";
import { type Filters } from "@/lib/filters";
import { inr, inrFull, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";

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

function Tile({ label, value, format, accent }: { label: string; value: number; format: (n: number) => string; accent?: boolean }) {
  return (
    <div className={`border-border bg-card shadow-card flex flex-col gap-1 rounded-xl border p-3.5 ${accent ? "ring-primary/30 ring-1" : ""}`}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-heading text-xl leading-tight font-semibold tracking-tight">
        <AnimatedNumber value={value} format={format} />
      </span>
    </div>
  );
}

function MiniBars({ title, items }: { title: string; items: { label: string; netRevenue: number; share: number }[] }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.netRevenue)));
  return (
    <section className="border-border bg-card shadow-card rounded-xl border p-4">
      <h3 className="font-heading mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                <span className="truncate" title={item.label}>{item.label}</span>
                <span className="text-muted-foreground shrink-0 font-mono">
                  {inr(item.netRevenue)} <span className="text-muted-foreground/70">· {item.share.toFixed(0)}%</span>
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(Math.abs(item.netRevenue) / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProductPage({ code }: { code: string }) {
  const { filters } = useFilters();
  const [imgError, setImgError] = useState(false);
  // Apply the product as a filter so the reused summary/trend/breakdown endpoints scope to it.
  const productFilters: Filters = { ...filters, products: [code] };

  const detail = useProductDetail(filters, code);
  const summary = useSummary(productFilters);
  const trend = useTrend(productFilters, "day");
  const byStore = useBreakdown(productFilters, "store", 8);
  const byChannel = useBreakdown(productFilters, "channel", 8);

  const points = (trend.data?.points ?? []).map((p) => ({ label: fmtBucket(p.bucket), netRevenue: p.netRevenue }));
  const showImage = detail.data?.imageUrl && !imgError;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageCrumb title={code} />
      {detail.isError ? (
          <div className="border-border bg-card text-destructive rounded-xl border p-6 text-sm">
            Couldn&apos;t find this product in the selected window.
          </div>
        ) : (
          <>
            {/* Identity + headline tiles */}
            <section className="border-border bg-card shadow-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
              <div className="bg-muted aspect-[3/4] w-full max-w-[16rem] shrink-0 self-center overflow-hidden rounded-lg sm:w-60">
                {showImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.data?.imageUrl ?? ""}
                    alt={code}
                    onError={() => setImgError(true)}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground grid size-full place-items-center font-mono text-xs">
                    {code}
                  </div>
                )}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {summary.isLoading || !summary.data ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : (
                  <>
                    <Tile label="Net revenue" value={summary.data.netRevenue} format={inr} accent />
                    <Tile label="Units sold" value={summary.data.unitsSold} format={num} />
                    <Tile label="Returns" value={summary.data.returnsValue} format={inr} />
                    <Tile label="Invoices" value={summary.data.invoices} format={num} />
                    <Tile label="Variants" value={detail.data?.variantCount ?? 0} format={num} />
                  </>
                )}
              </div>
            </section>

            {/* Trend */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Revenue trend</h3>
              <div className="text-muted-foreground h-60 w-full text-xs">
                {trend.isLoading ? (
                  <Skeleton className="size-full rounded-lg" />
                ) : points.length === 0 ? (
                  <div className="grid h-full place-items-center">No sales in this range</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                      <defs>
                        <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tickFormatter={shortAxis} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={52} />
                      <Tooltip
                        content={({ active, label, payload }) =>
                          active && payload?.length ? (
                            <div className="border-border bg-card rounded-md border px-3 py-2 text-xs shadow-md">
                              <div className="mb-0.5 font-medium">{label}</div>
                              <div className="text-foreground font-medium">{inrFull(Number(payload[0].value))}</div>
                            </div>
                          ) : null
                        }
                      />
                      <Area type="monotone" dataKey="netRevenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#prodGrad)" dot={points.length === 1} animationDuration={800} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Where it sells + variants */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MiniBars title="By store" items={byStore.data?.items ?? []} />
              <MiniBars title="By channel" items={byChannel.data?.items ?? []} />
            </div>

            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Variants</h3>
              {detail.isLoading || !detail.data ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : detail.data.variants.length === 0 ? (
                <p className="text-muted-foreground text-xs">No variant sales in this range</p>
              ) : (
                <ul className="divide-border divide-y text-sm">
                  {detail.data.variants.map((v) => (
                    <li key={v.sku} className="flex items-center justify-between py-1.5">
                      <span className="font-mono text-xs">{v.sku}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">{num(v.units)} sold</span>
                        <span className="font-medium">{inr(v.netRevenue)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
    </div>
  );
}
