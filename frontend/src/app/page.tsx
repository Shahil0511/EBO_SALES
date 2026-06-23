import { Suspense } from "react";

import { BreakdownBars } from "@/components/charts/breakdown-bars";
import { TrendChart } from "@/components/charts/trend-chart";
import { FilterChips } from "@/components/filters/filter-chips";
import { FilterRail } from "@/components/filters/filter-rail";
import { MobileFilters } from "@/components/filters/mobile-filters";
import { KpiCards } from "@/components/kpis/kpi-cards";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductGallery } from "@/components/products/product-gallery";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      {/* One Suspense boundary: the rail + every section read filters from the URL. */}
      <Suspense fallback={<div className="flex-1" />}>
        <div className="flex flex-1">
          <FilterRail />
          <MobileFilters />
          <main className="flex-1 space-y-4 p-4 lg:p-6">
            <FilterChips />
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

            <ProductGallery />

            <TransactionsTable />
          </main>
        </div>
      </Suspense>
    </div>
  );
}
