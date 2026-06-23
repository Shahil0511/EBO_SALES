"use client";

import Link from "next/link";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useStoreLeaderboard } from "@/lib/api/hooks/use-store-leaderboard";
import { serializeFilters } from "@/lib/filters";
import { inr, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

type Row = {
  storeCode: string;
  storeName: string | null;
  storeType: string | null;
  region: string | null;
  city: string | null;
  mtdSale: number;
  projectionSale: number;
  monthTarget: number | null;
  achievementPct: number | null;
  billCnt: number;
  qty: number;
  atv: number;
  asp: number;
  basket: number;
  discPct: number;
  opDay: number;
  wowBill: number;
};

type SortKey =
  | "storeName"
  | "mtdSale"
  | "projectionSale"
  | "monthTarget"
  | "achievementPct"
  | "billCnt"
  | "qty"
  | "atv"
  | "asp"
  | "basket"
  | "discPct"
  | "opDay"
  | "wowBill";

type Col = { key: SortKey; label: string; align?: "right"; render: (r: Row) => React.ReactNode };

const COLS: Col[] = [
  { key: "mtdSale", label: "MTD sale", align: "right", render: (r) => <span className="font-semibold">{inr(r.mtdSale)}</span> },
  { key: "projectionSale", label: "Projection", align: "right", render: (r) => inr(r.projectionSale) },
  { key: "monthTarget", label: "Target", align: "right", render: (r) => (r.monthTarget != null ? inr(r.monthTarget) : "—") },
  { key: "achievementPct", label: "Pace%", align: "right", render: (r) => <AchCell v={r.achievementPct} /> },
  { key: "billCnt", label: "Bills", align: "right", render: (r) => num(r.billCnt) },
  { key: "qty", label: "Qty", align: "right", render: (r) => num(r.qty) },
  { key: "atv", label: "ATV", align: "right", render: (r) => inr(r.atv) },
  { key: "asp", label: "ASP", align: "right", render: (r) => inr(r.asp) },
  { key: "basket", label: "Basket", align: "right", render: (r) => r.basket.toFixed(2) },
  {
    key: "discPct",
    label: "Disc%",
    align: "right",
    render: (r) => <span className={cn(r.discPct >= 50 && "text-destructive")}>{r.discPct.toFixed(1)}%</span>,
  },
  { key: "opDay", label: "Days", align: "right", render: (r) => num(r.opDay) },
  {
    key: "wowBill",
    label: "WoW bills",
    align: "right",
    render: (r) =>
      r.wowBill === 0 ? (
        <span className="text-muted-foreground">0</span>
      ) : (
        <span className={cn("font-medium", r.wowBill > 0 ? "text-chart-3" : "text-destructive")}>
          {r.wowBill > 0 ? "▲" : "▼"} {Math.abs(r.wowBill)}
        </span>
      ),
  },
];

function SortArrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return <span>{dir === "asc" ? "▴" : "▾"}</span>;
}

/** Pace-to-date achievement (MTD ÷ target-to-date): green on/ahead of pace, red well behind.
 * Tone is keyed off the *rounded* value so it never contradicts the number shown. */
function AchCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const r = Math.round(v);
  const tone = r >= 100 ? "text-chart-3" : r < 80 ? "text-destructive" : "";
  return (
    <span className={cn("font-medium", tone)} title="MTD sale ÷ target-to-date">
      {r}%
    </span>
  );
}

export function StoreLeaderboard() {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useStoreLeaderboard();
  const [sortKey, setSortKey] = useState<SortKey>("mtdSale");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const qs = serializeFilters(filters).toString();

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load store performance.</p>;
  }

  const items = (data?.items ?? []) as Row[];
  const sorted = [...items].sort((a, b) => {
    if (sortKey === "storeName") {
      const cmp = (a.storeName ?? "").localeCompare(b.storeName ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    }
    // Numeric: missing values (no target) always sink to the bottom, in both directions.
    const av = a[sortKey] as number | null;
    const bv = b[sortKey] as number | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "storeName" ? "asc" : "desc");
    }
  };

  return (
    <section className="border-border bg-card shadow-card overflow-x-auto rounded-xl border">
      {data?.asOf && (
        <p className="text-muted-foreground border-border border-b px-3 py-2 text-[11px]">
          Current month · data through {fmtDate(data.asOf)} · {items.length} stores
        </p>
      )}
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-border bg-muted/30 border-b text-left">
              <th scope="col" className="px-3 py-2.5 font-medium">
                #
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "storeName" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                className="px-3 py-2.5 font-medium"
              >
                <button type="button" onClick={() => onSort("storeName")} className="hover:text-foreground inline-flex items-center gap-0.5">
                  Store <SortArrow active={sortKey === "storeName"} dir={sortDir} />
                </button>
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  className="px-3 py-2.5 text-right font-medium whitespace-nowrap"
                >
                  <button type="button" onClick={() => onSort(c.key)} className="hover:text-foreground inline-flex items-center gap-0.5">
                    {c.label} <SortArrow active={sortKey === c.key} dir={sortDir} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.storeCode} className="border-border/60 hover:bg-muted/40 border-b transition-colors">
                <td className="text-muted-foreground px-3 py-2 font-mono">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/stores?code=${encodeURIComponent(r.storeCode)}${qs ? `&${qs}` : ""}`}
                    className="hover:text-primary font-medium whitespace-nowrap hover:underline"
                  >
                    {r.storeName ?? r.storeCode}
                  </Link>
                  <div className="text-muted-foreground text-[11px]">
                    {[r.region, r.city, r.storeType].filter(Boolean).join(" · ")}
                  </div>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
