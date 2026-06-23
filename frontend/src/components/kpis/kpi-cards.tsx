"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { useSummary } from "@/lib/api/hooks/use-summary";
import { inr, inrFull, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

type CardSpec = {
  key: string;
  label: string;
  value: string;
  title?: string;
  sub?: string;
  delta?: number | null;
  accent?: boolean;
  negative?: boolean;
};

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

  const cards: CardSpec[] | null = data
    ? [
        {
          key: "net",
          label: "Net revenue",
          value: inr(data.netRevenue),
          title: inrFull(data.netRevenue),
          delta: data.netRevenueDelta?.pctChange,
          accent: true,
        },
        { key: "gross", label: "Gross sales", value: inr(data.grossSales), sub: `${num(data.unitsSold)} sold` },
        {
          key: "returns",
          label: "Returns",
          value: inr(data.returnsValue),
          sub: `${num(data.unitsReturned)} units`,
          negative: true,
        },
        { key: "invoices", label: "Invoices", value: num(data.invoices), delta: data.invoicesDelta?.pctChange },
        { key: "units", label: "Units sold", value: num(data.unitsSold) },
        { key: "customers", label: "Customers", value: num(data.customers) },
        { key: "discount", label: "Discount rate", value: `${data.discountRate.toFixed(1)}%` },
      ]
    : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {isLoading || !cards
        ? Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-border bg-card h-24 animate-pulse rounded-xl border" />
          ))
        : cards.map((c) => (
            <div
              key={c.key}
              className={cn(
                "border-border bg-card flex flex-col gap-1 rounded-xl border p-3.5",
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
                {c.value}
              </span>
              <div className="flex min-h-4 items-center gap-2">
                <DeltaBadge pctChange={c.delta} />
                {c.sub && <span className="text-muted-foreground text-[11px]">{c.sub}</span>}
              </div>
            </div>
          ))}
    </div>
  );
}
