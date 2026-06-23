import { Suspense } from "react";

import { FilterRail } from "@/components/filters/filter-rail";
import { KpiCards } from "@/components/kpis/kpi-cards";
import { SiteHeader } from "@/components/layout/site-header";

// Sections still to be wired (F8–F10). KPIs (F7) are now live.
const PLACEHOLDERS = [
  { title: "Revenue trend", milestone: "F8", span: "lg:col-span-8", height: "h-64" },
  { title: "Category · Brand · Channel", milestone: "F8", span: "lg:col-span-4", height: "h-64" },
  { title: "Product gallery", milestone: "F9", span: "lg:col-span-12", height: "h-72" },
  { title: "Transactions", milestone: "F10", span: "lg:col-span-12", height: "h-80" },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      {/* One Suspense boundary: the rail + every section read filters from the URL (useSearchParams). */}
      <Suspense fallback={<div className="flex-1" />}>
        <div className="flex flex-1">
          <FilterRail />
          <main className="flex-1 space-y-5 p-4 lg:p-6">
            <KpiCards />
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
