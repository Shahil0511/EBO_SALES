import { BreakdownBars } from "@/components/charts/breakdown-bars";
import { TrendChart } from "@/components/charts/trend-chart";
import { FilterChips } from "@/components/filters/filter-chips";
import { KpiCards } from "@/components/kpis/kpi-cards";
import { Reveal } from "@/components/motion/reveal";
import { ProductGallery } from "@/components/products/product-gallery";
import { TransactionsTable } from "@/components/transactions/transactions-table";

/** Dashboard content. The header + filter rail come from the shared app shell (layout). */
export default function DashboardPage() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <FilterChips />
      <KpiCards />

      <TrendChart />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BreakdownBars dimension="category" title="Category" color="var(--chart-2)" filterField="categories" />
        <BreakdownBars dimension="store" title="Store" color="var(--chart-1)" />
        <BreakdownBars dimension="brand" title="Brand" color="var(--chart-3)" filterField="brands" />
        <BreakdownBars dimension="salesperson" title="Sales staff" color="var(--chart-5)" />
        <BreakdownBars
          dimension="channel"
          title="Channel"
          color="var(--chart-4)"
          filterField="channels"
          defaultView="donut"
        />
        <BreakdownBars dimension="region" title="Region" color="var(--chart-1)" defaultView="donut" />
      </div>

      <ProductGallery />

      <Reveal>
        <TransactionsTable />
      </Reveal>
    </div>
  );
}
