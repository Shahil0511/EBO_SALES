import { Suspense } from "react";

import { BreakdownBars } from "@/components/charts/breakdown-bars";
import { TrendChart } from "@/components/charts/trend-chart";
import { FilterRail } from "@/components/filters/filter-rail";
import { KpiCards } from "@/components/kpis/kpi-cards";
import { SiteHeader } from "@/components/layout/site-header";

const PLACEHOLDERS = [
  { title: "Product gallery", milestone: "F9", span: "lg:col-span-12", height: "h-72" },
  { title: "Transactions", milestone: "F10", span: "lg:col-span-12", height: "h-80" },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      {/* One Suspense boundary: the rail + every section read filters from the URL. */}
      <Suspense fallback={<div className="flex-1" />}>
        <div className="flex flex-1">
          <FilterRail />
          <main className="flex-1 space-y-4 p-4 lg:p-6">
            <KpiCards />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <TrendChart className="lg:col-span-8" />
              <BreakdownBars
                className="lg:col-span-4"
                dimension="category"
                title="Category"
                color="var(--chart-2)"
                filterField="categories"
              />
              <BreakdownBars className="lg:col-span-4" dimension="store" title="Store" color="var(--chart-1)" />
              <BreakdownBars
                className="lg:col-span-4"
                dimension="brand"
                title="Brand"
                color="var(--chart-3)"
                filterField="brands"
              />
              <BreakdownBars
                className="lg:col-span-4"
                dimension="channel"
                title="Channel"
                color="var(--chart-4)"
                filterField="channels"
              />
              <BreakdownBars
                className="lg:col-span-6"
                dimension="salesperson"
                title="Sales staff"
                color="var(--chart-5)"
              />
              <BreakdownBars className="lg:col-span-6" dimension="region" title="Region" color="var(--chart-1)" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {PLACEHOLDERS.map((section) => (
                <section
                  key={section.title}
                  className={`border-border bg-card flex flex-col rounded-xl border p-4 ${section.span} ${section.height}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {section.milestone}
                    </span>
                  </div>
                  <div className="border-border text-muted-foreground mt-3 flex flex-1 items-center justify-center rounded-lg border border-dashed text-xs">
                    wired in {section.milestone}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>
      </Suspense>
    </div>
  );
}
