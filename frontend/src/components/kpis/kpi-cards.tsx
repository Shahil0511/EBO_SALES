"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";

import { type MetricKey } from "@/lib/api/hooks/use-metric-detail";
import { HoverLift } from "@/components/motion/hover-lift";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useSummary } from "@/lib/api/hooks/use-summary";
import { serializeFilters } from "@/lib/filters";
import { inr, inrFull, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7";

type CardSpec = {
  key: string;
  metric: MetricKey;
  label: string;
  raw: number;
  format: (n: number) => string;
  title?: string;
  sub?: string;
  delta?: number | null;
  accent?: boolean;
  negative?: boolean;
};

const pct = (n: number) => `${n.toFixed(1)}%`;

function DeltaBadge({ pctChange }: { pctChange: number | null | undefined }) {
  if (pctChange === null || pctChange === undefined) return null;
  const up = pctChange >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(pctChange).toFixed(1)} percent vs previous period`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        up ? "bg-chart-3/15 text-chart-3" : "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {Math.abs(pctChange).toFixed(1)}%
    </span>
  );
}

export function KpiCards() {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useSummary(filters);

  if (isError) {
    return (
      <div className="border-border bg-card text-destructive rounded-xl border p-4 text-sm">
        Failed to load KPIs.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className={GRID}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards: CardSpec[] = [
    {
      key: "net",
      metric: "net_revenue",
      label: "Net revenue",
      raw: data.netRevenue,
      format: inr,
      title: inrFull(data.netRevenue),
      delta: data.netRevenueDelta?.pctChange,
      accent: true,
    },
    {
      key: "gross",
      metric: "gross_sales",
      label: "Gross sales",
      raw: data.grossSales,
      format: inr,
      sub: `${num(data.unitsSold)} sold`,
    },
    {
      key: "returns",
      metric: "returns_value",
      label: "Returns",
      raw: data.returnsValue,
      format: inr,
      sub: `${num(data.unitsReturned)} units`,
      negative: true,
    },
    {
      key: "invoices",
      metric: "invoices",
      label: "Invoices",
      raw: data.invoices,
      format: num,
      delta: data.invoicesDelta?.pctChange,
    },
    { key: "units", metric: "units_sold", label: "Units sold", raw: data.unitsSold, format: num },
    { key: "customers", metric: "customers", label: "Customers", raw: data.customers, format: num },
    { key: "discount", metric: "discount_rate", label: "Discount rate", raw: data.discountRate, format: pct },
  ];

  const qs = serializeFilters(filters).toString();

  return (
    <RevealGroup className={GRID}>
      {cards.map((c) => (
        <RevealItem key={c.key}>
          <Link
            href={`/metrics?m=${c.metric}&${qs}`}
            aria-label={`View ${c.label} details`}
            className="block h-full"
          >
            <HoverLift
              className={cn(
                "border-border bg-card flex h-full flex-col gap-1 rounded-xl border p-3.5",
                c.accent && "ring-primary/30 ring-1",
              )}
            >
              <span className="text-muted-foreground text-xs">{c.label}</span>
            <span
              title={c.title}
              className={cn(
                "font-heading text-xl leading-tight font-semibold tracking-tight",
                c.negative && "text-destructive",
              )}
            >
              <AnimatedNumber value={c.raw} format={c.format} />
            </span>
            <div className="flex min-h-4 items-center gap-2">
              <DeltaBadge pctChange={c.delta} />
              {c.sub && <span className="text-muted-foreground text-[11px]">{c.sub}</span>}
            </div>
            </HoverLift>
          </Link>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
