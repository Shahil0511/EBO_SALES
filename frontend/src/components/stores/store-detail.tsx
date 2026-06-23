"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageCrumb } from "@/components/layout/page-crumb";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreDetail } from "@/lib/api/hooks/use-store-detail";
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

const pct = (n: number) => `${n.toFixed(1)}%`;
const dec = (n: number) => n.toFixed(2);

export function StoreDetail({ storeCode }: { storeCode: string }) {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useStoreDetail(storeCode, filters);

  const points = (data?.trend ?? []).map((p) => ({ label: fmtBucket(p.bucket), nsv: p.nsv }));
  const maxStaff = Math.max(1, ...(data?.salespeople ?? []).map((s) => s.nsv));

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageCrumb title={data?.storeName ?? storeCode} />

      {isError ? (
        <div className="border-border bg-card text-destructive rounded-xl border p-6 text-sm">
          No data for this store in the selected window.
        </div>
      ) : isLoading || !data ? (
        <>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </>
      ) : (
        <>
          {/* Identity + manager chain */}
          <section className="border-border bg-card shadow-card rounded-xl border p-4">
            <h2 className="font-heading text-base font-semibold">{data.storeName ?? storeCode}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Meta label="Type" value={data.storeType} />
              <Meta label="Region" value={data.region} />
              <Meta label="City" value={data.city} />
              <Meta label="Cluster" value={data.cluster} />
              <Meta label="Store manager" value={data.storeManager} />
              <Meta label="Cluster manager" value={data.clusterManager} />
              <Meta label="Area manager" value={data.areaManager} />
              <Meta label="Regional manager" value={data.regionalManager} />
            </dl>
          </section>

          {/* KPI tiles for the window */}
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
                      <linearGradient id="storeGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="nsv" stroke="var(--chart-1)" strokeWidth={2} fill="url(#storeGrad)" dot={points.length === 1} animationDuration={800} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Salesperson leaderboard */}
          <section className="border-border bg-card shadow-card rounded-xl border p-4">
            <h3 className="font-heading mb-3 text-sm font-semibold">Sales staff</h3>
            {data.salespeople.length === 0 ? (
              <p className="text-muted-foreground text-xs">No staff sales in this range.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.salespeople.map((s) => (
                  <li key={s.code}>
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium">{s.name ?? s.code}</span>
                      <span className="text-muted-foreground shrink-0 font-mono">
                        {inr(s.nsv)} <span className="text-muted-foreground/70">· {num(s.billCnt)} bills · ATV {inr(s.atv)}</span>
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(s.nsv / maxStaff) * 100}%` }} />
                    </div>
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
