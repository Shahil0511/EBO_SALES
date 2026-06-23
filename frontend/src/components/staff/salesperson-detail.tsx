"use client";

import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageCrumb } from "@/components/layout/page-crumb";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalespersonDetail } from "@/lib/api/hooks/use-salesperson-detail";
import { serializeFilters } from "@/lib/filters";
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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

/** Product thumbnail with an image-error fallback. */
function Thumb({ url, code }: { url: string | null | undefined; code: string }) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    // alt="" → decorative: the product code is shown as adjacent text, so don't announce it twice.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" onError={() => setErr(true)} className="size-full object-contain" />;
  }
  return <div className="text-muted-foreground grid size-full place-items-center font-mono text-[10px]">{code}</div>;
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const dec = (n: number) => n.toFixed(2);

export function SalespersonDetail({ code }: { code: string }) {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useSalespersonDetail(code, filters);
  const qs = serializeFilters(filters).toString();

  const points = (data?.trend ?? []).map((p) => ({ label: fmtBucket(p.bucket), nsv: p.nsv }));
  const maxStore = Math.max(1, ...(data?.stores ?? []).map((s) => Math.abs(s.nsv)));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageCrumb title={data?.name ?? code} />

      {isError ? (
        <div className="border-border bg-card text-destructive rounded-xl border p-6 text-sm">
          No data for this salesperson in the selected window.
        </div>
      ) : isLoading || !data ? (
        <>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </>
      ) : (
        <>
          {/* Identity */}
          <section className="border-border bg-card shadow-card rounded-xl border p-4">
            <h2 className="font-heading text-base font-semibold">{data.name ?? code}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Meta label="Code" value={<span className="font-mono">{data.code}</span>} />
              <Meta
                label="Primary store"
                value={
                  data.stores[0] ? (
                    <Link href={`/stores?code=${encodeURIComponent(data.stores[0].storeCode)}${qs ? `&${qs}` : ""}`} className="hover:text-primary hover:underline">
                      {data.primaryStore ?? data.stores[0].storeCode}
                    </Link>
                  ) : (
                    data.primaryStore
                  )
                }
              />
              <Meta label="Stores" value={num(data.storeCount)} />
              <Meta label="Region" value={data.region} />
              <Meta label="Store manager" value={data.storeManager} />
            </dl>
          </section>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            <Tile label="Net sale" value={data.nsv} format={inr} accent />
            <Tile label="Bills" value={data.billCnt} format={num} />
            <Tile label="Units" value={data.qty} format={num} />
            <Tile label="ATV" value={data.atv} format={inr} />
            <Tile label="ASP" value={data.asp} format={inr} />
            <Tile label="Basket" value={data.basket} format={dec} />
            <Tile label="Discount" value={data.discPct} format={pct} />
            <Tile label="Returns" value={data.returns} format={num} />
            <Tile label="Op-days" value={data.opDay} format={num} />
          </div>

          {/* Daily net-sale trend */}
          <section className="border-border bg-card shadow-card rounded-xl border p-4">
            <h3 className="font-heading mb-3 text-sm font-semibold">Daily net sale</h3>
            <div className="text-muted-foreground h-60 w-full text-xs">
              {points.length === 0 ? (
                <div className="grid h-full place-items-center">No sales in this range</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                    <defs>
                      <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="nsv" stroke="var(--chart-1)" strokeWidth={2} fill="url(#repGrad)" dot={points.length === 1} animationDuration={800} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Stores this rep sells at */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Stores</h3>
              {data.stores.length === 0 ? (
                <p className="text-muted-foreground text-xs">No stores in this range.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.stores.map((s) => (
                    <li key={s.storeCode}>
                      <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                        <Link href={`/stores?code=${encodeURIComponent(s.storeCode)}${qs ? `&${qs}` : ""}`} className="hover:text-primary truncate font-medium hover:underline">
                          {s.storeName ?? s.storeCode}
                        </Link>
                        <span className="text-muted-foreground shrink-0 font-mono">
                          {inr(s.nsv)} <span className="text-muted-foreground/70">· {num(s.billCnt)} bills</span>
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${(Math.abs(s.nsv) / maxStore) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top products */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Top products</h3>
              {data.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-xs">No products in this range.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.topProducts.map((p) => (
                    <li key={p.productCode}>
                      <Link href={`/products?code=${encodeURIComponent(p.productCode)}${qs ? `&${qs}` : ""}`} className="group block">
                        <div className="bg-muted aspect-[3/4] w-full overflow-hidden rounded-lg">
                          <Thumb url={p.imageUrl} code={p.productCode} />
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] group-hover:text-primary">{p.productCode}</div>
                        <div className="text-muted-foreground text-[11px]">{inr(p.nsv)} · {num(p.qty)} u</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
